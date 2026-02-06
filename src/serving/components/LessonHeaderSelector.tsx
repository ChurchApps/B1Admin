import React, { useState, useCallback, useEffect } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  CircularProgress,
  Typography,
} from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { getProvider, type Instructions, type InstructionItem } from "@churchapps/content-provider-helper";
import { getProviderInstructions } from "./ActionSelectorHelpers";
import { InstructionTree } from "./InstructionTree";
import { type PlanItemInterface } from "../../helpers";

interface LessonHeaderSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (items: PlanItemInterface[]) => void;
  providerId: string;
  providerPath: string;
  ministryId?: string;
}

// Helper to find thumbnail recursively in instruction tree
function findThumbnailRecursive(item: InstructionItem): string | undefined {
  if (item.thumbnail) return item.thumbnail;
  if (item.children) {
    for (const child of item.children) {
      const found = findThumbnailRecursive(child);
      if (found) return found;
    }
  }
  return undefined;
}

// Generate dot-notation path from indices
function generatePath(indices: number[]): string {
  return indices.join(".");
}

// Convert InstructionItem to PlanItemInterface
function instructionToPlanItem(
  item: InstructionItem,
  itemType: string,
  providerId: string,
  providerPath: string,
  pathIndices: number[]
): PlanItemInterface {
  return {
    itemType,
    relatedId: item.relatedId || item.id,
    label: item.label || "",
    description: item.description,
    seconds: item.seconds,
    providerId,
    providerPath,
    providerContentPath: generatePath(pathIndices),
    thumbnailUrl: findThumbnailRecursive(item),
  };
}

export const LessonHeaderSelector: React.FC<LessonHeaderSelectorProps> = ({
  open,
  onClose,
  onSelect,
  providerId,
  providerPath,
  ministryId,
}) => {
  const [instructions, setInstructions] = useState<Instructions | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Load instructions from provider
  const loadInstructions = useCallback(async () => {
    if (!providerId || !providerPath) return;

    const provider = getProvider(providerId);
    if (!provider) return;

    setLoading(true);
    try {
      let result: Instructions | null = null;
      if (ministryId && provider.requiresAuth) {
        result = await ApiHelper.post(
          "/providerProxy/getInstructions",
          { ministryId, providerId, path: providerPath },
          "DoingApi"
        );
      } else {
        result = await getProviderInstructions(provider, providerPath, null);
      }
      setInstructions(result || null);
    } catch (error) {
      console.error("Error loading instructions:", error);
      setInstructions(null);
    } finally {
      setLoading(false);
    }
  }, [providerId, providerPath, ministryId]);

  // Toggle section expansion
  const toggleSectionExpanded = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  // Handle selecting a header - convert to planItemHeader with sections as children
  const handleAddSection = useCallback(
    (section: InstructionItem, provId: string, pathIndices: number[]) => {
      const isHeader = section.itemType === "header";

      // Create the header plan item
      const headerItem: PlanItemInterface = {
        itemType: "header",
        relatedId: section.relatedId || section.id,
        label: section.label || "",
        description: section.description,
        providerId: provId,
        providerPath,
        providerContentPath: generatePath(pathIndices),
        thumbnailUrl: findThumbnailRecursive(section),
        children: [],
      };

      // Add children based on whether this is a header or section
      if (isHeader) {
        // Header selected: children are sections (become providerSection items)
        section.children?.forEach((child, childIndex) => {
          if (child.itemType === "section" || child.itemType !== "action") {
            headerItem.children!.push(
              instructionToPlanItem(
                child,
                "providerSection",
                provId,
                providerPath,
                [...pathIndices, childIndex]
              )
            );
          }
        });
      } else {
        // Section selected: children are actions (become providerPresentation items)
        section.children?.forEach((child, childIndex) => {
          if (child.itemType === "action" || child.itemType !== "section") {
            // Skip file type items
            if (child.itemType === "file") return;
            headerItem.children!.push(
              instructionToPlanItem(
                child,
                "providerPresentation",
                provId,
                providerPath,
                [...pathIndices, childIndex]
              )
            );
          }
        });
      }

      onSelect([headerItem]);
      onClose();
    },
    [onSelect, onClose, providerPath]
  );

  // For this dialog, we don't allow adding individual actions
  // The onAddAction callback is required by InstructionTree but won't be called
  // because we use excludeActions={true}
  const handleAddAction = useCallback(() => {
    // No-op - actions are excluded
  }, []);

  // Reset state on close
  const handleClose = useCallback(() => {
    setExpandedSections(new Set());
    onClose();
  }, [onClose]);

  // Load data on open
  useEffect(() => {
    if (open) {
      loadInstructions();
    }
  }, [open, loadInstructions]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {Locale.label("plans.lessonHeaderSelector.title") || "Add Lesson Content"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ py: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {Locale.label("plans.lessonHeaderSelector.description") ||
              "Select a header or section to add to your plan. Its children will be added as plan items."}
          </Typography>
        </Box>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : instructions?.items && instructions.items.length > 0 ? (
          <InstructionTree
            items={instructions.items}
            providerId={providerId}
            expandedSections={expandedSections}
            onToggleExpanded={toggleSectionExpanded}
            onAddSection={handleAddSection}
            onAddAction={handleAddAction}
            excludeActions={true}
          />
        ) : (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography color="text.secondary">
              {Locale.label("plans.lessonHeaderSelector.noContent") ||
                "No lesson content available"}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
      </DialogActions>
    </Dialog>
  );
};
