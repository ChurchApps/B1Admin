import { useState, useEffect, useCallback, useRef } from "react";
import { ApiHelper } from "../../helpers";
import type { PageInterface, BlockInterface, SectionInterface, ElementInterface } from "../../helpers/Interfaces";

interface HistoryEntry {
  id?: string;
  snapshot: ContainerSnapshot;
  description: string;
  timestamp: number;
}

interface ContainerSnapshot {
  sections: SectionInterface[];
}

interface UseUndoRedoOptions {
  pageId?: string;
  blockId?: string;
  maxLocalHistory?: number;
}

export interface HistoryEntryInfo {
  id?: string;
  description: string;
  timestamp: number;
}

interface UseUndoRedoReturn {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => Promise<ContainerSnapshot | null>;
  redo: () => Promise<ContainerSnapshot | null>;
  saveSnapshot: (container: PageInterface | BlockInterface, description: string) => void;
  clearHistory: () => void;
  isRestoring: boolean;
  history: HistoryEntryInfo[];
  currentHistoryIndex: number;
  restoreToIndex: (index: number) => Promise<ContainerSnapshot | null>;
}

export function useUndoRedo(options: UseUndoRedoOptions): UseUndoRedoReturn {
  const { pageId, blockId, maxLocalHistory = 50 } = options;

  const [undoStack, setUndoStack] = useState<HistoryEntry[]>([]);
  const [redoStack, setRedoStack] = useState<HistoryEntry[]>([]);
  const [isRestoring, setIsRestoring] = useState(false);
  const lastSaveRef = useRef<number>(0);

  // Use refs to track current stack values for use in callbacks
  const undoStackRef = useRef<HistoryEntry[]>([]);
  const redoStackRef = useRef<HistoryEntry[]>([]);
  const isRestoringRef = useRef(false);
  const pageIdRef = useRef(pageId);
  const blockIdRef = useRef(blockId);

  // Keep refs in sync
  useEffect(() => {
    undoStackRef.current = undoStack;
  }, [undoStack]);

  useEffect(() => {
    redoStackRef.current = redoStack;
  }, [redoStack]);

  useEffect(() => {
    pageIdRef.current = pageId;
    blockIdRef.current = blockId;
  }, [pageId, blockId]);

  // Load existing history from server on mount
  useEffect(() => {
    const loadHistory = async () => {
      if (!pageId && !blockId) return;

      try {
        const endpoint = pageId
          ? `/pageHistory/page/${pageId}`
          : `/pageHistory/block/${blockId}`;
        const serverHistory = await ApiHelper.get(endpoint, "ContentApi");

        if (serverHistory && serverHistory.length > 0) {
          // Convert server history to local format (newest first from server, we need oldest first for undo stack)
          const entries: HistoryEntry[] = serverHistory
            .reverse() // Server returns newest first, we want oldest first
            .map((h: any) => ({
              id: h.id,
              snapshot: JSON.parse(h.snapshotJSON),
              description: h.description,
              timestamp: new Date(h.createdDate).getTime()
            }));
          setUndoStack(entries);
        }
      } catch (err) {
        console.error("Failed to load history from server:", err);
      }
    };

    loadHistory();
  }, [pageId, blockId]);

  // Server-side restore function using history ID
  const restoreByHistoryId = async (historyId: string): Promise<ContainerSnapshot | null> => {
    try {
      const result = await ApiHelper.post(`/pageHistory/restore/${historyId}`, {}, "ContentApi");
      if (result.success && result.snapshot) {
        return result.snapshot;
      }
      return null;
    } catch (err) {
      console.error("Failed to restore on server:", err);
      return null;
    }
  };

  // Server-side restore function using snapshot directly (fallback when no ID)
  const restoreBySnapshot = async (snapshot: ContainerSnapshot): Promise<boolean> => {
    try {
      const result = await ApiHelper.post("/pageHistory/restoreSnapshot", {
        pageId: pageIdRef.current,
        blockId: blockIdRef.current,
        snapshot
      }, "ContentApi");
      return result.success === true;
    } catch (err) {
      console.error("Failed to restore snapshot on server:", err);
      return false;
    }
  };

  const performUndoInternal = async (): Promise<ContainerSnapshot | null> => {
    const currentUndoStack = undoStackRef.current;
    if (currentUndoStack.length < 2) return null;

    const currentState = currentUndoStack[currentUndoStack.length - 1];
    const previousState = currentUndoStack[currentUndoStack.length - 2];

    // Set restoring flag to prevent saveSnapshot from clearing redo stack
    isRestoringRef.current = true;
    setIsRestoring(true);

    // Call server to restore
    let restoreSuccess = false;
    if (previousState.id) {
      const serverSnapshot = await restoreByHistoryId(previousState.id);
      restoreSuccess = serverSnapshot !== null;
    } else {
      // Fallback: restore using snapshot directly
      restoreSuccess = await restoreBySnapshot(previousState.snapshot);
    }

    if (!restoreSuccess) {
      // Server restore failed, abort
      isRestoringRef.current = false;
      setIsRestoring(false);
      return null;
    }

    // Move current state to redo stack
    setRedoStack(prev => [...prev, currentState]);

    // Remove current state from undo stack
    setUndoStack(prev => prev.slice(0, -1));

    // Clear restoring flag after state updates
    setTimeout(() => {
      isRestoringRef.current = false;
      setIsRestoring(false);
    }, 100);

    return previousState.snapshot;
  };

  const performRedoInternal = async (): Promise<ContainerSnapshot | null> => {
    const currentRedoStack = redoStackRef.current;
    if (currentRedoStack.length === 0) return null;

    const nextState = currentRedoStack[currentRedoStack.length - 1];

    // Set restoring flag to prevent saveSnapshot from clearing redo stack
    isRestoringRef.current = true;
    setIsRestoring(true);

    // Call server to restore
    let restoreSuccess = false;
    if (nextState.id) {
      const serverSnapshot = await restoreByHistoryId(nextState.id);
      restoreSuccess = serverSnapshot !== null;
    } else {
      // Fallback: restore using snapshot directly
      restoreSuccess = await restoreBySnapshot(nextState.snapshot);
    }

    if (!restoreSuccess) {
      // Server restore failed, abort
      isRestoringRef.current = false;
      setIsRestoring(false);
      return null;
    }

    // Move to undo stack
    setUndoStack(prev => [...prev, nextState]);

    // Remove from redo stack
    setRedoStack(prev => prev.slice(0, -1));

    // Clear restoring flag after state updates
    setTimeout(() => {
      isRestoringRef.current = false;
      setIsRestoring(false);
    }, 100);

    return nextState.snapshot;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ctrl+Z or Cmd+Z for undo
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const snapshot = await performUndoInternal();
        if (snapshot) {
          window.dispatchEvent(new CustomEvent("undoredo:restore", { detail: snapshot }));
        }
      }
      // Ctrl+Shift+Z or Cmd+Shift+Z for redo (also Ctrl+Y)
      if (((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) ||
          ((e.ctrlKey || e.metaKey) && e.key === "y")) {
        e.preventDefault();
        const snapshot = await performRedoInternal();
        if (snapshot) {
          window.dispatchEvent(new CustomEvent("undoredo:restore", { detail: snapshot }));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const createSnapshot = (container: PageInterface | BlockInterface): ContainerSnapshot => {
    // Deep clone sections with their elements
    const cloneSections = (sections: SectionInterface[]): SectionInterface[] => {
      if (!sections) return [];
      return sections.map(section => ({
        ...section,
        elements: cloneElements(section.elements || [])
      }));
    };

    const cloneElements = (elements: ElementInterface[]): ElementInterface[] => {
      if (!elements) return [];
      return elements.map(element => ({
        ...element,
        elements: cloneElements(element.elements || [])
      }));
    };

    return {
      sections: cloneSections(container?.sections || [])
    };
  };

  const saveSnapshot = useCallback((container: PageInterface | BlockInterface, description: string) => {
    // Don't save snapshot during restore operations
    if (isRestoringRef.current) return;

    const now = Date.now();

    // Debounce: don't save if last save was less than 500ms ago
    if (now - lastSaveRef.current < 500) return;
    lastSaveRef.current = now;

    const snapshot = createSnapshot(container);
    const entry: HistoryEntry = {
      snapshot,
      description,
      timestamp: now
    };

    // Save to API and get the ID
    if (pageIdRef.current || blockIdRef.current) {
      ApiHelper.post("/pageHistory", {
        pageId: pageIdRef.current,
        blockId: blockIdRef.current,
        snapshotJSON: JSON.stringify(snapshot),
        description
      }, "ContentApi").then((result) => {
        // Update entry with the server ID
        setUndoStack(prev => {
          // Find and update the entry we just added
          const newStack = prev.map(e =>
            e.timestamp === entry.timestamp && e.description === entry.description
              ? { ...e, id: result.id }
              : e
          );
          return newStack;
        });
      }).catch(err => {
        console.error("Failed to save history to API:", err);
      });
    }

    setUndoStack(prev => {
      const newStack = [...prev, entry];
      // Trim to max size
      if (newStack.length > maxLocalHistory) {
        return newStack.slice(-maxLocalHistory);
      }
      return newStack;
    });

    // Clear redo stack when new action is performed (but not during restore)
    setRedoStack([]);
  }, [maxLocalHistory]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  // Get full history (undo stack + redo stack in reverse)
  const getFullHistory = (): HistoryEntryInfo[] => {
    const undoHistory = undoStack.map(entry => ({
      id: entry.id,
      description: entry.description,
      timestamp: entry.timestamp
    }));
    const redoHistory = [...redoStack].reverse().map(entry => ({
      id: entry.id,
      description: entry.description,
      timestamp: entry.timestamp
    }));
    return [...undoHistory, ...redoHistory];
  };

  // Current position in history (0-indexed, last item in undoStack)
  const getCurrentIndex = () => undoStack.length - 1;

  // Restore to a specific index in the full history
  const restoreToIndex = async (targetIndex: number): Promise<ContainerSnapshot | null> => {
    const fullHistory = [...undoStackRef.current, ...redoStackRef.current.slice().reverse()];
    if (targetIndex < 0 || targetIndex >= fullHistory.length) return null;

    const currentIndex = undoStackRef.current.length - 1;
    if (targetIndex === currentIndex) return null; // Already at this state

    isRestoringRef.current = true;
    setIsRestoring(true);

    const targetEntry = fullHistory[targetIndex];

    // Call server to restore
    let restoreSuccess = false;
    if (targetEntry.id) {
      const serverSnapshot = await restoreByHistoryId(targetEntry.id);
      restoreSuccess = serverSnapshot !== null;
    } else {
      // Fallback: restore using snapshot directly
      restoreSuccess = await restoreBySnapshot(targetEntry.snapshot);
    }

    if (!restoreSuccess) {
      // Server restore failed, abort
      isRestoringRef.current = false;
      setIsRestoring(false);
      return null;
    }

    // Split history at target index
    const newUndoStack = fullHistory.slice(0, targetIndex + 1);
    const newRedoStack = fullHistory.slice(targetIndex + 1).reverse();

    setUndoStack(newUndoStack);
    setRedoStack(newRedoStack);

    setTimeout(() => {
      isRestoringRef.current = false;
      setIsRestoring(false);
    }, 100);

    return targetEntry.snapshot;
  };

  return {
    canUndo: undoStack.length > 1, // Need at least 2 states to undo
    canRedo: redoStack.length > 0,
    undo: performUndoInternal,
    redo: performRedoInternal,
    saveSnapshot,
    clearHistory,
    isRestoring,
    history: getFullHistory(),
    currentHistoryIndex: getCurrentIndex(),
    restoreToIndex
  };
}
