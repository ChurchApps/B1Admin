import React, { useState, useCallback } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
  Box,
  CircularProgress,
  IconButton,
  Breadcrumbs,
  Link
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { ProviderChipSelector } from "./ProviderChipSelector";
import { BrowseGrid } from "./BrowseGrid";
import { Locale } from "@churchapps/apphelper";
import { type ContentFolder } from "@churchapps/content-providers";
import { useProviderBrowser } from "../hooks/useProviderBrowser";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (contentId: string, contentName?: string, contentPath?: string, providerId?: string) => void;
  returnVenueName?: boolean;
  ministryId?: string;
  defaultProviderId?: string;
  /** Full path from the previous plan's providerPlanId (e.g. /lessons/prog/study/lesson/venue) */
  initialNavigationPath?: string;
  /** Provider ID from the previous plan */
  initialProviderId?: string;
  /** Venue name from the previous plan to auto-select in the next lesson */
  previousVenueName?: string;
}

export const LessonSelector: React.FC<Props> = ({ open, onClose, onSelect, returnVenueName, ministryId, defaultProviderId, initialNavigationPath, initialProviderId, previousVenueName }) => {
  const browser = useProviderBrowser({ ministryId, defaultProviderId });

  // Selected folder (final selection) - unique to LessonSelector
  const [selectedFolder, setSelectedFolder] = useState<ContentFolder | null>(null);
  // When set, auto-select the first leaf folder matching this name
  const [autoSelectVenueName, setAutoSelectVenueName] = useState<string | null>(null);

  // Handle folder click - either navigate into it or select it (if leaf)
  const handleFolderClick = useCallback((folder: ContentFolder) => {
    if (browser.isLeafFolder(folder)) {
      setSelectedFolder(folder);
    } else {
      setSelectedFolder(null);
      browser.navigateToFolder(folder);
    }
  }, [browser]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    setSelectedFolder(null);
    browser.navigateBack();
  }, [browser]);

  // Handle final selection
  const handleSelect = useCallback(() => {
    if (selectedFolder) {
      const folderName = returnVenueName ? selectedFolder.title : undefined;
      onSelect(selectedFolder.id, folderName, selectedFolder.path, browser.selectedProviderId);
      onClose();
    }
  }, [selectedFolder, returnVenueName, onSelect, onClose, browser.selectedProviderId]);

  // Handle provider change
  const handleProviderChange = useCallback((providerId: string) => {
    setSelectedFolder(null);
    browser.changeProvider(providerId);
  }, [browser]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    setSelectedFolder(null);
    setAutoSelectVenueName(null);
    browser.reset();
    onClose();
  }, [onClose, browser]);

  // Auto-select venue by name when items update after navigating into the next lesson
  React.useEffect(() => {
    if (autoSelectVenueName && browser.currentItems.length > 0) {
      const match = browser.currentItems.find(
        f => browser.isLeafFolder(f) && f.title === autoSelectVenueName
      );
      if (match) {
        setSelectedFolder(match);
        setAutoSelectVenueName(null);
      }
    }
  }, [browser.currentItems, autoSelectVenueName, browser.isLeafFolder]);

  // Load initial content when dialog opens, with auto-navigation for next lesson
  React.useEffect(() => {
    if (!open) return;
    browser.loadLinkedProviders();

    const autoNavigate = async () => {
      if (initialNavigationPath && initialProviderId) {
        // Parse the previous venue path: /lessons/{programId}/{studyId}/{lessonId}/{venueId}
        const segments = initialNavigationPath.replace(/^\//, "").split("/").filter(Boolean);

        if (segments.length >= 4) {
          // Navigate to the study level to see all lessons
          const studyLevelPath = "/" + segments.slice(0, 3).join("/");
          const previousLessonId = segments[3]; // lessonId

          const lessons = await browser.navigateToPath(studyLevelPath, initialProviderId);

          // Find the previous lesson's index
          const prevIndex = lessons.findIndex(f => {
            const fSegs = f.path.replace(/^\//, "").split("/").filter(Boolean);
            return fSegs[fSegs.length - 1] === previousLessonId;
          });

          if (prevIndex >= 0 && prevIndex < lessons.length - 1) {
            // Navigate into the NEXT lesson to show its venues
            const nextLesson = lessons[prevIndex + 1];
            if (previousVenueName) setAutoSelectVenueName(previousVenueName);
            browser.navigateToFolder(nextLesson);
          }
          // If at the last lesson, we stay at the study level showing all lessons
          return;
        }
      }
      // Fallback: load from root
      browser.loadContent("");
    };

    autoNavigate();
  }, [open]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          {browser.currentPath && (
            <IconButton onClick={handleBack} size="small">
              <ArrowBackIcon />
            </IconButton>
          )}
          <span>{Locale.label("plans.lessonSelector.associateLesson")}</span>
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

          {/* Breadcrumb navigation */}
          <Breadcrumbs aria-label="breadcrumb">
            {browser.breadcrumbItems.map((item, index) => (
              index === browser.breadcrumbItems.length - 1 ? (
                <Typography key={index} color="text.primary">{item.label}</Typography>
              ) : (
                <Link key={index} component="button" variant="body2" onClick={item.onClick} underline="hover" color="inherit">
                  {item.label}
                </Link>
              )
            ))}
          </Breadcrumbs>

          {/* Content grid */}
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
          ) : browser.currentItems.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">No content available</Typography>
            </Box>
          ) : (
            <BrowseGrid
              folders={browser.currentItems}
              selectedProviderId={browser.selectedProviderId}
              selectedFolderId={selectedFolder?.id}
              isLeafFolder={browser.isLeafFolder}
              onFolderClick={handleFolderClick}
            />
          )}

          {/* Selected folder indicator */}
          {selectedFolder && (
            <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">Selected:</Typography>
              <Typography variant="subtitle1" color="primary">{selectedFolder.title}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
        <Button onClick={handleSelect} disabled={!selectedFolder} variant="contained">
          {Locale.label("plans.lessonSelector.associateLesson")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
