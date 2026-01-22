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
  ToggleButtonGroup,
  ToggleButton,
  CircularProgress,
  IconButton,
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  Breadcrumbs,
  Link,
  Avatar,
  Chip,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon, Folder as FolderIcon, LinkOff as LinkOffIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { getProvider, getAvailableProviders, type ContentFolder, type ContentProvider } from "@churchapps/content-provider-helper";
import { type ExternalProviderInterface, type ExternalVenueRefInterface, type ContentProviderAuthInterface } from "../../helpers";
import { ContentProviderAuthHelper } from "../../helpers/ContentProviderAuthHelper";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (contentId: string, contentName?: string, externalRef?: ExternalVenueRefInterface, providerId?: string) => void;
  venueId?: string;
  returnVenueName?: boolean;
  ministryId?: string;
  defaultProviderId?: string;
}

export const LessonSelector: React.FC<Props> = ({ open, onClose, onSelect, venueId, returnVenueName, ministryId, defaultProviderId }) => {
  // Provider selection
  const [selectedProviderId, setSelectedProviderId] = useState<string>(defaultProviderId || "lessonschurch");
  const [linkedProviders, setLinkedProviders] = useState<ContentProviderAuthInterface[]>([]);
  const [showAllProviders, setShowAllProviders] = useState(false);

  const provider = useMemo<ContentProvider | null>(() => {
    return getProvider(selectedProviderId);
  }, [selectedProviderId]);

  const availableProviders = useMemo(() => getAvailableProviders(), []);

  // Folder navigation stack
  const [folderStack, setFolderStack] = useState<ContentFolder[]>([]);
  const [currentItems, setCurrentItems] = useState<ContentFolder[]>([]);
  const [loading, setLoading] = useState(false);

  // Selected venue (final selection)
  const [selectedVenue, setSelectedVenue] = useState<ContentFolder | null>(null);

  const [venueInfo, setVenueInfo] = useState<any>(null);

  // External provider state
  const [providerType, setProviderType] = useState<"internal" | "external">("internal");
  const [externalProviders, setExternalProviders] = useState<ExternalProviderInterface[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<ExternalProviderInterface | null>(null);
  const [externalTree, setExternalTree] = useState<any>(null);

  // Check if a folder is a venue (final level)
  const isVenueFolder = useCallback((folder: ContentFolder): boolean => {
    return folder.providerData?.level === "playlist" || !!folder.providerData?.venueId;
  }, []);

  // Load content for a given folder (or root if null)
  const loadContent = useCallback(async (folder: ContentFolder | null) => {
    if (!provider) {
      setCurrentItems([]);
      return;
    }
    setLoading(true);
    try {
      if (providerType === "external" && externalTree) {
        // Navigate external tree
        const items = getExternalFolderContent(folder, externalTree);
        setCurrentItems(items);
      } else {
        // Get auth for providers that require it
        let auth = null;
        if (provider.requiresAuth() && ministryId) {
          auth = await ContentProviderAuthHelper.getValidAuth(ministryId, selectedProviderId);
        }
        // Use provider.browse() with auth
        const items = await provider.browse(folder, auth);
        const folders = items.filter((item): item is ContentFolder => item.type === "folder");
        setCurrentItems(folders);
      }
    } catch (error) {
      console.error("Error loading content:", error);
      setCurrentItems([]);
    } finally {
      setLoading(false);
    }
  }, [provider, providerType, externalTree, ministryId, selectedProviderId]);

  // Extract content from external tree based on folder path
  const getExternalFolderContent = useCallback((folder: ContentFolder | null, tree: any): ContentFolder[] => {
    if (!tree?.programs) return [];

    // Root level - return programs
    if (!folder) {
      return tree.programs.map((p: any) => ({
        type: "folder" as const,
        id: p.id,
        title: p.name,
        image: p.image,
        providerData: { level: "studies", programId: p.id }
      }));
    }

    const level = folder.providerData?.level;

    // Program selected - return studies
    if (level === "studies") {
      const program = tree.programs.find((p: any) => p.id === folder.id);
      return (program?.studies || []).map((s: any) => ({
        type: "folder" as const,
        id: s.id,
        title: s.name,
        image: s.image,
        providerData: { level: "lessons", studyId: s.id, programId: folder.id }
      }));
    }

    // Study selected - return lessons
    if (level === "lessons") {
      for (const program of tree.programs) {
        const study = program.studies?.find((s: any) => s.id === folder.id);
        if (study) {
          return (study.lessons || []).map((l: any) => ({
            type: "folder" as const,
            id: l.id,
            title: l.name,
            image: l.image,
            providerData: { level: "venues", lessonId: l.id, studyId: folder.id, programId: program.id }
          }));
        }
      }
    }

    // Lesson selected - return venues
    if (level === "venues") {
      for (const program of tree.programs) {
        for (const study of program.studies || []) {
          const lesson = study.lessons?.find((l: any) => l.id === folder.id);
          if (lesson) {
            return (lesson.venues || []).map((v: any) => ({
              type: "folder" as const,
              id: v.id,
              title: v.name,
              providerData: { level: "playlist", venueId: v.id, lessonId: folder.id, studyId: study.id, programId: program.id }
            }));
          }
        }
      }
    }

    return [];
  }, []);

  // Handle folder click - either navigate into it or select it (if venue)
  const handleFolderClick = useCallback((folder: ContentFolder) => {
    if (isVenueFolder(folder)) {
      // This is a venue - select it
      setSelectedVenue(folder);
    } else {
      // Navigate into the folder
      setSelectedVenue(null);
      setFolderStack(prev => [...prev, folder]);
      loadContent(folder);
    }
  }, [isVenueFolder, loadContent]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    setSelectedVenue(null);
    if (folderStack.length > 0) {
      const newStack = [...folderStack];
      newStack.pop();
      setFolderStack(newStack);
      if (newStack.length > 0) {
        loadContent(newStack[newStack.length - 1]);
      } else {
        // At root - go to programs level (skip Lessons/Add-Ons tier)
        const lessonsFolder: ContentFolder = {
          type: "folder",
          id: "lessons-root",
          title: "Lessons",
          providerData: { level: "programs" }
        };
        loadContent(lessonsFolder);
      }
    }
  }, [folderStack, loadContent]);

  // Handle breadcrumb click
  const handleBreadcrumbClick = useCallback((index: number) => {
    setSelectedVenue(null);
    if (index < 0) {
      // Root clicked - go to programs level (skip Lessons/Add-Ons tier)
      setFolderStack([]);
      const lessonsFolder: ContentFolder = {
        type: "folder",
        id: "lessons-root",
        title: "Lessons",
        providerData: { level: "programs" }
      };
      loadContent(lessonsFolder);
    } else {
      // Navigate to specific level
      const newStack = folderStack.slice(0, index + 1);
      setFolderStack(newStack);
      loadContent(newStack[newStack.length - 1]);
    }
  }, [folderStack, loadContent]);

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

  // Load external providers (legacy)
  const loadExternalProviders = useCallback(async () => {
    try {
      const providers = await ApiHelper.get("/externalProviders", "LessonsApi");
      setExternalProviders(providers || []);
    } catch (error) {
      console.error("Error loading external providers:", error);
      setExternalProviders([]);
    }
  }, []);

  // Load external tree
  const loadExternalTree = useCallback(async (apiUrl: string) => {
    setLoading(true);
    try {
      const response = await fetch(apiUrl);
      const data = await response.json();
      setExternalTree(data);
      // Load root content from tree
      const items = getExternalFolderContent(null, data);
      setCurrentItems(items);
    } catch (error) {
      console.error("Error loading external tree:", error);
      setExternalTree(null);
      setCurrentItems([]);
    } finally {
      setLoading(false);
    }
  }, [getExternalFolderContent]);

  // Handle provider type change
  const handleProviderTypeChange = useCallback((newType: "internal" | "external") => {
    setProviderType(newType);
    setSelectedProvider(null);
    setExternalTree(null);
    setFolderStack([]);
    setCurrentItems([]);
    setSelectedVenue(null);
    if (newType === "internal") {
      // Go to programs level (skip Lessons/Add-Ons tier)
      const lessonsFolder: ContentFolder = {
        type: "folder",
        id: "lessons-root",
        title: "Lessons",
        providerData: { level: "programs" }
      };
      loadContent(lessonsFolder);
    }
  }, [loadContent]);

  // Handle content provider selection change
  const handleContentProviderChange = useCallback((providerId: string) => {
    setSelectedProviderId(providerId);
    setFolderStack([]);
    setCurrentItems([]);
    setSelectedVenue(null);
    // Content will reload via useEffect when provider changes
  }, []);

  // Handle external provider change (legacy)
  const handleProviderChange = useCallback((providerId: string) => {
    const providerData = externalProviders.find(p => p.id === providerId);
    setSelectedProvider(providerData || null);
    setFolderStack([]);
    setCurrentItems([]);
    setSelectedVenue(null);
    if (providerData?.apiUrl) {
      loadExternalTree(providerData.apiUrl);
    }
  }, [externalProviders, loadExternalTree]);

  // Build external venue reference from folder stack
  const buildExternalRef = useCallback((): ExternalVenueRefInterface | null => {
    if (!selectedProvider || !selectedVenue) return null;

    // Get IDs from the folder stack and selected venue
    let programId = "";
    let studyId = "";
    let lessonId = "";

    for (const folder of folderStack) {
      if (folder.providerData?.level === "studies") programId = folder.id;
      else if (folder.providerData?.level === "lessons") studyId = folder.id;
      else if (folder.providerData?.level === "venues") lessonId = folder.id;
    }

    // Also check the venue's providerData for parent IDs
    if (selectedVenue.providerData) {
      programId = programId || (selectedVenue.providerData.programId as string) || "";
      studyId = studyId || (selectedVenue.providerData.studyId as string) || "";
      lessonId = lessonId || (selectedVenue.providerData.lessonId as string) || "";
    }

    return {
      externalProviderId: selectedProvider.id!,
      programId,
      studyId,
      lessonId,
      venueId: selectedVenue.id
    };
  }, [selectedProvider, selectedVenue, folderStack]);

  // Handle final selection
  const handleSelect = useCallback(() => {
    if (venueId) {
      onSelect(venueId, venueInfo?.name, undefined, selectedProviderId);
      onClose();
    } else if (selectedVenue) {
      const venueName = returnVenueName ? selectedVenue.title : undefined;

      if (providerType === "external") {
        const externalRef = buildExternalRef();
        onSelect(selectedVenue.id, venueName, externalRef || undefined, selectedProviderId);
      } else {
        onSelect(selectedVenue.id, venueName, undefined, selectedProviderId);
      }
      onClose();
    }
  }, [venueId, venueInfo, selectedVenue, returnVenueName, onSelect, onClose, providerType, buildExternalRef, selectedProviderId]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    setFolderStack([]);
    setCurrentItems([]);
    setSelectedVenue(null);
    setVenueInfo(null);
    setProviderType("internal");
    setSelectedProvider(null);
    setExternalTree(null);
    setShowAllProviders(false);
    if (defaultProviderId) {
      setSelectedProviderId(defaultProviderId);
    }
    onClose();
  }, [onClose, defaultProviderId]);

  // Load initial content when dialog opens
  useEffect(() => {
    if (open) {
      if (venueId) {
        // If venueId is provided, just load venue info
        ApiHelper.getAnonymous("/venues/public/" + venueId, "LessonsApi")
          .then((data: unknown) => setVenueInfo(data))
          .catch((error: unknown) => console.error("Error loading venue info:", error));
      } else {
        // Start directly at root level for the provider
        loadContent(null);
      }
      loadExternalProviders();
      loadLinkedProviders();
    }
  }, [open, venueId, loadContent, loadExternalProviders, loadLinkedProviders]);

  // Reload content when provider changes
  useEffect(() => {
    if (open && !venueId && provider) {
      loadContent(null);
    }
  }, [open, venueId, provider, selectedProviderId]);

  // Get current provider info
  const currentProviderInfo = useMemo(() => {
    return availableProviders.find(p => p.id === selectedProviderId);
  }, [availableProviders, selectedProviderId]);

  // Check if current provider is linked
  const isCurrentProviderLinked = useMemo(() => {
    // Lessons.church doesn't require auth
    if (selectedProviderId === "lessonschurch") return true;
    return linkedProviders.some(lp => lp.providerId === selectedProviderId);
  }, [linkedProviders, selectedProviderId]);

  // Build breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const providerName = currentProviderInfo?.name || selectedProviderId;
    const items: { label: string; onClick?: () => void }[] = [
      { label: providerType === "external" ? (selectedProvider?.name || "External") : providerName, onClick: () => handleBreadcrumbClick(-1) }
    ];
    folderStack.forEach((folder, index) => {
      items.push({ label: folder.title, onClick: () => handleBreadcrumbClick(index) });
    });
    return items;
  }, [folderStack, providerType, selectedProvider, handleBreadcrumbClick, currentProviderInfo, selectedProviderId]);

  // If venueId is provided, show simplified view
  if (venueId) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{Locale.label("plans.lessonSelector.addFromLesson") || "Add from Associated Lesson"}</DialogTitle>
        <DialogContent>
          <Box sx={{ py: 2 }}>
            <Typography variant="body1">
              {Locale.label("plans.lessonSelector.usingAssociatedLesson") || "Using associated lesson:"}
            </Typography>
            <Typography variant="h6" sx={{ mt: 1, color: "primary.main" }}>
              {venueInfo?.name || "Loading..."}
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
          <Button onClick={handleSelect} disabled={!venueInfo} variant="contained">
            {Locale.label("plans.lessonSelector.addLesson") || "Add Lesson"}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          {folderStack.length > 0 && (
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
                p.id === "lessonschurch" || linkedProviders.some(lp => lp.providerId === p.id)
              )).map((providerInfo) => {
                const isLinked = providerInfo.id === "lessonschurch" || linkedProviders.some(lp => lp.providerId === providerInfo.id);
                return (
                  <Chip
                    key={providerInfo.id}
                    avatar={providerInfo.logo ? <Avatar src={providerInfo.logo} /> : undefined}
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

          {/* Legacy provider type toggle - hidden for now */}
          {/* TODO: Re-enable external providers when ready */}
          {false && externalProviders.length > 0 && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>{Locale.label("plans.lessonSelector.lessonSource") || "Lesson Source"}</Typography>
              <ToggleButtonGroup
                value={providerType}
                exclusive
                onChange={(_, value) => value && handleProviderTypeChange(value)}
                size="small"
              >
                <ToggleButton value="internal">{Locale.label("plans.lessonSelector.lessonsChurch") || "Lessons.church"}</ToggleButton>
                <ToggleButton value="external">{Locale.label("plans.lessonSelector.externalProvider") || "External Provider"}</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          )}

          {/* External provider selector - hidden for now */}
          {false && providerType === "external" && (
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              {externalProviders.map((providerItem) => (
                <Button
                  key={providerItem.id}
                  variant={selectedProvider?.id === providerItem.id ? "contained" : "outlined"}
                  onClick={() => handleProviderChange(providerItem.id!)}
                  size="small"
                >
                  {providerItem.name}
                </Button>
              ))}
            </Box>
          )}

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
              <Typography color="text.secondary">
                {providerType === "external" && !selectedProvider
                  ? "Select a provider to browse content"
                  : "No content available"}
              </Typography>
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
                const isVenue = isVenueFolder(folder);
                const isSelected = selectedVenue?.id === folder.id;
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
                            bgcolor: isVenue ? "primary.light" : "grey.200"
                          }}
                        >
                          <FolderIcon sx={{ fontSize: 40, color: isVenue ? "primary.contrastText" : "grey.500" }} />
                        </Box>
                      )}
                      <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                        <Typography
                          variant="body2"
                          noWrap
                          title={folder.title}
                          sx={{ fontWeight: isVenue ? 600 : 400 }}
                        >
                          {folder.title}
                        </Typography>
                        {isVenue && (
                          <Typography variant="caption" color="primary">
                            Venue
                          </Typography>
                        )}
                      </CardContent>
                    </CardActionArea>
                  </Card>
                );
              })}
            </Box>
          )}

          {/* Selected venue indicator */}
          {selectedVenue && (
            <Box sx={{ p: 2, bgcolor: "action.hover", borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary">Selected:</Typography>
              <Typography variant="subtitle1" color="primary">{selectedVenue.title}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
        <Button onClick={handleSelect} disabled={!selectedVenue} variant="contained">
          {Locale.label("plans.lessonSelector.associateLesson")}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
