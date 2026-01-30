import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
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
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { getProvider, getAvailableProviders, type ContentFolder, type ContentFile, type Instructions, type InstructionItem, type ContentProvider } from "@churchapps/content-provider-helper";
import { type LessonActionTreeInterface } from "./PlanUtils";
import { type ExternalVenueRefInterface, type ContentProviderAuthInterface } from "../../helpers";
import { ContentProviderAuthHelper } from "../../helpers/ContentProviderAuthHelper";

interface Props {
  open: boolean;
  onClose: () => void;
  onSelect: (actionId: string, actionName: string, seconds?: number, providerId?: string, itemType?: "providerSection" | "providerPresentation" | "providerFile", image?: string, mediaUrl?: string) => void;
  venueId?: string;
  externalRef?: ExternalVenueRefInterface;
  providerId?: string;
  ministryId?: string;
}

// Helper to create a venue folder for the provider
function createVenueFolder(venueId: string): ContentFolder {
  return {
    type: "folder",
    id: venueId,
    title: "",
    isLeaf: true,
    providerData: { level: "playlist", venueId }
  };
}

export const ActionSelector: React.FC<Props> = ({ open, onClose, onSelect, venueId, externalRef, providerId, ministryId }) => {
  // Browse mode: "associated" uses the associated lesson, "browse" allows browsing other providers
  const [browseMode, setBrowseMode] = useState<"associated" | "browse">("associated");
  const [selectedProviderId, setSelectedProviderId] = useState<string>(providerId || "lessonschurch");
  const [linkedProviders, setLinkedProviders] = useState<ContentProviderAuthInterface[]>([]);
  const [showAllProviders, setShowAllProviders] = useState(false);

  const provider = useMemo<ContentProvider | null>(() => {
    const pid = browseMode === "associated" ? (providerId || "lessonschurch") : selectedProviderId;
    return getProvider(pid);
  }, [providerId, selectedProviderId, browseMode]);

  const availableProviders = useMemo(() => getAvailableProviders(), []);

  const [actionTree, setActionTree] = useState<LessonActionTreeInterface>({});
  const [selectedProgram, setSelectedProgram] = useState<string>("");
  const [selectedStudy, setSelectedStudy] = useState<string>("");
  const [selectedLesson, setSelectedLesson] = useState<string>("");
  const [selectedVenue, setSelectedVenue] = useState<string>("");
  const [selectedSection, setSelectedSection] = useState<string>("");
  const [selectedAction, setSelectedAction] = useState<string>("");

  // For venue-specific mode using ContentProviderHelper
  const [instructions, setInstructions] = useState<Instructions | null>(null);
  const [sections, setSections] = useState<InstructionItem[]>([]);

  // For browse mode - folder navigation
  const [folderStack, setFolderStack] = useState<ContentFolder[]>([]);
  const [currentItems, setCurrentItems] = useState<ContentFolder[]>([]);
  const [currentFiles, setCurrentFiles] = useState<ContentFile[]>([]);
  const [browseLoading, setBrowseLoading] = useState(false);
  const [browseVenueId, setBrowseVenueId] = useState<string | null>(null);
  const [browseInstructions, setBrowseInstructions] = useState<Instructions | null>(null);
  const [browseSections, setBrowseSections] = useState<InstructionItem[]>([]);
  const [browseSelectedSection, setBrowseSelectedSection] = useState<string>("");
  const [browseSelectedAction, setBrowseSelectedAction] = useState<string>("");

  // Track expanded sections in tree view
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const loadVenueActions = useCallback(async () => {
    if (!venueId || !provider) return;

    try {
      if (externalRef) {
        // For external providers, still use the API endpoint
        const data = await ApiHelper.getAnonymous(
          `/externalProviders/${externalRef.externalProviderId}/venue/${externalRef.venueId}/actions`,
          "LessonsApi"
        );
        // Convert to Instructions format
        const instructionItems: InstructionItem[] = (data?.sections || []).map((s: any) => ({
          id: s.id,
          label: s.name,
          itemType: "providerSection",
          relatedId: s.id,
          children: s.actions?.map((a: any) => ({
            id: a.id,
            label: a.name,
            description: a.actionType,
            seconds: a.seconds,
            itemType: "providerPresentation",
            relatedId: a.id
          }))
        }));
        setInstructions({ venueName: data?.venueName, items: instructionItems });
        setSections(instructionItems);

        // Auto-select first section and action
        if (instructionItems.length > 0) {
          setSelectedSection(instructionItems[0].id || "");
          if (instructionItems[0].children?.length) {
            setSelectedAction(instructionItems[0].children[0].id || "");
          }
        }
      } else {
        // Use ContentProviderHelper for internal venues
        const venueFolder = createVenueFolder(venueId);
        const result = await provider.getExpandedInstructions(venueFolder);

        if (result) {
          setInstructions(result);
          // Extract sections that have children (actions)
          const sectionItems = result.items.flatMap(item =>
            item.children?.filter(child => child.children && child.children.length > 0) || []
          );
          setSections(sectionItems);

          // Auto-select first section and action
          if (sectionItems.length > 0) {
            setSelectedSection(sectionItems[0].relatedId || sectionItems[0].id || "");
            if (sectionItems[0].children?.length) {
              setSelectedAction(sectionItems[0].children[0].relatedId || sectionItems[0].children[0].id || "");
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading venue actions:", error);
      setInstructions(null);
      setSections([]);
    }
  }, [venueId, externalRef, provider]);

  const loadActionTree = useCallback(async () => {
    // If venueId is provided, load actions for that venue only
    if (venueId) {
      loadVenueActions();
      return;
    }

    // For full tree browsing, keep using the API (out of scope for this refactor)
    try {
      const data = await ApiHelper.getAnonymous("/lessons/public/actionTree", "LessonsApi");
      setActionTree(data || {});

      // Auto-select defaults
      if (data?.programs?.length > 0) {
        const firstProgram = data.programs[0];
        setSelectedProgram(firstProgram.id);

        if (firstProgram.studies?.length > 0) {
          const firstStudy = firstProgram.studies[0];
          setSelectedStudy(firstStudy.id);

          if (firstStudy.lessons?.length > 0) {
            const firstLesson = firstStudy.lessons[0];
            setSelectedLesson(firstLesson.id);

            if (firstLesson.venues?.length > 0) {
              const firstVenue = firstLesson.venues[0];
              setSelectedVenue(firstVenue.id);

              if (firstVenue.sections?.length > 0) {
                const firstSection = firstVenue.sections[0];
                setSelectedSection(firstSection.id);

                if (firstSection.actions?.length > 0) {
                  setSelectedAction(firstSection.actions[0].id);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error loading action tree:", error);
      setActionTree({});
    }
  }, [venueId, loadVenueActions]);

  const getCurrentProgram = useCallback(() => {
    return actionTree?.programs?.find((p: any) => p.id === selectedProgram);
  }, [actionTree, selectedProgram]);

  const getCurrentStudy = useCallback(() => {
    const program = getCurrentProgram();
    return program?.studies?.find((s: any) => s.id === selectedStudy);
  }, [getCurrentProgram, selectedStudy]);

  const getCurrentLesson = useCallback(() => {
    const study = getCurrentStudy();
    return study?.lessons?.find((l: any) => l.id === selectedLesson);
  }, [getCurrentStudy, selectedLesson]);

  const getCurrentVenue = useCallback(() => {
    const lesson = getCurrentLesson();
    return lesson?.venues?.find((v: any) => v.id === selectedVenue);
  }, [getCurrentLesson, selectedVenue]);

  const getCurrentSection = useCallback(() => {
    const venue = getCurrentVenue();
    return venue?.sections?.find((s: any) => s.id === selectedSection);
  }, [getCurrentVenue, selectedSection]);

  const getCurrentVenueSection = useCallback(() => {
    return sections.find(s => (s.relatedId || s.id) === selectedSection);
  }, [sections, selectedSection]);

  const handleProgramChange = useCallback((programId: string) => {
    setSelectedProgram(programId);
    setSelectedStudy("");
    setSelectedLesson("");
    setSelectedVenue("");
    setSelectedSection("");
    setSelectedAction("");
  }, []);

  const handleStudyChange = useCallback((studyId: string) => {
    setSelectedStudy(studyId);
    setSelectedLesson("");
    setSelectedVenue("");
    setSelectedSection("");
    setSelectedAction("");
  }, []);

  const handleLessonChange = useCallback((lessonId: string) => {
    setSelectedLesson(lessonId);
    setSelectedVenue("");
    setSelectedSection("");
    setSelectedAction("");
  }, []);

  const handleVenueChange = useCallback((newVenueId: string) => {
    setSelectedVenue(newVenueId);
    setSelectedSection("");
    setSelectedAction("");
  }, []);

  const handleSectionChange = useCallback((sectionId: string) => {
    setSelectedSection(sectionId);
    setSelectedAction("");
  }, []);

  const handleActionChange = useCallback((actionId: string) => {
    setSelectedAction(actionId);
  }, []);

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

  // Handle content provider selection change (in browse mode)
  const handleContentProviderChange = useCallback((newProviderId: string) => {
    setSelectedProviderId(newProviderId);
    setSelectedProgram("");
    setSelectedStudy("");
    setSelectedLesson("");
    setSelectedVenue("");
    setSelectedSection("");
    setSelectedAction("");
    setInstructions(null);
    setSections([]);
    // Reset browse folder state
    setFolderStack([]);
    setCurrentItems([]);
    setCurrentFiles([]);
    setBrowseVenueId(null);
    setBrowseInstructions(null);
    setBrowseSections([]);
    setBrowseSelectedSection("");
    setBrowseSelectedAction("");
  }, []);

  // Check if a folder is a venue (final level for browsing)
  // Only treat as venue if the provider supports instructions/expandedInstructions
  const isVenueFolder = useCallback((folder: ContentFolder): boolean => {
    const browseProvider = getProvider(selectedProviderId);
    if (!browseProvider) return false;

    const capabilities = browseProvider.getCapabilities();
    // Only treat as venue if provider supports instructions - otherwise continue browsing
    if (!capabilities.instructions && !capabilities.expandedInstructions) return false;

    return !!folder.isLeaf;
  }, [selectedProviderId]);

  // Load content for browse mode
  const loadBrowseContent = useCallback(async (folder: ContentFolder | null) => {
    const browseProvider = getProvider(selectedProviderId);
    if (!browseProvider) {
      setCurrentItems([]);
      setCurrentFiles([]);
      return;
    }
    setBrowseLoading(true);
    try {
      // Get auth for providers that require it
      let auth = null;
      if (ministryId) {
        auth = await ContentProviderAuthHelper.getValidAuth(ministryId, selectedProviderId);
      }
      const items = await browseProvider.browse(folder, auth);
      const folders = items.filter((item): item is ContentFolder => item.type === "folder");
      const files = items.filter((item): item is ContentFile => item.type === "file");
      setCurrentItems(folders);
      setCurrentFiles(files);
    } catch (error) {
      console.error("Error loading browse content:", error);
      setCurrentItems([]);
      setCurrentFiles([]);
    } finally {
      setBrowseLoading(false);
    }
  }, [selectedProviderId, ministryId]);

  // Load actions for a selected venue in browse mode
  const loadBrowseVenueActions = useCallback(async (venueIdToLoad: string) => {
    const browseProvider = getProvider(selectedProviderId);
    if (!browseProvider) return;

    setBrowseLoading(true);
    try {
      // Get auth for providers that require it
      let auth = null;
      if (ministryId) {
        auth = await ContentProviderAuthHelper.getValidAuth(ministryId, selectedProviderId);
      }
      const venueFolder = createVenueFolder(venueIdToLoad);
      const result = await browseProvider.getExpandedInstructions(venueFolder, auth);

      if (result) {
        setBrowseInstructions(result);
        // Extract sections that have children (actions)
        const sectionItems = result.items.flatMap(item =>
          item.children?.filter(child => child.children && child.children.length > 0) || []
        );
        setBrowseSections(sectionItems);

        // Auto-select first section and action
        if (sectionItems.length > 0) {
          setBrowseSelectedSection(sectionItems[0].relatedId || sectionItems[0].id || "");
          if (sectionItems[0].children?.length) {
            setBrowseSelectedAction(sectionItems[0].children[0].relatedId || sectionItems[0].children[0].id || "");
          }
        }
      }
    } catch (error) {
      console.error("Error loading browse venue actions:", error);
      setBrowseInstructions(null);
      setBrowseSections([]);
    } finally {
      setBrowseLoading(false);
    }
  }, [selectedProviderId, ministryId]);

  // Handle folder click in browse mode
  const handleBrowseFolderClick = useCallback((folder: ContentFolder) => {
    if (isVenueFolder(folder)) {
      // This is a venue - load its actions
      setBrowseVenueId(folder.id);
      setFolderStack([...folderStack, folder]);
      loadBrowseVenueActions(folder.id);
    } else {
      // Navigate into the folder
      setFolderStack([...folderStack, folder]);
      loadBrowseContent(folder);
    }
  }, [folderStack, isVenueFolder, loadBrowseContent, loadBrowseVenueActions]);

  // Handle back in browse mode
  const handleBrowseBack = useCallback(() => {
    if (browseVenueId) {
      // Go back from venue actions to folder list
      setBrowseVenueId(null);
      setBrowseInstructions(null);
      setBrowseSections([]);
      setBrowseSelectedSection("");
      setBrowseSelectedAction("");
      const newStack = folderStack.slice(0, -1);
      setFolderStack(newStack);
      loadBrowseContent(newStack.length > 0 ? newStack[newStack.length - 1] : null);
    } else if (folderStack.length > 0) {
      const newStack = folderStack.slice(0, -1);
      setFolderStack(newStack);
      loadBrowseContent(newStack.length > 0 ? newStack[newStack.length - 1] : null);
    }
  }, [browseVenueId, folderStack, loadBrowseContent]);

  // Handle breadcrumb click in browse mode
  const handleBrowseBreadcrumbClick = useCallback((index: number) => {
    // Reset venue state if we're navigating back
    setBrowseVenueId(null);
    setBrowseInstructions(null);
    setBrowseSections([]);
    setBrowseSelectedSection("");
    setBrowseSelectedAction("");

    if (index === -1) {
      // Root
      setFolderStack([]);
      loadBrowseContent(null);
    } else {
      const newStack = folderStack.slice(0, index + 1);
      setFolderStack(newStack);
      loadBrowseContent(newStack[newStack.length - 1]);
    }
  }, [folderStack, loadBrowseContent]);

  // Get current browse section
  const getCurrentBrowseSection = useCallback(() => {
    return browseSections.find(s => (s.relatedId || s.id) === browseSelectedSection);
  }, [browseSections, browseSelectedSection]);

  // Toggle section expansion in tree view
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

  // Handle adding a section (all actions in that section)
  const handleAddSection = useCallback((section: InstructionItem, providerId: string) => {
    const sectionId = section.relatedId || section.id || "";
    const sectionName = section.label || "Section";
    // Calculate total seconds from all actions in this section
    const totalSeconds = section.children?.reduce((sum, action) => sum + (action.seconds || 0), 0) || 0;
    onSelect(sectionId, sectionName, totalSeconds, providerId, "providerSection");
    onClose();
  }, [onSelect, onClose]);

  // Handle adding an individual action
  const handleAddAction = useCallback((action: InstructionItem, providerId: string) => {
    const actionId = action.relatedId || action.id || "";
    const actionName = action.label || "Action";
    onSelect(actionId, actionName, action.seconds, providerId, "providerPresentation");
    onClose();
  }, [onSelect, onClose]);

  // Handle adding a file (add-on)
  const handleAddFile = useCallback((file: ContentFile, providerId: string) => {
    const seconds = file.providerData?.seconds as number | undefined;
    const embedUrl = file.embedUrl || file.url;
    onSelect(file.id, file.title, seconds, providerId, "providerFile", file.image, embedUrl);
    onClose();
  }, [onSelect, onClose]);

  // Switch to browse mode
  const handleBrowseOther = useCallback(() => {
    setBrowseMode("browse");
    setSelectedSection("");
    setSelectedAction("");
    setInstructions(null);
    setSections([]);
    // Initialize browse folder state
    setFolderStack([]);
    setCurrentItems([]);
    setCurrentFiles([]);
    setBrowseVenueId(null);
    setBrowseInstructions(null);
    setBrowseSections([]);
    setBrowseSelectedSection("");
    setBrowseSelectedAction("");
  }, []);

  // Go back to associated lesson mode
  const handleBackToAssociated = useCallback(() => {
    setBrowseMode("associated");
    setSelectedProviderId(providerId || "lessonschurch");
    setSelectedProgram("");
    setSelectedStudy("");
    setSelectedLesson("");
    setSelectedVenue("");
    setSelectedSection("");
    setSelectedAction("");
    setInstructions(null);
    setSections([]);
    setShowAllProviders(false);
    // Reset browse folder state
    setFolderStack([]);
    setCurrentItems([]);
    setCurrentFiles([]);
    setBrowseVenueId(null);
    setBrowseInstructions(null);
    setBrowseSections([]);
    setBrowseSelectedSection("");
    setBrowseSelectedAction("");
  }, [providerId]);

  const handleSelect = useCallback(() => {
    if (browseMode === "browse" && browseSelectedAction) {
      // Browse mode - use browse state
      const section = getCurrentBrowseSection();
      const action = section?.children?.find(a => (a.relatedId || a.id) === browseSelectedAction);
      const actionName = action?.label || "Action";
      const actionSeconds = action?.seconds;
      onSelect(browseSelectedAction, actionName, actionSeconds, selectedProviderId);
      onClose();
    } else if (selectedAction) {
      let actionName = "Action";
      let actionSeconds: number | undefined;

      if (venueId && browseMode === "associated") {
        // Find action from sections (Instructions format) - associated lesson mode
        const section = getCurrentVenueSection();
        const action = section?.children?.find(a => (a.relatedId || a.id) === selectedAction);
        actionName = action?.label || "Action";
        actionSeconds = action?.seconds;
      } else {
        // Find action from tree - browse mode or no venueId
        const section = getCurrentSection();
        const action = section?.actions?.find((a: any) => a.id === selectedAction);
        actionName = action?.name || "Action";
        actionSeconds = action?.seconds;
      }

      // Determine which provider ID to pass
      const resultProviderId = browseMode === "browse" ? selectedProviderId : (providerId || "lessonschurch");
      onSelect(selectedAction, actionName, actionSeconds, resultProviderId);
      onClose();
    }
  }, [selectedAction, browseSelectedAction, venueId, browseMode, getCurrentVenueSection, getCurrentSection, getCurrentBrowseSection, onSelect, onClose, providerId, selectedProviderId]);

  const handleClose = useCallback(() => {
    setBrowseMode("associated");
    setSelectedProviderId(providerId || "lessonschurch");
    setSelectedProgram("");
    setSelectedStudy("");
    setSelectedLesson("");
    setSelectedVenue("");
    setSelectedSection("");
    setSelectedAction("");
    setInstructions(null);
    setSections([]);
    setShowAllProviders(false);
    // Reset browse folder state
    setFolderStack([]);
    setCurrentItems([]);
    setCurrentFiles([]);
    setBrowseVenueId(null);
    setBrowseInstructions(null);
    setBrowseSections([]);
    setBrowseSelectedSection("");
    setBrowseSelectedAction("");
    onClose();
  }, [onClose, providerId]);

  useEffect(() => {
    if (open) {
      loadLinkedProviders();
      if (browseMode === "associated" || !venueId) {
        loadActionTree();
      }
    }
  }, [open, loadActionTree, loadLinkedProviders, browseMode, venueId]);

  // Load browse content when switching to browse mode or changing provider
  // Also load when no venueId (always in browse mode)
  useEffect(() => {
    if (open && (browseMode === "browse" || !venueId) && !browseVenueId) {
      loadBrowseContent(folderStack.length > 0 ? folderStack[folderStack.length - 1] : null);
    }
  }, [open, browseMode, selectedProviderId, browseVenueId, folderStack, loadBrowseContent, venueId]);

  // Get current provider info
  const currentProviderInfo = useMemo(() => {
    const pid = (browseMode === "browse" || !venueId) ? selectedProviderId : (providerId || "lessonschurch");
    return availableProviders.find(p => p.id === pid);
  }, [availableProviders, selectedProviderId, browseMode, providerId, venueId]);

  // Check if current provider is linked
  const isCurrentProviderLinked = useMemo(() => {
    const pid = (browseMode === "browse" || !venueId) ? selectedProviderId : (providerId || "lessonschurch");
    if (pid === "lessonschurch") return true;
    return linkedProviders.some(lp => lp.providerId === pid);
  }, [linkedProviders, selectedProviderId, browseMode, providerId]);

  const currentProgram = getCurrentProgram();
  const currentStudy = getCurrentStudy();
  const currentLesson = getCurrentLesson();
  const currentVenue = getCurrentVenue();
  const currentSection = getCurrentSection();
  const currentVenueSection = getCurrentVenueSection();

  // Build breadcrumb items for browse mode (must be before conditional returns)
  const browseBreadcrumbItems = useMemo(() => {
    const providerName = currentProviderInfo?.name || selectedProviderId;
    const items: { label: string; onClick?: () => void }[] = [
      { label: providerName, onClick: () => handleBrowseBreadcrumbClick(-1) }
    ];
    folderStack.forEach((folder, index) => {
      items.push({ label: folder.title, onClick: () => handleBrowseBreadcrumbClick(index) });
    });
    return items;
  }, [folderStack, handleBrowseBreadcrumbClick, currentProviderInfo, selectedProviderId]);

  // Get current browse section for action selection (must be before conditional returns)
  const currentBrowseSection = getCurrentBrowseSection();

  // If venueId is provided and in associated mode, show simplified view
  if (venueId && browseMode === "associated") {
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
          {/* Tree view of sections and actions */}
          <Box sx={{ maxHeight: "400px", overflowY: "auto" }}>
            {sections.length === 0 ? (
              <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                {Locale.label("plans.actionSelector.noActionsAvailable") || "No actions available"}
              </Typography>
            ) : (
              sections.map((section) => {
                const sectionId = section.relatedId || section.id || "";
                const isExpanded = expandedSections.has(sectionId);
                return (
                  <Box key={sectionId} sx={{ mb: 1 }}>
                    {/* Section header */}
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
                      <IconButton
                        size="small"
                        onClick={() => toggleSectionExpanded(sectionId)}
                        sx={{ mr: 1 }}
                      >
                        {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                      </IconButton>
                      <Typography sx={{ flex: 1, fontWeight: 500 }}>{section.label}</Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={() => handleAddSection(section, providerId || "lessonschurch")}
                        sx={{ ml: 1 }}
                      >
                        {Locale.label("plans.actionSelector.addSection") || "Add Section"}
                      </Button>
                    </Box>
                    {/* Actions under this section */}
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
                                onClick={() => handleAddAction(action, providerId || "lessonschurch")}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  // Browse mode - show provider selector and card-based browsing
  // Also show this when no venueId is provided (no associated lesson)
  if (browseMode === "browse" || !venueId) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            {(folderStack.length > 0 || browseVenueId) ? (
              <IconButton size="small" onClick={handleBrowseBack}>
                <ArrowBackIcon />
              </IconButton>
            ) : venueId ? (
              <IconButton size="small" onClick={handleBackToAssociated}>
                <ArrowBackIcon />
              </IconButton>
            ) : null}
            <span>{Locale.label("plans.actionSelector.selectExternalItem") || "Select External Item"}</span>
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
              {browseBreadcrumbItems.map((item, index) => (
                index === browseBreadcrumbItems.length - 1 ? (
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

            {/* Content area */}
            {!isCurrentProviderLinked && currentProviderInfo?.requiresAuth ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">
                  {Locale.label("plans.lessonSelector.linkProviderFirst") || "Please link this provider in ministry settings to browse content."}
                </Typography>
              </Box>
            ) : browseLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            ) : browseVenueId ? (
              /* Venue selected - show tree view of sections and actions */
              <Box>
                <Box sx={{ py: 1, mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    {Locale.label("plans.actionSelector.fromAssociatedLesson") || "From:"}
                    <Typography component="span" sx={{ fontWeight: 600, ml: 1, color: "primary.main" }}>
                      {browseInstructions?.venueName || "Loading..."}
                    </Typography>
                  </Typography>
                </Box>
                {/* Tree view of sections and actions */}
                <Box sx={{ maxHeight: "350px", overflowY: "auto" }}>
                  {browseSections.length === 0 ? (
                    <Typography color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                      {Locale.label("plans.actionSelector.noActionsAvailable") || "No actions available"}
                    </Typography>
                  ) : (
                    browseSections.map((section) => {
                      const sectionId = section.relatedId || section.id || "";
                      const isExpanded = expandedSections.has(sectionId);
                      return (
                        <Box key={sectionId} sx={{ mb: 1 }}>
                          {/* Section header */}
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
                            <IconButton
                              size="small"
                              onClick={() => toggleSectionExpanded(sectionId)}
                              sx={{ mr: 1 }}
                            >
                              {isExpanded ? <ExpandMoreIcon /> : <ChevronRightIcon />}
                            </IconButton>
                            <Typography sx={{ flex: 1, fontWeight: 500 }}>{section.label}</Typography>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<AddIcon />}
                              onClick={() => handleAddSection(section, selectedProviderId)}
                              sx={{ ml: 1 }}
                            >
                              {Locale.label("plans.actionSelector.addSection") || "Add Section"}
                            </Button>
                          </Box>
                          {/* Actions under this section */}
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
                                      onClick={() => handleAddAction(action, selectedProviderId)}
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
              </Box>
            ) : currentItems.length === 0 && currentFiles.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography color="text.secondary">No content available</Typography>
              </Box>
            ) : (
              /* Folder and file browsing - show cards */
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
                {/* Folders */}
                {currentItems.map((folder) => {
                  const isVenue = isVenueFolder(folder);
                  return (
                    <Card
                      key={`folder-${folder.id}`}
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        bgcolor: "background.paper"
                      }}
                    >
                      <CardActionArea onClick={() => handleBrowseFolderClick(folder)}>
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
                            {isVenue ? (
                              <PlayArrowIcon sx={{ fontSize: 40, color: "primary.contrastText" }} />
                            ) : (
                              <FolderIcon sx={{ fontSize: 40, color: "grey.500" }} />
                            )}
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
                {/* Files (add-ons) */}
                {currentFiles.map((file) => (
                  <Card
                    key={`file-${file.id}`}
                    sx={{
                      border: 1,
                      borderColor: "divider",
                      bgcolor: "background.paper"
                    }}
                  >
                    <CardActionArea onClick={() => handleAddFile(file, selectedProviderId)}>
                      {file.image ? (
                        <CardMedia
                          component="img"
                          height="80"
                          image={file.image}
                          alt={file.title}
                          sx={{ objectFit: "cover" }}
                        />
                      ) : (
                        <Box
                          sx={{
                            height: 80,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "secondary.light"
                          }}
                        >
                          <AddIcon sx={{ fontSize: 40, color: "secondary.contrastText" }} />
                        </Box>
                      )}
                      <CardContent sx={{ p: 1, "&:last-child": { pb: 1 } }}>
                        <Typography
                          variant="body2"
                          noWrap
                          title={file.title}
                        >
                          {file.title}
                        </Typography>
                        <Typography variant="caption" color="secondary">
                          Add-On
                        </Typography>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{Locale.label("plans.actionSelector.selectAction") || "Select Action"}</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("plans.lessonSelector.program")}</InputLabel>
            <Select
              value={selectedProgram}
              onChange={(e) => handleProgramChange(e.target.value)}
              label={Locale.label("plans.lessonSelector.program")}
            >
              {actionTree?.programs?.map((program: any) => (
                <MenuItem key={program.id} value={program.id}>
                  {program.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedProgram}>
            <InputLabel>{Locale.label("plans.lessonSelector.study")}</InputLabel>
            <Select
              value={selectedStudy}
              onChange={(e) => handleStudyChange(e.target.value)}
              label={Locale.label("plans.lessonSelector.study")}
            >
              {currentProgram?.studies?.map((study: any) => (
                <MenuItem key={study.id} value={study.id}>
                  {study.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedStudy}>
            <InputLabel>{Locale.label("plans.lessonSelector.lesson")}</InputLabel>
            <Select
              value={selectedLesson}
              onChange={(e) => handleLessonChange(e.target.value)}
              label={Locale.label("plans.lessonSelector.lesson")}
            >
              {currentStudy?.lessons?.map((lesson: any) => (
                <MenuItem key={lesson.id} value={lesson.id}>
                  {lesson.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedLesson}>
            <InputLabel>{Locale.label("plans.lessonSelector.venue")}</InputLabel>
            <Select
              value={selectedVenue}
              onChange={(e) => handleVenueChange(e.target.value)}
              label={Locale.label("plans.lessonSelector.venue")}
            >
              {currentLesson?.venues?.map((venue: any) => (
                <MenuItem key={venue.id} value={venue.id}>
                  {venue.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedVenue}>
            <InputLabel>{Locale.label("plans.actionSelector.section") || "Section"}</InputLabel>
            <Select
              value={selectedSection}
              onChange={(e) => handleSectionChange(e.target.value)}
              label={Locale.label("plans.actionSelector.section") || "Section"}
            >
              {currentVenue?.sections?.map((section: any) => (
                <MenuItem key={section.id} value={section.id}>
                  {section.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth disabled={!selectedSection}>
            <InputLabel>{Locale.label("plans.actionSelector.action") || "Action"}</InputLabel>
            <Select
              value={selectedAction}
              onChange={(e) => handleActionChange(e.target.value)}
              label={Locale.label("plans.actionSelector.action") || "Action"}
            >
              {currentSection?.actions?.map((action: any) => (
                <MenuItem key={action.id} value={action.id}>
                  {action.name} ({action.actionType})
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{Locale.label("common.cancel")}</Button>
        <Button onClick={handleSelect} disabled={!selectedAction} variant="contained">
          {Locale.label("plans.actionSelector.selectAction") || "Select Action"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
