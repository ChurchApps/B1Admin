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
  Chip,
  IconButton,
  CircularProgress,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon, LinkOff as LinkOffIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { getProvider, getAvailableProviders, type ContentFolder, type ContentFile, type ContentItem, type Instructions, type InstructionItem } from "@churchapps/content-provider-helper";

import { type ContentProviderAuthInterface } from "../../helpers";
import { ContentProviderAuthHelper } from "../../helpers/ContentProviderAuthHelper";
import { generatePath, getProviderInstructions, type ActionSelectorProps } from "./ActionSelectorHelpers";
import { InstructionTree } from "./InstructionTree";
import { BrowseGrid } from "./BrowseGrid";

export const ActionSelector: React.FC<ActionSelectorProps> = ({ open, onClose, onSelect, contentPath, providerId, ministryId }) => {
  // Provider state
  const [selectedProviderId, setSelectedProviderId] = useState<string>(providerId || "lessonschurch");
  const [linkedProviders, setLinkedProviders] = useState<ContentProviderAuthInterface[]>([]);
  const [showAllProviders, setShowAllProviders] = useState(false);

  // Navigation state
  const [currentPath, setCurrentPath] = useState<string>("");
  const [breadcrumbTitles, setBreadcrumbTitles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Content state
  const [currentItems, setCurrentItems] = useState<ContentFolder[]>([]);
  const [currentFiles, setCurrentFiles] = useState<ContentFile[]>([]);

  // Instructions state (when viewing a venue/leaf)
  const [instructions, setInstructions] = useState<Instructions | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Mode: "associated" shows actions from contentPath, "browse" allows navigation
  const [mode, setMode] = useState<"associated" | "browse">(contentPath ? "associated" : "browse");

  const availableProviders = useMemo(() => getAvailableProviders(["lessonschurch", "signpresenter", "bibleproject"]), []);

  const currentProviderInfo = useMemo(() => {
    const pid = mode === "associated" ? (providerId || "lessonschurch") : selectedProviderId;
    return availableProviders.find(p => p.id === pid);
  }, [availableProviders, selectedProviderId, mode, providerId]);

  const isCurrentProviderLinked = useMemo(() => {
    const pid = mode === "associated" ? (providerId || "lessonschurch") : selectedProviderId;
    if (pid === "lessonschurch") return true;
    return linkedProviders.some(lp => lp.providerId === pid);
  }, [linkedProviders, selectedProviderId, mode, providerId]);

  // Load linked providers
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

  // Load instructions for a content path
  const loadInstructions = useCallback(async (path: string, provId: string) => {
    const provider = getProvider(provId);
    if (!provider) return;

    setLoading(true);
    try {
      let result: Instructions | null = null;

      // For providers that require auth, use the API proxy to avoid CORS issues
      if (ministryId && provider.requiresAuth) {
        result = await ApiHelper.post("/providerProxy/getInstructions", { ministryId, providerId: provId, path }, "DoingApi");
      } else {
        // For providers without auth, call directly
        result = await getProviderInstructions(provider, path, null);
      }

      if (result) {
        setInstructions(result);

      } else {
        setInstructions(null);
  
      }
    } catch (error) {
      console.error("Error loading instructions:", error);
      setInstructions(null);

    } finally {
      setLoading(false);
    }
  }, [ministryId]);

  // Load browse content
  const loadBrowseContent = useCallback(async (path: string) => {
    const provider = getProvider(selectedProviderId);
    if (!provider) {
      setCurrentItems([]);
      setCurrentFiles([]);
      return;
    }

    setLoading(true);
    try {
      let items: ContentItem[] = [];

      // For providers that require auth, use the API proxy to avoid CORS issues
      if (ministryId && provider.requiresAuth) {
        items = await ApiHelper.post("/providerProxy/browse", { ministryId, providerId: selectedProviderId, path: path || null }, "DoingApi");
      } else {
        // For providers without auth, call directly
        items = await provider.browse(path || null, null);
      }

      const folders = items.filter((item): item is ContentFolder => item.type === "folder");
      const files = items.filter((item): item is ContentFile => item.type === "file");
      setCurrentItems(folders);
      setCurrentFiles(files);
    } catch (error) {
      console.error("Error loading browse content:", error);
      setCurrentItems([]);
      setCurrentFiles([]);
    } finally {
      setLoading(false);
    }
  }, [selectedProviderId, ministryId]);

  // Check if folder is a leaf (venue)
  const isLeafFolder = useCallback((folder: ContentFolder): boolean => {
    const provider = getProvider(selectedProviderId);
    if (!provider) return false;
    const capabilities = provider.capabilities;
    if (!capabilities.instructions) return false;
    return !!folder.isLeaf;
  }, [selectedProviderId]);

  // Handle folder click
  const handleFolderClick = useCallback((folder: ContentFolder) => {
    if (isLeafFolder(folder)) {
      // Load instructions for this leaf
      setCurrentPath(folder.path);
      setBreadcrumbTitles(prev => [...prev, folder.title]);
      loadInstructions(folder.path, selectedProviderId);
    } else {
      // Navigate into folder
      setCurrentPath(folder.path);
      setBreadcrumbTitles(prev => [...prev, folder.title]);
      setInstructions(null);

      loadBrowseContent(folder.path);
    }
  }, [isLeafFolder, loadBrowseContent, loadInstructions, selectedProviderId]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (instructions) {
      // Go back from instructions to folder list
      setInstructions(null);

      const segments = currentPath.split("/").filter(Boolean);
      segments.pop();
      const newPath = segments.length > 0 ? "/" + segments.join("/") : "";
      setCurrentPath(newPath);
      setBreadcrumbTitles(prev => prev.slice(0, -1));
      loadBrowseContent(newPath);
    } else if (currentPath) {
      // Go back one folder level
      const segments = currentPath.split("/").filter(Boolean);
      segments.pop();
      const newPath = segments.length > 0 ? "/" + segments.join("/") : "";
      setCurrentPath(newPath);
      setBreadcrumbTitles(prev => prev.slice(0, -1));
      loadBrowseContent(newPath);
    } else if (mode === "browse" && contentPath) {
      // Go back to associated mode
      setMode("associated");
      setSelectedProviderId(providerId || "lessonschurch");
    }
  }, [instructions, currentPath, mode, contentPath, providerId, loadBrowseContent]);

  // Handle breadcrumb click
  const handleBreadcrumbClick = useCallback((index: number) => {
    setInstructions(null);


    if (index === -1) {
      setCurrentPath("");
      setBreadcrumbTitles([]);
      loadBrowseContent("");
    } else {
      const segments = currentPath.split("/").filter(Boolean);
      const newSegments = segments.slice(0, index + 1);
      const newPath = "/" + newSegments.join("/");
      setCurrentPath(newPath);
      setBreadcrumbTitles(prev => prev.slice(0, index + 1));
      loadBrowseContent(newPath);
    }
  }, [currentPath, loadBrowseContent]);

  // Handle provider change
  const handleProviderChange = useCallback(async (newProviderId: string) => {
    setSelectedProviderId(newProviderId);
    setCurrentPath("");
    setBreadcrumbTitles([]);
    setInstructions(null);

    setCurrentItems([]);
    setCurrentFiles([]);

    // Explicitly load content for the new provider
    const provider = getProvider(newProviderId);
    if (!provider) {
      console.error("Provider not found:", newProviderId);
      return;
    }

    setLoading(true);
    try {
      let items: ContentItem[] = [];

      // For providers that require auth, use the API proxy to avoid CORS issues
      if (ministryId && provider.requiresAuth) {
        items = await ApiHelper.post("/providerProxy/browse", { ministryId, providerId: newProviderId, path: null }, "DoingApi");
      } else {
        // For providers without auth, call directly
        items = await provider.browse(null, null);
      }

      const folders = items.filter((item: ContentItem): item is ContentFolder => item.type === "folder");
      const files = items.filter((item: ContentItem): item is ContentFile => item.type === "file");
      setCurrentItems(folders);
      setCurrentFiles(files);
    } catch (error) {
      console.error("Error loading browse content for provider:", newProviderId, error);
      setCurrentItems([]);
      setCurrentFiles([]);
    } finally {
      setLoading(false);
    }
  }, [ministryId]);

  // Toggle section expansion
  const toggleSectionExpanded = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  }, []);

  // Handle adding a section
  const handleAddSection = useCallback((section: InstructionItem, provId: string, pathIndices: number[]) => {
    const sectionId = section.relatedId || section.id || "";
    const sectionName = section.label || "Section";
    const totalSeconds = section.children?.reduce((sum, action) => sum + (action.seconds || 0), 0) || 0;
    const path = mode === "browse" ? currentPath : contentPath;
    const contentPathStr = generatePath(pathIndices);
    const embedUrl = section.embedUrl;
    onSelect(sectionId, sectionName, totalSeconds, provId, "providerSection", undefined, embedUrl, path, contentPathStr);
    onClose();
  }, [onSelect, onClose, mode, currentPath, contentPath]);

  // Handle adding an action
  const handleAddAction = useCallback((action: InstructionItem, provId: string, pathIndices: number[]) => {
    const actionId = action.relatedId || action.id || "";
    const actionName = action.label || "Action";
    const path = mode === "browse" ? currentPath : contentPath;
    const contentPathStr = generatePath(pathIndices);
    let embedUrl = action.embedUrl;
    if (!embedUrl && action.children && action.children.length > 0) {
      const childWithUrl = action.children.find(child => child.embedUrl);
      if (childWithUrl) {
        embedUrl = childWithUrl.embedUrl;
      }
    }
    onSelect(actionId, actionName, action.seconds, provId, "providerPresentation", undefined, embedUrl, path, contentPathStr);
    onClose();
  }, [onSelect, onClose, mode, currentPath, contentPath]);

  // Handle adding a file
  const handleAddFile = useCallback((file: ContentFile, provId: string, pathIndices?: number[]) => {
    const seconds = file.seconds;
    const embedUrl = file.embedUrl || file.url;
    const path = mode === "browse" ? currentPath : contentPath;
    const contentPathStr = pathIndices ? generatePath(pathIndices) : undefined;
    onSelect(file.id, file.title, seconds, provId, "providerFile", file.image, embedUrl, path, contentPathStr);
    onClose();
  }, [onSelect, onClose, mode, currentPath, contentPath]);

  // Switch to browse mode
  const handleBrowseOther = useCallback(() => {
    setMode("browse");
    setCurrentPath("");
    setBreadcrumbTitles([]);
    setInstructions(null);

  }, []);

  // Reset state on close
  const handleClose = useCallback(() => {
    setMode(contentPath ? "associated" : "browse");
    setSelectedProviderId(providerId || "lessonschurch");
    setCurrentPath("");
    setBreadcrumbTitles([]);
    setInstructions(null);

    setCurrentItems([]);
    setCurrentFiles([]);
    setShowAllProviders(false);
    setExpandedSections(new Set());
    onClose();
  }, [onClose, contentPath, providerId]);

  // Load data on open
  useEffect(() => {
    if (!open) return;

    loadLinkedProviders();

    if (mode === "associated" && contentPath) {
      loadInstructions(contentPath, providerId || "lessonschurch");
    } else if (mode === "browse") {
      loadBrowseContent(currentPath);
    }
  }, [open, mode, contentPath, providerId, currentPath, loadLinkedProviders, loadInstructions, loadBrowseContent]);

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => {
    if (mode === "associated") return [];
    const providerName = currentProviderInfo?.name || selectedProviderId;
    const items: { label: string; onClick?: () => void }[] = [
      { label: providerName, onClick: () => handleBreadcrumbClick(-1) }
    ];
    breadcrumbTitles.forEach((title, index) => {
      items.push({ label: title, onClick: () => handleBreadcrumbClick(index) });
    });
    return items;
  }, [mode, breadcrumbTitles, handleBreadcrumbClick, currentProviderInfo, selectedProviderId]);

  // Associated mode - show instructions from contentPath
  if (mode === "associated" && contentPath) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{Locale.label("plans.actionSelector.selectAction") || "Select Action"}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 1 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {Locale.label("plans.actionSelector.fromAssociatedLesson") || "From associated lesson:"}
                <Typography component="span" sx={{ fontWeight: 600, ml: 1, color: "primary.main" }}>
                  {instructions?.venueName || "Loading..."}
                </Typography>
              </Typography>
              <Button size="small" onClick={handleBrowseOther}>
                {Locale.label("plans.lessonSelector.browseOtherProviders") || "Browse Other Providers"}
              </Button>
            </Stack>
          </Box>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <InstructionTree
              items={instructions?.items || []}
              providerId={providerId || "lessonschurch"}
              expandedSections={expandedSections}
              onToggleExpanded={toggleSectionExpanded}
              onAddSection={handleAddSection}
              onAddAction={handleAddAction}
            />
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
          {(currentPath || (contentPath && mode === "browse")) && (
            <IconButton size="small" onClick={handleBack}>
              <ArrowBackIcon />
            </IconButton>
          )}
          <span>{Locale.label("plans.actionSelector.selectExternalItem") || "Select External Item"}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {/* Provider selector */}
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
                p.id === "lessonschurch" || linkedProviders.some(lp => lp.providerId === p.id)
              )).map((providerInfo) => {
                const isLinked = providerInfo.id === "lessonschurch" || linkedProviders.some(lp => lp.providerId === providerInfo.id);
                return (
                  <Chip
                    key={providerInfo.id}
                    label={providerInfo.name}
                    onClick={() => handleProviderChange(providerInfo.id)}
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
          ) : instructions ? (
            <Box>
              <Box sx={{ py: 1, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  {Locale.label("plans.actionSelector.fromAssociatedLesson") || "From:"}
                  <Typography component="span" sx={{ fontWeight: 600, ml: 1, color: "primary.main" }}>
                    {instructions.venueName || "Content"}
                  </Typography>
                </Typography>
              </Box>
              <InstructionTree
                items={instructions?.items || []}
                providerId={selectedProviderId}
                expandedSections={expandedSections}
                onToggleExpanded={toggleSectionExpanded}
                onAddSection={handleAddSection}
                onAddAction={handleAddAction}
              />
            </Box>
          ) : currentItems.length === 0 && currentFiles.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">No content available</Typography>
            </Box>
          ) : (
            <BrowseGrid
              folders={currentItems}
              files={currentFiles}
              selectedProviderId={selectedProviderId}
              isLeafFolder={isLeafFolder}
              onFolderClick={handleFolderClick}
              onFileClick={handleAddFile}
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
