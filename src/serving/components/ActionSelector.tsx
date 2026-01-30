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
  Card,
  CardActionArea,
  CardMedia,
  CardContent,
  Breadcrumbs,
  Link,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon, LinkOff as LinkOffIcon, Folder as FolderIcon, PlayArrow as PlayArrowIcon, ExpandMore as ExpandMoreIcon, ChevronRight as ChevronRightIcon, Add as AddIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { getProvider, getAvailableProviders, type ContentFolder, type ContentFile, type Instructions, type InstructionItem, type IProvider } from "@churchapps/content-provider-helper";
import { type ContentProviderAuthInterface } from "../../helpers";
import { ContentProviderAuthHelper } from "../../helpers/ContentProviderAuthHelper";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (actionId: string, actionName: string, seconds?: number, providerId?: string, itemType?: "providerSection" | "providerPresentation" | "providerFile", image?: string, mediaUrl?: string) => void;
  /** Full content path for the associated content (e.g., /lessons/program-1/study-1/lesson-1/venue-1) */
  contentPath?: string;
  /** Provider ID for the associated content */
  providerId?: string;
  /** Ministry ID for auth */
  ministryId?: string;
}

// Helper to get instructions from provider based on its capabilities
async function getProviderInstructions(provider: IProvider, path: string, auth?: any): Promise<Instructions | null> {
  const capabilities = provider.capabilities;
  if (capabilities.instructions && provider.getInstructions) {
    return provider.getInstructions(path, auth);
  }
  if (capabilities.expandedInstructions && provider.getExpandedInstructions) {
    return provider.getExpandedInstructions(path, auth);
  }
  return null;
}

// Extract sections from instructions that contain actions
function extractSections(instructions: Instructions): InstructionItem[] {
  let sectionItems: InstructionItem[] = [];

  // Structure: items (headers) -> children (sections) -> children (actions)
  for (const item of instructions.items) {
    if (item.children) {
      for (const child of item.children) {
        if (child.children && child.children.length > 0) {
          const hasActionChildren = child.children.some(gc =>
            gc.itemType === 'action' || gc.itemType === 'lessonAction' || gc.itemType === 'providerPresentation' ||
            !gc.children || gc.children.length === 0 || gc.children.every(c => c.itemType === 'file')
          );
          if (hasActionChildren) {
            sectionItems.push(child);
          }
        }
      }
    }
  }

  // Fallback: items themselves as sections
  if (sectionItems.length === 0) {
    sectionItems = instructions.items.filter(item =>
      item.children && item.children.length > 0 &&
      item.children.some(c =>
        c.itemType === 'action' || c.itemType === 'lessonAction' || c.itemType === 'providerPresentation' ||
        !c.children || c.children.length === 0 || c.children.every(gc => gc.itemType === 'file')
      )
    );
  }

  return sectionItems;
}

export const ActionSelector: React.FC<Props> = ({ open, onClose, onSelect, contentPath, providerId, ministryId }) => {
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
  const [sections, setSections] = useState<InstructionItem[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  // Mode: "associated" shows actions from contentPath, "browse" allows navigation
  const [mode, setMode] = useState<"associated" | "browse">(contentPath ? "associated" : "browse");

  const availableProviders = useMemo(() => getAvailableProviders(), []);

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
      let auth = null;
      if (ministryId) {
        auth = await ContentProviderAuthHelper.getValidAuth(ministryId, provId);
      }
      const result = await getProviderInstructions(provider, path, auth);

      if (result) {
        setInstructions(result);
        setSections(extractSections(result));
      } else {
        setInstructions(null);
        setSections([]);
      }
    } catch (error) {
      console.error("Error loading instructions:", error);
      setInstructions(null);
      setSections([]);
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
      let auth = null;
      if (ministryId) {
        auth = await ContentProviderAuthHelper.getValidAuth(ministryId, selectedProviderId);
      }
      const items = await provider.browse(path || null, auth);
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
    if (!capabilities.instructions && !capabilities.expandedInstructions) return false;
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
      setSections([]);
      loadBrowseContent(folder.path);
    }
  }, [isLeafFolder, loadBrowseContent, loadInstructions, selectedProviderId]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (instructions) {
      // Go back from instructions to folder list
      setInstructions(null);
      setSections([]);
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
    setSections([]);

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
  const handleProviderChange = useCallback((newProviderId: string) => {
    setSelectedProviderId(newProviderId);
    setCurrentPath("");
    setBreadcrumbTitles([]);
    setInstructions(null);
    setSections([]);
    setCurrentItems([]);
    setCurrentFiles([]);
  }, []);

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
  const handleAddSection = useCallback((section: InstructionItem, provId: string) => {
    const sectionId = section.relatedId || section.id || "";
    const sectionName = section.label || "Section";
    const totalSeconds = section.children?.reduce((sum, action) => sum + (action.seconds || 0), 0) || 0;
    onSelect(sectionId, sectionName, totalSeconds, provId, "providerSection");
    onClose();
  }, [onSelect, onClose]);

  // Handle adding an action
  const handleAddAction = useCallback((action: InstructionItem, provId: string) => {
    const actionId = action.relatedId || action.id || "";
    const actionName = action.label || "Action";
    onSelect(actionId, actionName, action.seconds, provId, "providerPresentation");
    onClose();
  }, [onSelect, onClose]);

  // Handle adding a file
  const handleAddFile = useCallback((file: ContentFile, provId: string) => {
    const seconds = file.providerData?.seconds as number | undefined;
    const embedUrl = file.embedUrl || file.url;
    onSelect(file.id, file.title, seconds, provId, "providerFile", file.image, embedUrl);
    onClose();
  }, [onSelect, onClose]);

  // Switch to browse mode
  const handleBrowseOther = useCallback(() => {
    setMode("browse");
    setCurrentPath("");
    setBreadcrumbTitles([]);
    setInstructions(null);
    setSections([]);
  }, []);

  // Reset state on close
  const handleClose = useCallback(() => {
    setMode(contentPath ? "associated" : "browse");
    setSelectedProviderId(providerId || "lessonschurch");
    setCurrentPath("");
    setBreadcrumbTitles([]);
    setInstructions(null);
    setSections([]);
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

  // Render sections tree
  const renderSectionsTree = (sectionList: InstructionItem[], provId: string) => (
    <Box sx={{ maxHeight: "400px", overflowY: "auto" }}>
      {sectionList.length === 0 ? (
        <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
          {Locale.label("plans.actionSelector.noActionsAvailable") || "No actions available"}
        </Typography>
      ) : (
        sectionList.map((section) => {
          const sectionId = section.relatedId || section.id || "";
          const isExpanded = expandedSections.has(sectionId);
          return (
            <Box key={sectionId} sx={{ mb: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  py: 1,
                  px: 1,
                  borderRadius: 1,
                  bgcolor: "grey.100",
                  "&:hover": { bgcolor: "grey.200" }
                }}
              >
                <IconButton size="small" onClick={() => toggleSectionExpanded(sectionId)} sx={{ mr: 1 }}>
                  {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                </IconButton>
                <Typography sx={{ flex: 1, fontWeight: 500 }}>{section.label}</Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => handleAddSection(section, provId)}
                  sx={{ ml: 1 }}
                >
                  {Locale.label("plans.actionSelector.addSection") || "Add Section"}
                </Button>
              </Box>
              {isExpanded && section.children && (
                <Box sx={{ pl: 4 }}>
                  {section.children.map((action) => {
                    const actionId = action.relatedId || action.id || "";
                    return (
                      <Box
                        key={actionId}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          py: 0.75,
                          px: 1,
                          borderRadius: 1,
                          "&:hover": { bgcolor: "action.hover" }
                        }}
                      >
                        <PlayArrowIcon sx={{ mr: 1, fontSize: 18, color: "primary.main" }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2">{action.label}</Typography>
                          {action.description && (
                            <Typography variant="caption" color="text.secondary">
                              {action.description}
                              {action.seconds ? ` - ${Math.round(action.seconds / 60)}min` : ""}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleAddAction(action, provId)}
                          title={Locale.label("plans.actionSelector.addAction") || "Add Action"}
                        >
                          <AddIcon />
                        </IconButton>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
          );
        })
      )}
    </Box>
  );

  // Render folder/file grid
  const renderBrowseGrid = () => (
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
        return (
          <Card key={`folder-${folder.id}`} sx={{ border: 1, borderColor: "divider" }}>
            <CardActionArea onClick={() => handleFolderClick(folder)}>
              {folder.image ? (
                <CardMedia component="img" height="80" image={folder.image} alt={folder.title} sx={{ objectFit: "cover" }} />
              ) : (
                <Box sx={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: isLeaf ? "primary.light" : "grey.200" }}>
                  {isLeaf ? <PlayArrowIcon sx={{ fontSize: 40, color: "primary.contrastText" }} /> : <FolderIcon sx={{ fontSize: 40, color: "grey.500" }} />}
                </Box>
              )}
              <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                <Typography variant="body2" noWrap title={folder.title} sx={{ fontWeight: isLeaf ? 600 : 400 }}>
                  {folder.title}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        );
      })}
      {currentFiles.map((file) => (
        <Card key={`file-${file.id}`} sx={{ border: 1, borderColor: "divider" }}>
          <CardActionArea onClick={() => handleAddFile(file, selectedProviderId)}>
            {file.image ? (
              <CardMedia component="img" height="80" image={file.image} alt={file.title} sx={{ objectFit: "cover" }} />
            ) : (
              <Box sx={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "secondary.light" }}>
                <AddIcon sx={{ fontSize: 40, color: "secondary.contrastText" }} />
              </Box>
            )}
            <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
              <Typography variant="body2" noWrap title={file.title}>{file.title}</Typography>
              <Typography variant="caption" color="secondary">Add-On</Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );

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
            renderSectionsTree(sections, providerId || "lessonschurch")
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
              {renderSectionsTree(sections, selectedProviderId)}
            </Box>
          ) : currentItems.length === 0 && currentFiles.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">No content available</Typography>
            </Box>
          ) : (
            renderBrowseGrid()
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
      </DialogActions>
    </Dialog>
  );
};
