import React, { useState, useCallback, useEffect, useMemo } from "react";
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
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  Breadcrumbs,
  Link,
  Chip,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon, Folder as FolderIcon, LinkOff as LinkOffIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { getProvider, getAvailableProviders, type ContentFolder, type ContentItem, type IProvider } from "@churchapps/content-provider-helper";
import { type ContentProviderAuthInterface } from "../../helpers";
import { ContentProviderAuthHelper } from "../../helpers/ContentProviderAuthHelper";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (contentId: string, contentName?: string, contentPath?: string, providerId?: string) => void;
  returnVenueName?: boolean;
  ministryId?: string;
  defaultProviderId?: string;
}

export const LessonSelector: React.FC<Props> = ({ open, onClose, onSelect, returnVenueName, ministryId, defaultProviderId }) => {
  // Provider selection
  const [selectedProviderId, setSelectedProviderId] = useState<string>(defaultProviderId || "");
  const [linkedProviders, setLinkedProviders] = useState<ContentProviderAuthInterface[]>([]);
  const [showAllProviders, setShowAllProviders] = useState(false);

  const availableProviders = useMemo(() => getAvailableProviders(["lessonschurch", "signpresenter", "bibleproject"]), []);

  // Auto-select first implemented provider if none is set
  React.useEffect(() => {
    if (!selectedProviderId && availableProviders.length > 0) {
      const firstImplemented = availableProviders.find(p => p.implemented);
      if (firstImplemented) setSelectedProviderId(firstImplemented.id);
    }
  }, [selectedProviderId, availableProviders]);

  const provider = useMemo<IProvider | null>(() => {
    return selectedProviderId ? getProvider(selectedProviderId) : null;
  }, [selectedProviderId]);

  // Path-based navigation
  const [currentPath, setCurrentPath] = useState<string>("");
  const [breadcrumbTitles, setBreadcrumbTitles] = useState<string[]>([]);
  const [currentItems, setCurrentItems] = useState<ContentFolder[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected folder (final selection)
  const [selectedFolder, setSelectedFolder] = useState<ContentFolder | null>(null);

  // Check if a folder is the final level (provider sets isLeaf: true)
  const isLeafFolder = useCallback((folder: ContentFolder): boolean => {
    return !!folder.isLeaf;
  }, []);

  // Load content for a given path (or root if empty)
  const loadContent = useCallback(async (path: string) => {
    if (!provider) {
      setCurrentItems([]);
      return;
    }
    setLoading(true);
    try {
      let items: ContentItem[] = [];

      // For providers that require auth, use the API proxy to avoid CORS issues
      if (provider.requiresAuth && ministryId) {
        items = await ApiHelper.post("/providerProxy/browse", { ministryId, providerId: selectedProviderId, path: path || null }, "DoingApi");
      } else {
        // For providers without auth, call directly
        items = await provider.browse(path || null, null);
      }

      const folders = items.filter((item): item is ContentFolder => item.type === "folder");
      setCurrentItems(folders);
    } catch (error) {
      console.error("Error loading content:", error);
      setCurrentItems([]);
    } finally {
      setLoading(false);
    }
  }, [provider, ministryId, selectedProviderId]);

  // Handle folder click - either navigate into it or select it (if leaf)
  const handleFolderClick = useCallback((folder: ContentFolder) => {
    if (isLeafFolder(folder)) {
      // This is a leaf folder - select it
      setSelectedFolder(folder);
    } else {
      // Navigate into the folder using its path
      setSelectedFolder(null);
      setCurrentPath(folder.path);
      setBreadcrumbTitles(prev => [...prev, folder.title]);
      loadContent(folder.path);
    }
  }, [isLeafFolder, loadContent]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    setSelectedFolder(null);
    if (currentPath) {
      // Remove last segment from path
      const segments = currentPath.split("/").filter(Boolean);
      segments.pop();
      const newPath = segments.length > 0 ? "/" + segments.join("/") : "";
      setCurrentPath(newPath);
      // Remove last breadcrumb title
      setBreadcrumbTitles(prev => prev.slice(0, -1));
      loadContent(newPath);
    }
  }, [currentPath, loadContent]);

  // Handle breadcrumb click
  const handleBreadcrumbClick = useCallback((index: number) => {
    setSelectedFolder(null);
    if (index < 0) {
      // Root clicked - go back to root
      setCurrentPath("");
      setBreadcrumbTitles([]);
      loadContent("");
    } else {
      // Navigate to specific level by rebuilding path from segments
      const segments = currentPath.split("/").filter(Boolean);
      const newSegments = segments.slice(0, index + 1);
      const newPath = "/" + newSegments.join("/");
      setCurrentPath(newPath);
      setBreadcrumbTitles(prev => prev.slice(0, index + 1));
      loadContent(newPath);
    }
  }, [currentPath, loadContent]);

  // Load linked providers for the ministry
  const loadLinkedProviders = useCallback(async () => {
    if (!ministryId) {
      setLinkedProviders([]);
      return;
    }
    try {
      const linked = await ContentProviderAuthHelper.getLinkedProviders(ministryId);
      setLinkedProviders(linked || []);
    } catch (error) {
      console.error("Error loading linked providers:", error);
      setLinkedProviders([]);
    }
  }, [ministryId]);

  // Handle content provider selection change
  const handleContentProviderChange = useCallback((providerId: string) => {
    setSelectedProviderId(providerId);
    setCurrentPath("");
    setBreadcrumbTitles([]);
    setCurrentItems([]);
    setSelectedFolder(null);
    // Content will reload via useEffect when provider changes
  }, []);

  // Handle final selection
  const handleSelect = useCallback(() => {
    if (selectedFolder) {
      const folderName = returnVenueName ? selectedFolder.title : undefined;
      onSelect(selectedFolder.id, folderName, selectedFolder.path, selectedProviderId);
      onClose();
    }
  }, [selectedFolder, returnVenueName, onSelect, onClose, selectedProviderId]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    setCurrentPath("");
    setBreadcrumbTitles([]);
    setCurrentItems([]);
    setSelectedFolder(null);
    setShowAllProviders(false);
    if (defaultProviderId) {
      setSelectedProviderId(defaultProviderId);
    }
    onClose();
  }, [onClose, defaultProviderId]);

  // Load initial content when dialog opens
  useEffect(() => {
    if (open) {
      loadContent("");
      loadLinkedProviders();
    }
  }, [open, loadContent, loadLinkedProviders]);

  // Reload content when provider changes
  useEffect(() => {
    if (open && provider) {
      loadContent("");
    }
  }, [open, provider, selectedProviderId]);

  // Get current provider info
  const currentProviderInfo = useMemo(() => {
    return availableProviders.find(p => p.id === selectedProviderId);
  }, [availableProviders, selectedProviderId]);

  // Check if current provider is linked
  const isCurrentProviderLinked = useMemo(() => {
    const info = availableProviders.find(p => p.id === selectedProviderId);
    if (info && !info.requiresAuth) return true;
    return linkedProviders.some(lp => lp.providerId === selectedProviderId);
  }, [linkedProviders, selectedProviderId, availableProviders]);

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const providerName = currentProviderInfo?.name || selectedProviderId;
    const items: { label: string; onClick?: () => void }[] = [
      { label: providerName, onClick: () => handleBreadcrumbClick(-1) }
    ];
    breadcrumbTitles.forEach((title, index) => {
      items.push({ label: title, onClick: () => handleBreadcrumbClick(index) });
    });
    return items;
  }, [breadcrumbTitles, handleBreadcrumbClick, currentProviderInfo, selectedProviderId]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          {currentPath && (
            <IconButton onClick={handleBack} size="small">
              <ArrowBackIcon />
            </IconButton>
          )}
          <span>{Locale.label("plans.lessonSelector.associateLesson")}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Content Provider Selector */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {Locale.label("plans.lessonSelector.contentProvider") || "Content Provider"}
              </Typography>
              {!showAllProviders && (
                <Button size="small" onClick={() => setShowAllProviders(true)}>
                  {Locale.label("plans.lessonSelector.browseOtherProviders") || "Browse Other Providers"}
                </Button>
              )}
            </Stack>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {(showAllProviders ? availableProviders : availableProviders.filter(p =>
                !p.requiresAuth || linkedProviders.some(lp => lp.providerId === p.id)
              )).map((providerInfo) => {
                const isLinked = !providerInfo.requiresAuth || linkedProviders.some(lp => lp.providerId === providerInfo.id);
                return (
                  <Chip
                    key={providerInfo.id}
                    label={providerInfo.name}
                    onClick={() => handleContentProviderChange(providerInfo.id)}
                    color={selectedProviderId === providerInfo.id ? "primary" : "default"}
                    variant={selectedProviderId === providerInfo.id ? "filled" : "outlined"}
                    icon={!isLinked ? <LinkOffIcon /> : undefined}
                    sx={{ opacity: isLinked ? 1 : 0.6 }}
                  />
                );
              })}
            </Box>
            {!isCurrentProviderLinked && currentProviderInfo?.requiresAuth && (
              <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: "block" }}>
                {Locale.label("plans.lessonSelector.providerNotLinked") || "This provider is not linked. Please link it in ministry settings to access content."}
              </Typography>
            )}
          </Box>

          {/* Breadcrumb navigation */}
          <Breadcrumbs aria-label="breadcrumb">
            {breadcrumbItems.map((item, index) => (
              index === breadcrumbItems.length - 1 ? (
                <Typography key={index} color="text.primary">{item.label}</Typography>
              ) : (
                <Link
                  key={index}
                  component="button"
                  variant="body2"
                  onClick={item.onClick}
                  underline="hover"
                  color="inherit"
                >
                  {item.label}
                </Link>
              )
            ))}
          </Breadcrumbs>

          {/* Content grid */}
          {!isCurrentProviderLinked && currentProviderInfo?.requiresAuth ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">
                {Locale.label("plans.lessonSelector.linkProviderFirst") || "Please link this provider in ministry settings to browse content."}
              </Typography>
            </Box>
          ) : loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : currentItems.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">No content available</Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
                gap: 2,
                maxHeight: "400px",
                overflowY: "auto",
                p: 1
              }}
            >
              {currentItems.map((folder) => {
                const isLeaf = isLeafFolder(folder);
                const isSelected = selectedFolder?.id === folder.id;
                return (
                  <Card
                    key={folder.id}
                    sx={{
                      border: isSelected ? 2 : 1,
                      borderColor: isSelected ? "primary.main" : "divider",
                      bgcolor: isSelected ? "action.selected" : "background.paper"
                    }}
                  >
                    <CardActionArea onClick={() => handleFolderClick(folder)}>
                      {folder.image ? (
                        <CardMedia
                          component="img"
                          height="80"
                          image={folder.image}
                          alt={folder.title}
                          sx={{ objectFit: "cover" }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 80,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: isLeaf ? "primary.light" : "grey.200"
                          }}
                        >
                          <FolderIcon sx={{ fontSize: 40, color: isLeaf ? "primary.contrastText" : "grey.500" }} />
                        </Box>
                      )}
                      <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                        <Typography
                          variant="body2"
                          noWrap
                          title={folder.title}
                          sx={{ fontWeight: isLeaf ? 600 : 400 }}
                        >
                          {folder.title}
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>
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
