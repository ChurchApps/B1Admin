import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  CircularProgress,
  Typography,
  Stack,
  IconButton,
  Breadcrumbs,
  Link
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { getProvider, type Instructions, type InstructionItem, type ContentFolder } from "@churchapps/content-providers";
import { getProviderInstructions } from "./ActionSelectorHelpers";
import { InstructionTree } from "./InstructionTree";
import { BrowseGrid } from "./BrowseGrid";
import { ProviderChipSelector } from "./ProviderChipSelector";
import { useProviderBrowser } from "../hooks/useProviderBrowser";
import { type PlanItemInterface } from "../../helpers";

interface LessonHeaderSelectorProps {
  open: boolean;
  onClose: () => void;
  onSelect: (items: PlanItemInterface[]) => void;
  providerId?: string;
  providerPath?: string;
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
    thumbnailUrl: findThumbnailRecursive(item)
  };
}

export const LessonHeaderSelector: React.FC<LessonHeaderSelectorProps> = ({
  open,
  onClose,
  onSelect,
  providerId,
  providerPath,
  ministryId
}) => {
  const browser = useProviderBrowser({
    ministryId,
    defaultProviderId: providerId || ""
  });

  const [instructions, setInstructions] = useState<Instructions | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Mode: "associated" shows from providerPath, "browse" allows navigation
  const hasAssociatedLesson = !!(providerId && providerPath);
  const [mode, setMode] = useState<"associated" | "browse">(
    hasAssociatedLesson ? "associated" : "browse"
  );

  // Load instructions from provider
  const loadInstructions = useCallback(async (path: string, provId: string) => {
    const provider = getProvider(provId);
    if (!provider) return;

    browser.setLoading(true);
    try {
      let result: Instructions | null = null;
      if (ministryId && provider.requiresAuth) {
        result = await ApiHelper.post(
          "/providerProxy/getInstructions",
          { ministryId, providerId: provId, path },
          "DoingApi"
        );
      } else {
        result = await getProviderInstructions(provider, path, null);
      }
      setInstructions(result || null);
    } catch (error) {
      console.error("Error loading instructions:", error);
      setInstructions(null);
    } finally {
      browser.setLoading(false);
    }
  }, [ministryId, browser.setLoading]);

  // Check if folder is a leaf with instruction capabilities
  const isLeafWithInstructions = useCallback((folder: ContentFolder): boolean => {
    const provider = getProvider(browser.selectedProviderId);
    if (!provider?.capabilities?.instructions) return false;
    return !!folder.isLeaf;
  }, [browser.selectedProviderId]);

  // Handle folder click — leaf loads instructions, otherwise navigate
  const handleFolderClick = useCallback((folder: ContentFolder) => {
    if (isLeafWithInstructions(folder)) {
      browser.setCurrentPath(folder.path);
      browser.setBreadcrumbTitles(prev => [...prev, folder.title]);
      loadInstructions(folder.path, browser.selectedProviderId);
    } else {
      setInstructions(null);
      browser.navigateToFolder(folder);
    }
  }, [isLeafWithInstructions, browser.setCurrentPath, browser.setBreadcrumbTitles, browser.selectedProviderId, browser.navigateToFolder, loadInstructions]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (instructions) {
      setInstructions(null);
      browser.navigateBack();
    } else if (browser.currentPath) {
      browser.navigateBack();
    } else if (mode === "browse" && hasAssociatedLesson) {
      setMode("associated");
      browser.setSelectedProviderId(providerId || "");
    }
  }, [instructions, browser.currentPath, browser.navigateBack, browser.setSelectedProviderId, mode, hasAssociatedLesson, providerId]);

  // Toggle section expansion
  const toggleSectionExpanded = useCallback((sectionId: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  // Auto-expand when there's only one item at a level
  useEffect(() => {
    if (instructions?.items) {
      const autoExpandIds = new Set<string>();
      const findSingleChildItems = (items: InstructionItem[]) => {
        if (items.length === 1) {
          const item = items[0];
          const itemId = item.relatedId || item.id;
          if (itemId) autoExpandIds.add(itemId);
          if (item.children) findSingleChildItems(item.children);
        }
      };
      findSingleChildItems(instructions.items);
      setExpandedSections(autoExpandIds);
    }
  }, [instructions]);

  // Handle selecting a header - convert to planItemHeader with sections as children
  const handleAddSection = useCallback(
    (section: InstructionItem, provId: string, pathIndices: number[]) => {
      const isHeader = section.itemType === "header";
      const currentProviderPath = mode === "browse" ? browser.currentPath : providerPath;

      // Create the header plan item
      const headerItem: PlanItemInterface = {
        itemType: "header",
        relatedId: section.relatedId || section.id,
        label: section.label || "",
        description: section.description,
        providerId: provId,
        providerPath: currentProviderPath,
        providerContentPath: generatePath(pathIndices),
        thumbnailUrl: findThumbnailRecursive(section),
        children: []
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
                currentProviderPath || "",
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
                currentProviderPath || "",
                [...pathIndices, childIndex]
              )
            );
          }
        });
      }

      onSelect([headerItem]);
      onClose();
    },
    [onSelect, onClose, providerPath, mode, browser.currentPath]
  );

  // For this dialog, we don't allow adding individual actions
  const handleAddAction = useCallback(() => {
    // No-op - actions are excluded
  }, []);

  // Handle provider change — clear instructions + delegate to hook
  const handleProviderChange = useCallback((newProviderId: string) => {
    setInstructions(null);
    setExpandedSections(new Set());
    browser.changeProvider(newProviderId);
  }, [browser.changeProvider]);

  // Switch to browse mode
  const handleBrowseOther = useCallback(() => {
    setMode("browse");
    setInstructions(null);
    browser.setCurrentPath("");
    browser.setBreadcrumbTitles([]);
  }, [browser.setCurrentPath, browser.setBreadcrumbTitles]);

  // Reset state on close
  const handleClose = useCallback(() => {
    setMode(hasAssociatedLesson ? "associated" : "browse");
    setInstructions(null);
    setExpandedSections(new Set());
    browser.reset();
    if (providerId) browser.setSelectedProviderId(providerId);
    onClose();
  }, [onClose, hasAssociatedLesson, providerId, browser.reset, browser.setSelectedProviderId]);

  // Load data on open or mode change
  useEffect(() => {
    if (!open) return;
    browser.loadLinkedProviders();
    if (mode === "associated" && providerPath && providerId) {
      loadInstructions(providerPath, providerId);
    } else if (mode === "browse") {
      browser.loadContent("");
    }

  }, [open, mode]);

  // Breadcrumb items — wraps hook breadcrumbs to also clear instructions on click
  const breadcrumbItems = useMemo(() => {
    if (mode === "associated") return [];
    return browser.breadcrumbItems.map(item => ({
      ...item,
      onClick: item.onClick ? () => { setInstructions(null); setExpandedSections(new Set()); item.onClick!(); } : undefined
    }));
  }, [mode, browser.breadcrumbItems]);

  // Associated mode — show instructions from providerPath
  if (mode === "associated" && hasAssociatedLesson) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {Locale.label("plans.lessonHeaderSelector.title") || "Add Lesson Content"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {Locale.label("plans.lessonHeaderSelector.description") ||
                  "Select a header or section to add to your plan."}
              </Typography>
              <Button size="small" onClick={handleBrowseOther}>
                {Locale.label("plans.lessonSelector.browseOtherProviders") || "Browse Other Providers"}
              </Button>
            </Stack>
          </Box>
          {browser.loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : instructions?.items && instructions.items.length > 0 ? (
            <InstructionTree
              items={instructions.items}
              providerId={providerId || ""}
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
  }

  // Browse mode
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          {(browser.currentPath || (hasAssociatedLesson && mode === "browse")) && (
            <IconButton size="small" onClick={handleBack}>
              <ArrowBackIcon />
            </IconButton>
          )}
          <span>{Locale.label("plans.lessonHeaderSelector.selectContent") || "Select Lesson Content"}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <ProviderChipSelector
            selectedProviderId={browser.selectedProviderId}
            onProviderChange={handleProviderChange}
            availableProviders={browser.availableProviders}
            linkedProviders={browser.linkedProviders}
            showAllProviders={browser.showAllProviders}
            onShowAll={() => browser.setShowAllProviders(true)}
            isCurrentProviderLinked={browser.isCurrentProviderLinked}
            currentProviderRequiresAuth={!!browser.currentProviderInfo?.requiresAuth}
          />

          {/* Breadcrumbs */}
          {breadcrumbItems.length > 0 && (
            <Breadcrumbs aria-label="breadcrumb">
              {breadcrumbItems.map((item, index) => (
                index === breadcrumbItems.length - 1 ? (
                  <Typography key={index} color="text.primary">{item.label}</Typography>
                ) : (
                  <Link key={index} component="button" variant="body2" onClick={item.onClick} underline="hover" color="inherit">
                    {item.label}
                  </Link>
                )
              ))}
            </Breadcrumbs>
          )}

          {/* Content area */}
          {!browser.isCurrentProviderLinked && browser.currentProviderInfo?.requiresAuth ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">
                {Locale.label("plans.lessonSelector.linkProviderFirst") || "Please link this provider in ministry settings to browse content."}
              </Typography>
            </Box>
          ) : browser.loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : instructions ? (
            <Box>
              <Box sx={{ py: 1, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {Locale.label("plans.lessonHeaderSelector.description") || "Select a header or section to add:"}
                  <Typography component="span" sx={{ fontWeight: 600, ml: 1, color: "primary.main" }}>
                    {instructions.name || "Content"}
                  </Typography>
                </Typography>
              </Box>
              <InstructionTree
                items={instructions.items || []}
                providerId={browser.selectedProviderId}
                expandedSections={expandedSections}
                onToggleExpanded={toggleSectionExpanded}
                onAddSection={handleAddSection}
                onAddAction={handleAddAction}
                excludeActions={true}
              />
            </Box>
          ) : browser.currentItems.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">
                {Locale.label("plans.lessonHeaderSelector.noContent") || "No content available"}
              </Typography>
            </Box>
          ) : (
            <BrowseGrid
              folders={browser.currentItems}
              selectedProviderId={browser.selectedProviderId}
              isLeafFolder={isLeafWithInstructions}
              onFolderClick={handleFolderClick}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
      </DialogActions>
    </Dialog>
  );
};
