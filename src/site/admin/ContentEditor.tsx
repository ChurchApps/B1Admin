import { useEffect, useState, useContext, useRef, useCallback, useMemo, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline, useMediaQuery, Container, Skeleton, Box, Button, Icon, Typography } from "@mui/material";
import type { BlockInterface, ElementInterface, PageInterface, SectionInterface, GlobalStyleInterface } from "../../helpers/Interfaces";
import { ApiHelper, ArrayHelper, UserHelper } from "../../helpers";
import { Permissions } from "@churchapps/helpers";
import { Section } from "./Section";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import React from "react";
import { Theme, DroppableArea } from "@churchapps/apphelper/website";
import { SectionBlock } from "./SectionBlock";
import { StyleHelper } from "@churchapps/apphelper/website";
import { ElementAdd } from "./elements/ElementAdd";
import { ElementEdit } from "./elements/ElementEdit";
import { SectionEdit } from "./SectionEdit";
import { DroppableScroll } from "./DroppableScroll";
import UserContext from "../../UserContext";
import { EditorToolbar } from "./EditorToolbar";
import { HelpDialog } from "./HelpDialog";
import { ZoneBox } from "./ZoneBox";
import { EmptyState } from "./EmptyState";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PropertyPanel } from "./PropertyPanel";
import { AddContentPanel } from "./AddContentPanel";
import { getElementTypeMeta } from "./elements/elementTypeMeta";
import { Locale } from "@churchapps/apphelper";
import { useUndoRedo } from "../hooks/useUndoRedo";
import { HistoryPanel } from "./HistoryPanel";
import { useThemeMode } from "../../ThemeContext";
import { SectionTemplatePicker } from "./templates/SectionTemplatePicker";
import { buildTemplateSection, remapSectionContent, type SectionTemplateDef } from "./templates/sectionTemplates";
import { trackSave, resetSaveStatus, subscribeSaveStatus, getSaveStatus, getLastSavedAt } from "./saveStatusTracker";
import { EDITOR_HOVER_CSS, getSelectionSuppressCss } from "./editorCss";
import { AddSectionDivider } from "./AddSectionDivider";
import { SelectionBreadcrumb, type BreadcrumbCrumb } from "./SelectionBreadcrumb";
import { AiRewriteDialog } from "../components/AiRewriteDialog";
import { WEBSITE_ELEMENT_TYPES } from "./websiteContent";
import { A11yPanel } from "./A11yPanel";
import { checkPageAccessibility } from "./a11yChecker";

const lightEditorTheme = createTheme({
  palette: { mode: "light", background: { default: "#e5e8ee", paper: "#ffffff" } },
  components: {
    MuiTextField: { defaultProps: { margin: "normal" } },
    MuiFormControl: { defaultProps: { margin: "normal" } },
    MuiInputLabel: { defaultProps: { shrink: true } },
    MuiOutlinedInput: { defaultProps: { notched: true } }
  }
});

interface ConfigInterface {
  globalStyles?: GlobalStyleInterface;
  appearance?: any;
  church?: any;
}

interface Props {
  loadData: (id: string) => Promise<any>;
  pageId?: string;
  blockId?: string;
  onDone?: (url?: string) => void;
  config?: ConfigInterface;
}

type PanelAction =
  | { kind: "close" }
  | { kind: "escape" }
  | { kind: "element"; element: ElementInterface }
  | { kind: "section"; section: SectionInterface }
  | { kind: "blockNav"; blockId: string };

export function ContentEditor(props: Props) {
  const navigate = useNavigate();
  const context = useContext(UserContext);
  const [container, setContainer] = useState<PageInterface | BlockInterface | null>(null);
  const [editSection, setEditSection] = useState<SectionInterface | null>(null);
  const [editElement, setEditElement] = useState<ElementInterface | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [deviceType, setDeviceType] = useState("desktop");
  const isMobileViewport = useMediaQuery("(max-width:900px)");
  const contentRef = React.useRef<HTMLDivElement>(null);
  const initialSnapshotSavedRef = React.useRef(false);
  const [showScrollHelpers, setShowScrollHelpers] = useState(false);

  const { canUndo, canRedo, undo, redo, saveSnapshot, history, currentHistoryIndex, restoreToIndex } = useUndoRedo({
    pageId: props.pageId,
    blockId: props.blockId
  });
  const [showHistory, setShowHistory] = useState(false);
  const [showA11y, setShowA11y] = useState(false);
  const saveStatus = useSyncExternalStore(subscribeSaveStatus, getSaveStatus);
  const lastSavedAt = useSyncExternalStore(subscribeSaveStatus, getLastSavedAt);

  useEffect(() => {
    resetSaveStatus();
  }, [props.pageId, props.blockId]);

  const handleUndo = async () => {
    const snapshot = await undo();
    if (snapshot) {
      setHasUnpublishedChanges(true);
      window.dispatchEvent(new CustomEvent("undoredo:restore", { detail: snapshot }));
    }
  };

  const handleRedo = async () => {
    const snapshot = await redo();
    if (snapshot) {
      setHasUnpublishedChanges(true);
      window.dispatchEvent(new CustomEvent("undoredo:restore", { detail: snapshot }));
    }
  };

  const handleHistoryRestore = async (index: number) => {
    const snapshot = await restoreToIndex(index);
    if (snapshot) {
      window.dispatchEvent(new CustomEvent("undoredo:restore", { detail: snapshot }));
    }
  };

  // Force light mode while editor is mounted so preview matches the public website
  useThemeMode();
  useEffect(() => {
    const wasInDarkMode = document.body.classList.contains("dark-theme");
    if (wasInDarkMode) {
      document.body.classList.remove("dark-theme");
    }
    return () => {
      if (wasInDarkMode) {
        document.body.classList.add("dark-theme");
      }
    };
  }, []);

  const [showAdd, setShowAdd] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pendingDeleteElementId, setPendingDeleteElementId] = useState<string | null>(null);
  const panelDirtyRef = useRef(false);
  const [pendingPanelAction, setPendingPanelAction] = useState<PanelAction | null>(null);
  const [pendingDeleteSection, setPendingDeleteSection] = useState<SectionInterface | null>(null);
  const [pendingDiscardChanges, setPendingDiscardChanges] = useState(false);
  const [pendingUnpublish, setPendingUnpublish] = useState(false);

  // Render hidden items dimmed instead of display:none so they stay selectable.
  const getEditorVisibilityCss = (sections: SectionInterface[], device: string) => {
    const selectors: string[] = [`.elementWrapper.${device === "mobile" ? "hiddenOnMobile" : "hiddenOnDesktop"}`];
    const collectElement = (e: ElementInterface) => {
      if (e.styles?.[device === "mobile" ? "mobile" : "desktop"]?.display === "none" && e.id) {
        selectors.push(`#el-${e.id}`, `[data-element-id="${e.id}"]`);
      }
      e.elements?.forEach(collectElement);
    };
    sections?.forEach((s) => {
      if (s.styles?.[device === "mobile" ? "mobile" : "desktop"]?.display === "none") {
        selectors.push(`#section-${s.answers?.sectionId || s.id}`);
      }
      s.elements?.forEach(collectElement);
    });
    return `${selectors.join(", ")} { display: block !important; opacity: 0.45; outline: 2px dashed #9e9e9e; outline-offset: -2px; }`;
  };

  const css = useMemo(
    () => StyleHelper.getCss(container?.sections || [], deviceType) + "\n" + getEditorVisibilityCss(container?.sections || [], deviceType),
    [container?.sections, deviceType]
  );

  const hoverCss = useMemo(() => EDITOR_HOVER_CSS + getSelectionSuppressCss(selectedElementId), [selectedElementId]);

  const a11yIssueCount = useMemo(() => checkPageAccessibility(container?.sections).length, [container?.sections]);

  const handleA11yHighlight = (sectionId: string) => {
    const el = document.querySelector(`[data-section-id="${sectionId}"]`) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.style.transition = "outline-color 0.3s ease";
    el.style.outline = "3px solid var(--c1)";
    el.style.outlineOffset = "-3px";
    window.setTimeout(() => { el.style.outline = "3px solid transparent"; }, 1600);
    window.setTimeout(() => { el.style.outline = ""; el.style.outlineOffset = ""; }, 2000);
  };

  let elementOnlyMode = false;
  if (props.blockId && container?.sections?.length === 1 && container?.sections[0]?.id === "") elementOnlyMode = true;

  const zones: any = {
    cleanCentered: ["main"],
    embed: ["main"],
    headerFooter: ["main"]
  };

  const churchSettings = props.config?.appearance || (context?.userChurch as any)?.settings || {};

  useEffect(() => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) navigate("/site");
  }, []);

  const normalizeElements = (elements: ElementInterface[]): ElementInterface[] => {
    if (!elements) return elements;
    return elements.map((element) => {
      if (!element.elements) element.elements = [];
      if (element.elements && element.elements.length > 0) element.elements = normalizeElements(element.elements);
      return element;
    });
  };

  const [hasUnpublishedChanges, setHasUnpublishedChanges] = useState(false);

  const loadDataInternal = (snapshotDescription?: string) => {
    if (snapshotDescription) setHasUnpublishedChanges(true);
    if (UserHelper.checkAccess(Permissions.contentApi.content.edit)) {
      props.loadData(props.pageId || props.blockId || "").then((p: PageInterface | BlockInterface) => {
        if (p?.sections) {
          p.sections.forEach((section) => {
            if (section.elements) section.elements = normalizeElements(section.elements);
          });
        }
        setContainer(p);
        if (snapshotDescription && p) {
          setTimeout(() => {
            saveSnapshot(p, snapshotDescription);
          }, 100);
        }
      });
    }
  };

  useEffect(loadDataInternal, [props.pageId, props.blockId]);

  useEffect(() => {
    if (container && !initialSnapshotSavedRef.current) {
      saveSnapshot(container, "Initial state");
      initialSnapshotSavedRef.current = true;
    }
  }, [container, saveSnapshot]);

  useEffect(() => {
    const handleRestore = (e: CustomEvent) => {
      const snapshot = e.detail;
      if (snapshot && snapshot.sections) {
        const restored = { ...container, sections: snapshot.sections };
        setContainer(restored);
      }
    };

    window.addEventListener("undoredo:restore", handleRestore as unknown as EventListener);
    return () => window.removeEventListener("undoredo:restore", handleRestore as unknown as EventListener);
  }, [container]);


  const [templateDrop, setTemplateDrop] = useState<{ sort: number; zone: string } | null>(null);
  const [switchSection, setSwitchSection] = useState<SectionInterface | null>(null);
  const [rewriteSection, setRewriteSection] = useState<SectionInterface | null>(null);
  const [rewriteBusy, setRewriteBusy] = useState(false);
  const [rewriteError, setRewriteError] = useState("");

  const handleDrop = (data: any, sort: number, zone: string) => {
    if (container) saveSnapshot(container, "Before adding section");
    if (data.data) {
      const section: SectionInterface = data.data;
      section.sort = sort;
      section.zone = zone;
      section.pageId = (zone === "siteFooter" ? null : props.pageId) as string | undefined;
      trackSave(ApiHelper.post("/sections", [section], "ContentApi")).then(() => {
        loadDataInternal("After adding section");
      });
    } else if (data.blockId) {
      const sec = {
        sort,
        background: "#FFF",
        textColor: "dark",
        pageId: props.pageId,
        blockId: props.blockId,
        targetBlockId: data.blockId,
        zone: zone
      };
      if (sec.zone === "siteFooter") (sec as any).pageId = null;
      requestPanelChange({ kind: "section", section: sec });
    } else {
      setTemplateDrop({ sort, zone });
    }
  };

  const handleTemplateBlank = () => {
    if (!templateDrop) return;
    const sec: SectionInterface = {
      sort: templateDrop.sort,
      background: "#FFF",
      textColor: "dark",
      pageId: (templateDrop.zone === "siteFooter" ? null : props.pageId) as string | undefined,
      blockId: props.blockId,
      zone: templateDrop.zone
    };
    setTemplateDrop(null);
    requestPanelChange({ kind: "section", section: sec });
  };

  const handleTemplateSelect = (template: SectionTemplateDef) => {
    if (!templateDrop) return;
    const section = buildTemplateSection(template, {
      pageId: templateDrop.zone === "siteFooter" ? undefined : props.pageId,
      blockId: props.blockId,
      zone: templateDrop.zone,
      sort: templateDrop.sort
    });
    setTemplateDrop(null);
    trackSave(ApiHelper.post("/sections/tree", { section }, "ContentApi")).then(() => {
      loadDataInternal("After adding section");
    });
  };

  // Non-atomic create-then-delete swap is undo-recoverable via pre-change snapshot.
  const handleSwitchLayout = (template: SectionTemplateDef) => {
    const source = switchSection;
    if (!source) return;
    if (container) saveSnapshot(container, "Before switching layout");
    const section = remapSectionContent(source, template, {
      pageId: source.zone === "siteFooter" ? undefined : props.pageId,
      blockId: props.blockId,
      zone: source.zone,
      sort: (source.sort ?? 0) - 0.05
    });
    setSwitchSection(null);
    trackSave(
      ApiHelper.post("/sections/tree", { section }, "ContentApi")
        .then(() => ApiHelper.delete(`/sections/${source.id}`, "ContentApi"))
    ).then(() => {
      loadDataInternal("After switching layout");
    });
  };

  // Non-atomic create-then-delete swap (same as layout switcher), undo-recoverable.
  const openAiRewrite = (section: SectionInterface) => {
    setRewriteError("");
    setRewriteSection(section);
  };

  const handleAiRewrite = async (instruction: string) => {
    const source = rewriteSection;
    if (!source) return;
    setRewriteBusy(true);
    setRewriteError("");
    try {
      const result: any = await ApiHelper.post("/website/rewriteSection", {
        section: source,
        instruction,
        churchName: context?.userChurch?.church?.name,
        availableElementTypes: WEBSITE_ELEMENT_TYPES
      }, "AskApi");
      if (!result || result.fallback || !result.section) {
        setRewriteError(result?.error || Locale.label("site.aiRewrite.failed"));
        setRewriteBusy(false);
        return;
      }
      if (container) saveSnapshot(container, "Before AI rewrite");
      const rewritten = result.section;
      const syncAnswers = (el: ElementInterface) => {
        if ((el as any).answers) el.answersJSON = JSON.stringify((el as any).answers);
        el.elements?.forEach(syncAnswers);
      };
      rewritten.elements?.forEach(syncAnswers);
      const section: SectionInterface = {
        ...rewritten,
        id: undefined,
        pageId: source.zone === "siteFooter" ? null : props.pageId,
        blockId: props.blockId,
        zone: source.zone,
        sort: (source.sort ?? 0) - 0.05
      };
      setRewriteSection(null);
      setRewriteBusy(false);
      trackSave(
        ApiHelper.post("/sections/tree", { section }, "ContentApi")
          .then(() => ApiHelper.delete(`/sections/${source.id}`, "ContentApi"))
      ).then(() => {
        loadDataInternal("After AI rewrite");
      });
    } catch (err: any) {
      setRewriteError(err?.message || Locale.label("site.aiRewrite.failed"));
      setRewriteBusy(false);
    }
  };

  const handlePublish = () => {
    if (!props.pageId) return;
    trackSave(ApiHelper.post(`/pages/${props.pageId}/publish`, {}, "ContentApi")).then((data: any) => {
      setContainer((prev) => (prev ? { ...prev, publishedAt: data.publishedAt } : prev));
      setHasUnpublishedChanges(false);
    });
  };

  const handleDiscardChanges = () => {
    if (!props.pageId) return;
    setPendingDiscardChanges(true);
  };

  const confirmDiscardChanges = () => {
    setPendingDiscardChanges(false);
    if (!props.pageId) return;
    if (container) saveSnapshot(container, "Before discarding unpublished changes");
    trackSave(ApiHelper.post(`/pages/${props.pageId}/discard`, {}, "ContentApi")).then(() => {
      loadDataInternal("After discarding unpublished changes");
      setHasUnpublishedChanges(false);
    });
  };

  const handleUnpublish = () => {
    if (!props.pageId) return;
    setPendingUnpublish(true);
  };

  const confirmUnpublish = () => {
    setPendingUnpublish(false);
    if (!props.pageId) return;
    trackSave(ApiHelper.delete(`/pages/${props.pageId}/published`, "ContentApi")).then(() => {
      setContainer((prev) => (prev ? { ...prev, publishedAt: null } : prev));
      setHasUnpublishedChanges(false);
    });
  };

  const getAddSection = (s: number, zone: string) => {
    const sort = s;
    return (
      <AddSectionDivider key={"addSection_" + zone + "_" + s.toString()} sort={sort} zone={zone} onAdd={(addSort, addZone) => setTemplateDrop({ sort: addSort, zone: addZone })}>
        <DroppableArea text={Locale.label("site.contentEditor.dropToAddSection")} accept={["section", "sectionBlock"]} onDrop={(data) => handleDrop(data, sort, zone)} />
      </AddSectionDivider>
    );
  };

  const handlePaletteSelect = (item: { type: string; dndType: string; blockId?: string }) => {
    const defaultZone = props.pageId ? "main" : "block";
    const zoneSections = defaultZone === "block" ? container?.sections : ArrayHelper.getAll(container?.sections || [], "zone", defaultZone);
    const lastSection = zoneSections && zoneSections.length > 0 ? zoneSections[zoneSections.length - 1] : null;
    const maxSort = (elements?: ElementInterface[]) => (elements && elements.length > 0 ? Math.max(...elements.map((e) => e.sort || 0)) : 0);

    if (item.dndType === "section") {
      setTemplateDrop({ sort: (lastSection?.sort ?? 0) + 1, zone: defaultZone });
      return;
    }
    if (item.dndType === "sectionBlock") {
      handleDrop({ blockId: item.blockId }, (lastSection?.sort ?? 0) + 1, defaultZone);
      return;
    }

    let target: { sectionId: string; blockId?: string; parentId?: string; sort: number } | null = null;
    if (selectedElementId) {
      const path = findElementPath(selectedElementId);
      if (path?.section) target = { sectionId: path.section.id || "", blockId: path.section.blockId, parentId: path.element.parentId, sort: (path.element.sort || 0) + 0.1 };
    }
    if (!target && editSection?.id) target = { sectionId: editSection.id, blockId: editSection.blockId, sort: maxSort(editSection.elements) + 1 };
    if (!target && lastSection) target = { sectionId: lastSection.id, blockId: lastSection.blockId, sort: maxSort(lastSection.elements) + 1 };
    if (!target) {
      setTemplateDrop({ sort: 0, zone: defaultZone });
      return;
    }

    const element: ElementInterface = { sectionId: target.sectionId, elementType: item.type, sort: target.sort, blockId: target.blockId, parentId: target.parentId };
    if (item.blockId) element.answersJSON = JSON.stringify({ targetBlockId: item.blockId });
    else if (item.type === "row") element.answersJSON = JSON.stringify({ columns: "6,6" });
    else if (item.type === "box") element.answersJSON = JSON.stringify({ background: "var(--light)", text: "var(--dark)" });
    requestPanelChange({ kind: "element", element });
  };

  const handleSectionMove = (section: SectionInterface, direction: "up" | "down") => {
    if (container) saveSnapshot(container, "Before moving section");
    const sort = typeof section.sort === "number" ? section.sort : 0;
    trackSave(ApiHelper.post("/sections", [{ ...section, sort: direction === "up" ? sort - 1.5 : sort + 1.5 }], "ContentApi")).then(() => {
      loadDataInternal("After moving section");
    });
  };

  const handleSectionDuplicate = (sectionId: string) => {
    if (container) saveSnapshot(container, "Before duplicating section");
    trackSave(ApiHelper.post(`/sections/duplicate/${sectionId}`, {}, "ContentApi")).then(() => {
      loadDataInternal("After duplicating section");
    });
  };

  const confirmSectionDelete = () => {
    const section = pendingDeleteSection;
    if (!section) return;
    if (container) saveSnapshot(container, "Before deleting section");
    trackSave(ApiHelper.delete(`/sections/${section.id}`, "ContentApi")).then(() => {
      if (editSection?.id === section.id) setEditSection(null);
      setPendingDeleteSection(null);
      loadDataInternal("After deleting section");
    });
  };

  const getSections = (zone: string) => {
    const result: React.ReactElement[] = [];
    result.push(getAddSection(0, zone));
    const sections = zone === "block" ? container?.sections : ArrayHelper.getAll(container?.sections || [], "zone", zone);
    sections?.forEach((section, index) => {
      if (section.targetBlockId) {
        result.push(
          <SectionBlock
            key={section.id}
            section={section}
            churchSettings={churchSettings}
            onEdit={handleSectionEdit}
            onMove={() => {
              loadDataInternal("After moving section");
            }}
            onSectionMove={handleSectionMove}
            onSectionDuplicate={handleSectionDuplicate}
            onSectionDelete={(s) => setPendingDeleteSection(s)}
            isFirstSection={index === 0}
            isLastSection={index === sections.length - 1}
          />
        );
      } else {
        result.push(
          <Section
            key={section.id}
            section={section}
            churchSettings={churchSettings}
            onEdit={handleSectionEdit}
            onMove={() => {
              loadDataInternal("After moving element");
            }}
            onBeforeChange={(description) => {
              if (container) saveSnapshot(container, description);
            }}
            church={context?.userChurch?.church}
            selectedElementId={selectedElementId}
            onElementClick={handleElementClick}
            onElementDoubleClick={handleElementDoubleClick}
            onElementDelete={handleElementDelete}
            onElementDuplicate={handleElementDuplicate}
            onElementMove={handleElementMove}
            onElementUpdate={handleRealtimeChange}
            onSectionClick={(s) => handleSectionEdit(s, null)}
            onSectionMove={handleSectionMove}
            onSectionDuplicate={handleSectionDuplicate}
            onSectionDelete={(s) => setPendingDeleteSection(s)}
            onSectionSwitchLayout={(s) => setSwitchSection(s)}
            onSectionAiRewrite={openAiRewrite}
            isFirstSection={index === 0}
            isLastSection={index === sections.length - 1}
            isSectionEditing={!!editSection && editSection.id === section.id}
          />
        );
      }
      result.push(getAddSection(section.sort + 0.1, zone));
    });

    if (!sections || sections.length === 0) {
      result.push(<EmptyState key="empty" onAddClick={() => setTemplateDrop({ sort: 0, zone })} />);
    }
    return result;
  };

  const handleSectionEdit = (s: SectionInterface | null, e: ElementInterface | null) => {
    if (s) {
      if (s.targetBlockId) requestPanelChange({ kind: "blockNav", blockId: s.targetBlockId });
      else requestPanelChange({ kind: "section", section: s });
    } else if (e) {
      requestPanelChange({ kind: "element", element: e });
    }
  };

  const findElementPath = (elementId: string): { section: SectionInterface; ancestors: ElementInterface[]; element: ElementInterface } | null => {
    if (!container?.sections) return null;
    const search = (els: ElementInterface[], ancestors: ElementInterface[]): { ancestors: ElementInterface[]; element: ElementInterface } | null => {
      for (const e of els) {
        if (e.id === elementId) return { ancestors, element: e };
        if (e.elements && e.elements.length > 0) {
          const found = search(e.elements, [...ancestors, e]);
          if (found) return found;
        }
      }
      return null;
    };
    for (const s of container.sections) {
      if (s.elements) {
        const found = search(s.elements, []);
        if (found) return { section: s, ...found };
      }
    }
    return null;
  };

  const findElementInSections = (elementId: string): ElementInterface | null => findElementPath(elementId)?.element || null;

  const executePanelAction = (action: PanelAction) => {
    switch (action.kind) {
      case "close":
        setEditElement(null);
        setEditSection(null);
        break;
      case "escape":
        setSelectedElementId(null);
        setEditElement(null);
        setEditSection(null);
        break;
      case "element":
        setSelectedElementId(action.element.id || null);
        setEditSection(null);
        setEditElement(action.element);
        break;
      case "section":
        setEditElement(null);
        setEditSection(action.section);
        break;
      case "blockNav":
        navigate(`/site/blocks/${action.blockId}`);
        break;
    }
  };

  // editElement still holds the pre-edit object (realtime patches only replace the
  // copy inside container.sections), so re-patching it reverts the live preview.
  const revertRealtimePreview = () => {
    if (realtimeDebounceRef.current) clearTimeout(realtimeDebounceRef.current);
    const original = editElement;
    if (original?.id) {
      setContainer((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sections: (prev.sections || []).map((s) => ({
            ...s,
            elements: s.elements ? replaceElementImmutable(s.elements, original) : s.elements
          }))
        };
      });
    }
  };

  const requestPanelChange = (action: PanelAction) => {
    if (action.kind === "element" && editElement && action.element.id && action.element.id === editElement.id) {
      setSelectedElementId(action.element.id);
      return;
    }
    if (action.kind === "section" && editSection && action.section.id && action.section.id === editSection.id) return;
    if (!panelDirtyRef.current || (!editElement && !editSection)) {
      executePanelAction(action);
      return;
    }
    setPendingPanelAction(action);
  };

  const confirmDiscardPanel = () => {
    const action = pendingPanelAction;
    if (!action) return;
    if (editElement) {
      revertRealtimePreview();
      if (!editElement.id) setSelectedElementId(null);
    }
    panelDirtyRef.current = false;
    setPendingPanelAction(null);
    executePanelAction(action);
  };

  const handleElementClick = (elementId: string) => {
    const found = findElementInSections(elementId);
    if (found) requestPanelChange({ kind: "element", element: found });
    else setSelectedElementId(elementId);
  };

  const getPanelBreadcrumb = () => {
    if (!editElement?.id) return null;
    const path = findElementPath(editElement.id);
    if (!path) return null;
    const crumbs: BreadcrumbCrumb[] = [
      { label: Locale.label("site.section.section"), onClick: () => handleSectionEdit(path.section, null) },
      ...path.ancestors.map((a) => ({ label: getElementTypeMeta(a.elementType).label, onClick: () => handleElementClick(a.id || "") })),
      { label: getElementTypeMeta(path.element.elementType).label }
    ];
    return <SelectionBreadcrumb crumbs={crumbs} />;
  };

  const handleElementDoubleClick = (element: ElementInterface) => {
    requestPanelChange({ kind: "element", element });
  };

  const handleElementDelete = (elementId: string) => {
    setPendingDeleteElementId(elementId);
  };

  const confirmElementDelete = () => {
    const elementId = pendingDeleteElementId;
    if (!elementId) return;
    if (container) saveSnapshot(container, "Before deleting element");
    trackSave(ApiHelper.delete(`/elements/${elementId}`, "ContentApi")).then(() => {
      setSelectedElementId(null);
      setPendingDeleteElementId(null);
      loadDataInternal("After deleting element");
    });
  };

  const handleElementDuplicate = (elementId: string) => {
    if (container) saveSnapshot(container, "Before duplicating element");
    trackSave(ApiHelper.post(`/elements/duplicate/${elementId}`, {}, "ContentApi")).then(() => {
      setSelectedElementId(null);
      loadDataInternal("After duplicating element");
    });
  };

  const handleElementMove = (elementId: string, direction: "up" | "down") => {
    if (container) saveSnapshot(container, "Before moving element");
    // Find the element in the sections tree
    const findAndMoveElement = (elements: ElementInterface[], _parentElements?: ElementInterface[]): boolean => {
      for (let i = 0; i < elements.length; i++) {
        if (elements[i].id === elementId) {
          const rawSort = elements[i].sort;
          const currentSort = typeof rawSort === "number" ? rawSort : i;
          const updatedElement = {
            ...elements[i],
            sort: direction === "up" ? currentSort - 1.5 : currentSort + 1.5
          };
          trackSave(ApiHelper.post("/elements", [updatedElement], "ContentApi")).then(() => {
            loadDataInternal("After moving element");
          });
          return true;
        }
        const childElements = elements[i].elements;
        if (childElements && childElements.length > 0) {
          if (findAndMoveElement(childElements, elements)) return true;
        }
      }
      return false;
    };

    container?.sections?.forEach((section) => {
      if (section.elements) findAndMoveElement(section.elements);
    });
  };

  const handleClickOutside = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const clickedInsideElement =
      !!target.closest("[data-element-id]") ||
      !!target.closest('[id^="el-"]') ||
      !!target.closest('[data-testid="draggable-wrapper"]') ||
      !!target.closest(".MuiDialog-root") ||
      !!target.closest(".MuiPopover-root") ||
      !!target.closest(".MuiMenu-root") ||
      !!target.closest("button");

    if (!clickedInsideElement) {
      setSelectedElementId(null);
    }
  };

  const handleDone = () => {
    let url = "";
    if (props.pageId) {
      const page = container as PageInterface;
      if (page.layout === "embed") {
        if (page.url?.includes("/stream")) url = "/admin/video/settings";
      }
    }
    if (props.onDone) props.onDone(url);
    else navigate(`/site/pages/preview/${props.pageId}`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.querySelector(".MuiDialog-root, .MuiPopover-root, .MuiMenu-root")) return;
      if (e.key === "Escape") {
        requestPanelChange({ kind: "escape" });
        return;
      }
      const ae = document.activeElement as HTMLElement | null;
      if (ae && (["INPUT", "TEXTAREA", "SELECT"].includes(ae.tagName) || ae.isContentEditable)) return;
      if (!selectedElementId) return;
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        setPendingDeleteElementId(selectedElementId);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleElementDuplicate(selectedElementId);
      } else if (e.altKey && e.key === "ArrowUp") {
        e.preventDefault();
        handleElementMove(selectedElementId, "up");
      } else if (e.altKey && e.key === "ArrowDown") {
        e.preventDefault();
        handleElementMove(selectedElementId, "down");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, container, editElement, editSection]);

  useEffect(() => {
    const contentEl = contentRef.current;
    if (!contentEl) return;
    const onScroll = () => {
      const shouldShowHelpers = contentEl.scrollTop > 150;
      setShowScrollHelpers((prev) => (prev === shouldShowHelpers ? prev : shouldShowHelpers));
    };
    onScroll();
    contentEl.addEventListener("scroll", onScroll);
    return () => contentEl.removeEventListener("scroll", onScroll);
  }, []);

  const realtimeDebounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleRealtimeChange = useCallback((element: ElementInterface) => {
    // Clear any pending debounce
    if (realtimeDebounceRef.current) {
      clearTimeout(realtimeDebounceRef.current);
    }
    // Debounce the update to prevent flickering on every keystroke
    realtimeDebounceRef.current = setTimeout(() => {
      setContainer((prevContainer) => {
        if (!prevContainer) return prevContainer;
        return {
          ...prevContainer,
          sections: (prevContainer.sections || []).map((s) => ({
            ...s,
            elements: replaceElementImmutable(s.elements || [], element)
          }))
        };
      });
    }, 150);
  }, []);

  const replaceElementImmutable = (elements: ElementInterface[], target: ElementInterface): ElementInterface[] =>
    elements.map((el) => {
      if (el.id === target.id) return target;
      if (el.elements && el.elements.length > 0) {
        return { ...el, elements: replaceElementImmutable(el.elements, target) };
      }
      return el;
    });

  const realtimeUpdateElement = (element: ElementInterface, elements: ElementInterface[]) => {
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].id === element.id) {
        elements[i] = element;
        return;
      }
      const childElements = elements[i].elements;
      if (childElements && childElements.length > 0) {
        realtimeUpdateElement(element, childElements);
      }
    }
  };

  const previewTheme = useMemo(() => {
    const base = {
      palette: { mode: "light" as const },
      components: {
        MuiTextField: { defaultProps: { margin: "normal" as const } },
        MuiFormControl: { defaultProps: { margin: "normal" as const } }
      }
    };
    if (deviceType === "mobile") {
      return createTheme({
        ...base,
        breakpoints: { values: { xs: 0, sm: 2000, md: 3000, lg: 4000, xl: 5000 } }
      });
    }
    return createTheme(base);
  }, [deviceType]);

  const getZoneBox = (sections: SectionInterface[], name: string, keyName: string, showZoneLabel: boolean) => (
    <ZoneBox key={keyName} sections={sections} name={name} keyName={keyName} deviceType={deviceType} showZoneLabel={showZoneLabel}>
      {getSections(keyName)}
    </ZoneBox>
  );

  const getZoneBoxes = () => {
    const result: any[] = [];
    if (props.pageId) {
      const page = container as PageInterface;
      if (page) {
        const layoutZones: string[] = zones[page.layout || ""] || ["main"];
        const showZoneLabel = layoutZones.length > 1;
        layoutZones.forEach((z: string) => {
          const sections = ArrayHelper.getAll(page?.sections || [], "zone", z);
          const name = z.substring(0, 1).toUpperCase() + z.substring(1, z.length);
          result.push(getZoneBox(sections, name, z, showZoneLabel));
        });
      }
    } else {
      const block = container as BlockInterface;
      if (block) result.push(getZoneBox((container as BlockInterface)?.sections || [], Locale.label("site.contentEditor.blockPreview"), "block", false));
    }
    return <>{result}</>;
  };

  if (isMobileViewport) {
    return (
      <ThemeProvider theme={lightEditorTheme}>
        <CssBaseline />
        <Box
          data-testid="editor-small-screen"
          sx={{
            minHeight: "calc(100vh - 64px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            px: 3,
            gap: 1.5,
            backgroundColor: "var(--bg-main)"
          }}
        >
          <Icon sx={{ fontSize: 48, color: "text.secondary" }}>devices</Icon>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>{Locale.label("site.contentEditor.smallScreenTitle")}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary", maxWidth: 360 }}>{Locale.label("site.contentEditor.smallScreenMessage")}</Typography>
          <Button variant="contained" disableElevation onClick={() => navigate("/site")} sx={{ textTransform: "none", fontWeight: 600, mt: 1 }}>
            {Locale.label("site.contentEditor.backToSite")}
          </Button>
        </Box>
      </ThemeProvider>
    );
  }

  if (!container) {
    return (
      <ThemeProvider theme={lightEditorTheme}>
        <CssBaseline />
        <Theme globalStyles={props.config?.globalStyles} appearance={props.config?.appearance} />
        <EditorToolbar
          onDone={handleDone}
          container={container}
          isPageMode={!!props.pageId}
          showHelp={showHelp}
          onToggleHelp={() => setShowHelp(!showHelp)}
          showAdd={showAdd}
          onToggleAdd={() => setShowAdd(!showAdd)}
          deviceType={deviceType}
          onDeviceTypeChange={setDeviceType}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onShowHistory={() => setShowHistory(true)}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          hasUnpublishedChanges={hasUnpublishedChanges}
          onPublish={handlePublish}
          onDiscardChanges={handleDiscardChanges}
          onUnpublish={handleUnpublish}
        />
        <HistoryPanel
          open={showHistory}
          onClose={() => setShowHistory(false)}
          history={history}
          currentIndex={currentHistoryIndex}
          onRestore={handleHistoryRestore}
        />
        <Container sx={{ mt: 5 }}>
          <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} animation="wave" />
          <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} animation="wave" />
          <Skeleton variant="rectangular" height={200} sx={{ mb: 2, borderRadius: 2 }} animation="wave" />
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={lightEditorTheme}>
      <CssBaseline />
      <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 64px)", overflow: "hidden", backgroundColor: "var(--bg-main)" }}>
        <Theme globalStyles={props.config?.globalStyles} appearance={props.config?.appearance} />
        <style>{css}</style>
        <style>{hoverCss}</style>

        <EditorToolbar
          onDone={handleDone}
          container={container}
          isPageMode={!!props.pageId}
          showHelp={showHelp}
          onToggleHelp={() => setShowHelp(!showHelp)}
          showAdd={showAdd}
          onToggleAdd={() => setShowAdd(!showAdd)}
          deviceType={deviceType}
          onDeviceTypeChange={setDeviceType}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onShowHistory={() => setShowHistory(true)}
          saveStatus={saveStatus}
          lastSavedAt={lastSavedAt}
          hasUnpublishedChanges={hasUnpublishedChanges}
          onPublish={handlePublish}
          onDiscardChanges={handleDiscardChanges}
          onUnpublish={handleUnpublish}
          onShowAccessibility={() => setShowA11y(true)}
          accessibilityIssueCount={a11yIssueCount}
        />
        <HistoryPanel
          open={showHistory}
          onClose={() => setShowHistory(false)}
          history={history}
          currentIndex={currentHistoryIndex}
          onRestore={handleHistoryRestore}
        />
        <A11yPanel
          open={showA11y}
          sections={container?.sections}
          onClose={() => setShowA11y(false)}
          onHighlight={handleA11yHighlight}
        />

        <ConfirmDialog
          open={!!pendingDeleteElementId}
          title={Locale.label("site.elements.deleteElementTitle")}
          message={Locale.label("site.elements.deleteElementBody")}
          confirmLabel={Locale.label("common.delete")}
          destructive
          onConfirm={confirmElementDelete}
          onCancel={() => setPendingDeleteElementId(null)}
        />

        <ConfirmDialog
          open={!!pendingDeleteSection}
          title={Locale.label("site.section.deleteSectionTitle")}
          message={Locale.label("site.section.deleteSectionBody")}
          confirmLabel={Locale.label("common.delete")}
          destructive
          data-testid="delete-section-dialog"
          onConfirm={confirmSectionDelete}
          onCancel={() => setPendingDeleteSection(null)}
        />

        <ConfirmDialog
          open={pendingDiscardChanges}
          title={Locale.label("site.editorToolbar.discardChanges")}
          message={Locale.label("site.editorToolbar.discardChangesConfirm")}
          confirmLabel={Locale.label("site.editorToolbar.discardChanges")}
          destructive
          data-testid="discard-changes-dialog"
          onConfirm={confirmDiscardChanges}
          onCancel={() => setPendingDiscardChanges(false)}
        />

        <ConfirmDialog
          open={pendingUnpublish}
          title={Locale.label("site.editorToolbar.disablePublish")}
          message={Locale.label("site.editorToolbar.disablePublishConfirm")}
          confirmLabel={Locale.label("site.editorToolbar.disablePublish")}
          destructive
          data-testid="disable-publish-dialog"
          onConfirm={confirmUnpublish}
          onCancel={() => setPendingUnpublish(false)}
        />

        <ConfirmDialog
          open={!!pendingPanelAction}
          title={Locale.label("site.contentEditor.discardElementTitle")}
          message={editSection ? Locale.label("site.contentEditor.discardSectionMessage") : Locale.label("site.contentEditor.discardElementMessage")}
          confirmLabel={Locale.label("site.contentEditor.discard")}
          cancelLabel={Locale.label("site.contentEditor.keepEditing")}
          destructive
          data-testid="discard-element-dialog"
          onConfirm={confirmDiscardPanel}
          onCancel={() => setPendingPanelAction(null)}
        />

        <SectionTemplatePicker
          open={!!templateDrop}
          onClose={() => setTemplateDrop(null)}
          onSelectBlank={handleTemplateBlank}
          onSelectTemplate={handleTemplateSelect}
        />

        <SectionTemplatePicker
          open={!!switchSection}
          switchMode
          onClose={() => setSwitchSection(null)}
          onSelectBlank={() => setSwitchSection(null)}
          onSelectTemplate={handleSwitchLayout}
        />

        <AiRewriteDialog
          open={!!rewriteSection}
          busy={rewriteBusy}
          error={rewriteError}
          onCancel={() => { if (!rewriteBusy) { setRewriteSection(null); setRewriteError(""); } }}
          onRewrite={handleAiRewrite}
        />

        <DndProvider backend={HTML5Backend}>
          <div style={{ flex: 1, display: "flex", flexDirection: "row", overflow: "hidden", minHeight: 0 }}>
            <AddContentPanel open={showAdd} onClose={() => setShowAdd(false)}>
              {showAdd && (
                <ElementAdd
                  inPanel
                  includeBlocks={!elementOnlyMode}
                  includeSection={!elementOnlyMode}
                  updateCallback={() => setShowAdd(false)}
                  draggingCallback={() => { /* persistent panel â€” stay open while dragging */ }}
                  onSelect={handlePaletteSelect}
                />
              )}
            </AddContentPanel>

            <div ref={contentRef} style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minWidth: 0 }} onClick={handleClickOutside}>
              <HelpDialog open={showHelp} onClose={() => setShowHelp(false)} />

              <div style={{ marginTop: 0, paddingTop: 0 }}>
                {showScrollHelpers && (
                  <>
                    <div
                      style={{
                        position: "fixed",
                        bottom: "30px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 1000,
                        width: "min(600px, 80%)",
                        maxWidth: "600px"
                      }}>
                      <DroppableScroll key={"scrollDown"} text={Locale.label("site.contentEditor.scrollDown")} direction="down" />
                    </div>
                    <div
                      style={{
                        position: "fixed",
                        top: "120px",
                        left: "50%",
                        transform: "translateX(-50%)",
                        zIndex: 1000,
                        width: "min(600px, 80%)",
                        maxWidth: "600px"
                      }}>
                      <DroppableScroll key={"scrollUp"} text={Locale.label("site.contentEditor.scrollUp")} direction="up" />
                    </div>
                  </>
                )}

                <ThemeProvider theme={previewTheme}>{getZoneBoxes()}</ThemeProvider>
              </div>
            </div>

            <PropertyPanel
              open={!!(editElement || editSection)}
              width={editElement && ["text", "textWithPhoto", "card", "faq"].includes(editElement.elementType || "") ? 520 : 400}
              title={
                editElement
                  ? getElementTypeMeta(editElement.elementType).label
                  : Locale.label("site.section.section")
              }
              subtitle={
                editElement
                  ? Locale.label("common.element")
                  : Locale.label("site.section.layoutContainer")
              }
              breadcrumb={getPanelBreadcrumb()}
              icon={
                editElement
                  ? getElementTypeMeta(editElement.elementType).icon
                  : "view_agenda"
              }
              onClose={() => requestPanelChange({ kind: "close" })}
            >
              {editElement && (
                <ElementEdit
                  key={`${editElement.id || "new"}-${editElement.elementType || "element"}`}
                  inPanel
                  element={editElement}
                  onCancel={() => requestPanelChange({ kind: "close" })}
                  onDirtyChange={(dirty) => { panelDirtyRef.current = dirty; }}
                  updatedCallback={(updatedElement) => {
                    panelDirtyRef.current = false;
                    setEditElement(null);
                    if (updatedElement) {
                      const isNewElement = !editElement.id;
                      if (isNewElement) loadDataInternal("After adding element");
                      else {
                        const c = { ...container };
                        c.sections?.forEach((s) => {
                          realtimeUpdateElement(updatedElement, s.elements || []);
                        });
                        setContainer(c);
                        setHasUnpublishedChanges(true);
                        saveSnapshot(c, "After editing element");
                      }
                    } else {
                      loadDataInternal();
                    }
                  }}
                  onRealtimeChange={handleRealtimeChange}
                  globalStyles={props.config?.globalStyles as GlobalStyleInterface}
                />
              )}
              {editSection && (
                <SectionEdit
                  inPanel
                  section={editSection}
                  onCancel={() => requestPanelChange({ kind: "close" })}
                  onDirtyChange={(dirty) => { panelDirtyRef.current = dirty; }}
                  updatedCallback={() => {
                    const isNewSection = !editSection.id;
                    panelDirtyRef.current = false;
                    setEditSection(null);
                    loadDataInternal(isNewSection ? "After adding section" : "After editing section");
                  }}
                  globalStyles={props.config?.globalStyles as GlobalStyleInterface}
                />
              )}
            </PropertyPanel>
          </div>
        </DndProvider>
      </div>
    </ThemeProvider>
  );
}
