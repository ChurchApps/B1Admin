import React, { memo, useCallback, useMemo } from "react";
import { Stack, Typography, Button, ButtonGroup, Box, Card, CardContent, Menu, MenuItem, Chip, Snackbar, Alert, TextField } from "@mui/material";
import { Print as PrintIcon, Add as AddIcon, Album as AlbumIcon, MenuBook as MenuBookIcon, ArrowDropDown as ArrowDropDownIcon, Link as LinkIcon, Close as CloseIcon, Schedule as ScheduleIcon, BookmarkAdd as BookmarkAddIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type GroupInterface, type PlanInterface, type TimeInterface, type PlanItemTimeInterface } from "@churchapps/helpers";
import { type PlanItemInterface, hasPlansEditAccess } from "../../helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { getProvider, type InstructionItem, type IProvider, type Instructions } from "@churchapps/content-providers";
import { PlanItemEdit } from "./PlanItemEdit";
import { LessonSelector } from "./LessonSelector";
import { LessonHeaderSelector } from "./LessonHeaderSelector";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { PlanItem } from "./PlanItem";
import { SaveTemplateDialog } from "./SaveTemplateDialog";
import { LessonPreview } from "./LessonPreview";
import { DraggableWrapper } from "../../components/DraggableWrapper";
import { RowDropZone } from "./RowDropZone";
import { formatTime } from "./PlanUtils";
import { findThumbnailRecursive, buildProviderMediaLookup, matchProviderMedia, isVideoMedia, getVideoDuration, estimateSeconds, type ProviderMediaInfo } from "./planItemUtils";

interface Props {
  plan: PlanInterface;
  onPlanUpdate?: () => void;
}


// Helper to get instructions from provider based on its capabilities
async function getProviderInstructions(provider: IProvider, path: string, ministryId?: string, providerId?: string): Promise<Instructions | null> {
  const capabilities = provider.capabilities;
  if (!capabilities.instructions || !provider.getInstructions) return null;
  if (provider.requiresAuth && ministryId && providerId) {
    return ApiHelper.post("/providerProxy/getInstructions", { ministryId, providerId, path }, "DoingApi");
  }
  return provider.getInstructions(path);
}

// Helper to convert InstructionItem to PlanItemInterface
function instructionToPlanItem(item: InstructionItem, providerId?: string, providerPath?: string, pathIndices: number[] = []): PlanItemInterface {
  // Map provider item types to plan item types
  let itemType = item.itemType || "item";
  if (itemType === "section") itemType = "providerSection";
  else if (itemType === "action") itemType = "providerPresentation";
  else if (itemType === "file") itemType = "providerFile";

  // Generate dot-notation path from indices (e.g., [0, 2, 1] -> "0.2.1")
  const contentPath = pathIndices.length > 0 ? pathIndices.join(".") : undefined;

  // Get thumbnail, searching recursively through children if needed
  const thumbnail = findThumbnailRecursive(item);

  return {
    itemType,
    relatedId: item.relatedId,
    label: item.label || "",
    description: item.content,
    seconds: item.seconds ?? 0,
    providerId,
    providerPath,
    providerContentPath: contentPath,
    thumbnailUrl: thumbnail,
    children: item.children?.map((child, index) => instructionToPlanItem(child, providerId, providerPath, [...pathIndices, index]))
  };
}

export const ServiceOrder = memo((props: Props) => {
  const [planItems, setPlanItems] = React.useState<PlanItemInterface[]>([]);
  const hasPlansEdit = hasPlansEditAccess();

  const myMinistriesQuery = useQuery<GroupInterface[]>({
    queryKey: ["/groups/my/ministry", "MembershipApi"],
    enabled: !hasPlansEdit && !!props.plan?.ministryId,
    placeholderData: []
  });

  const isMinistryMember = !hasPlansEdit && !!props.plan?.ministryId && (myMinistriesQuery.data || []).some((g) => g.id === props.plan.ministryId);
  const canEdit = hasPlansEdit || isMinistryMember;
  const [editPlanItem, setEditPlanItem] = React.useState<PlanItemInterface | null>(null);
  const [showHeaderDrop, setShowHeaderDrop] = React.useState(false);
  const [showItemDrop, setShowItemDrop] = React.useState(false);
  const [showAssociateLessonSelector, setShowAssociateLessonSelector] = React.useState(false);
  const [showLessonHeaderSelector, setShowLessonHeaderSelector] = React.useState(false);
  const [addMenuAnchor, setAddMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [contentName, setContentName] = React.useState<string>("");
  const [previewLessonItems, setPreviewLessonItems] = React.useState<PlanItemInterface[]>([]);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [serviceTimes, setServiceTimes] = React.useState<TimeInterface[]>([]);
  const [exclusions, setExclusions] = React.useState<PlanItemTimeInterface[]>([]);
  const [selectedServiceTimeId, setSelectedServiceTimeId] = React.useState<string>("");
  const [showSaveTemplate, setShowSaveTemplate] = React.useState(false);
  const [mediaLookup, setMediaLookup] = React.useState<Record<string, ProviderMediaInfo>>({});
  const [settingTimes, setSettingTimes] = React.useState(false);

  // Get the provider dynamically based on plan's providerId
  const provider: IProvider | null = useMemo(() => {
    if (props.plan?.providerId) {
      return getProvider(props.plan.providerId);
    }
    return null;
  }, [props.plan?.providerId]);

  // Calculate total plan duration (includes ~5:00 planning estimates for untimed images)
  const totalDuration = useMemo(() => {
    const walk = (pi: PlanItemInterface): number =>
      estimateSeconds(pi, mediaLookup) + (pi.children || []).reduce((sum, c) => sum + walk(c), 0);
    return planItems.reduce((total, item) => total + walk(item), 0);
  }, [planItems, mediaLookup]);

  const loadData = useCallback(async () => {
    if (props.plan?.id) {
      try {
        const data = await ApiHelper.get("/planItems/plan/" + props.plan.id.toString(), "DoingApi");
        setPlanItems(data || []);
      } catch (error) {
        console.error("Error loading plan items:", error);
        setErrorMessage(Locale.label("plans.serviceOrder.loadError") || "Failed to load plan items");
        setPlanItems([]);
      }
    }
  }, [props.plan?.id]);

  const loadTimesAndExclusions = useCallback(async () => {
    if (!props.plan?.id) return;
    try {
      const [times, ex] = await Promise.all([
        ApiHelper.get("/times/plan/" + props.plan.id, "DoingApi"),
        ApiHelper.get("/planItemTimes/plan/" + props.plan.id, "DoingApi")
      ]);
      const services = ((times || []) as TimeInterface[]).filter((t) => (t.serviceTimeType ?? "service") === "service");
      services.sort((a, b) => new Date(a.startTime || 0).getTime() - new Date(b.startTime || 0).getTime());
      setServiceTimes(services);
      setExclusions(ex || []);
      setSelectedServiceTimeId((prev) => {
        if (prev === "elapsed") return prev;
        if (prev && services.some((s) => s.id === prev)) return prev;
        return services[0]?.id || "";
      });
    } catch (error) {
      console.error("Error loading service times:", error);
    }
  }, [props.plan?.id]);

  const selectedServiceTime = useMemo(() => serviceTimes.find((s) => s.id === selectedServiceTimeId) || null, [serviceTimes, selectedServiceTimeId]);


  const handleAssociateContent = useCallback(async (contentId: string, selectedContentName?: string, contentPath?: string, providerId?: string) => {
    try {
      setShowAssociateLessonSelector(false);
      const updatedPlan = {
        ...props.plan,
        providerId: providerId,
        providerPlanId: contentPath || contentId,
        providerPlanName: selectedContentName || "",
        // Backward compat
        contentType: "provider",
        contentId: contentId
      };
      await ApiHelper.post("/plans", [updatedPlan], "DoingApi");
      setContentName(selectedContentName || "");
      if (props.onPlanUpdate) props.onPlanUpdate();
    } catch (error) {
      console.error("Error associating content:", error);
      setErrorMessage(Locale.label("plans.serviceOrder.associateError") || "Failed to associate lesson");
    }
  }, [props.plan, props.onPlanUpdate]);

  const handleDisassociateContent = useCallback(async () => {
    try {
      const updatedPlan = {
        ...props.plan,
        contentType: null,
        contentId: null,
        providerId: null,
        providerPlanId: null,
        providerPlanName: null
      };
      await ApiHelper.post("/plans", [updatedPlan], "DoingApi");
      setContentName("");
      if (props.onPlanUpdate) props.onPlanUpdate();
    } catch (error) {
      console.error("Error disassociating content:", error);
      setErrorMessage(Locale.label("plans.serviceOrder.disassociateError") || "Failed to unlink lesson");
    }
  }, [props.plan, props.onPlanUpdate]);

  const hasAssociatedContent = !!(props.plan?.providerId && props.plan?.providerPlanId);

  const getContentPath = useCallback((): string | null => {
    if (!hasAssociatedContent) return null;
    return props.plan?.providerPlanId || null;
  }, [hasAssociatedContent, props.plan?.providerPlanId]);

  const showPreviewMode = hasAssociatedContent && planItems.length === 0 && previewLessonItems.length > 0;

  const saveHierarchicalItems = async (items: PlanItemInterface[], parentId?: string): Promise<void> => {
    if (!items || items.length === 0) return;

    // Prepare top-level items for this batch
    const itemsToSave = items.map((item, index): PlanItemInterface => {
      const cleanItem = { ...item };
      delete cleanItem.id; // Completely remove the id property
      return {
        ...cleanItem,
        planId: props.plan.id,
        parentId,
        sort: index + 1,
        children: undefined // Remove children for the API call
      };
    });

    // Post the current level items
    const savedItems = await ApiHelper.post("/planItems", itemsToSave, "DoingApi");

    // Process children for each saved item
    for (let i = 0; i < items.length; i++) {
      const children = items[i].children;
      if (children && children.length > 0) {
        const newParentId = savedItems[i]?.id;
        if (newParentId) {
          await saveHierarchicalItems(children, newParentId);
        }
      }
    }
  };

  // Import only sections (not actions/presentations) as editable plan items
  const handleCustomizeLesson = useCallback(async () => {
    if (!hasAssociatedContent || !provider) return;

    try {
      const contentPath = getContentPath();
      if (!contentPath) return;

      const currentProviderId = props.plan?.providerId;
      const instructions = await getProviderInstructions(provider, contentPath, props.plan?.ministryId, currentProviderId);

      if (instructions?.items && instructions.items.length > 0) {
        // Convert InstructionItems to PlanItemInterface with providerId and providerPath
        const planItemsFromInstructions = instructions.items.map((item, index) => instructionToPlanItem(item, currentProviderId, contentPath, [index]));

        // Keep top-level headers with their section children, but strip grandchildren (actions)
        const sectionsOnly = planItemsFromInstructions.map((item: PlanItemInterface): PlanItemInterface => ({
          ...item,
          // Keep children (sections) but strip their children (actions)
          children: item.children?.map((section: PlanItemInterface): PlanItemInterface => ({
            ...section,
            children: undefined // Remove actions from sections
          }))
        }));
        await saveHierarchicalItems(sectionsOnly);
        setPreviewLessonItems([]); // Clear preview
        loadData();
      }
    } catch (error) {
      console.error("Error customizing lesson:", error);
    }
  }, [hasAssociatedContent, getContentPath, provider, props.plan?.providerId, props.plan?.ministryId, loadData]);

  const addHeader = useCallback(async () => {
    // If in preview mode, first customize (import sections only), then add header
    if (showPreviewMode) {
      await handleCustomizeLesson();
      // After customizing, the planItems will be reloaded, so we need to add at the end
      // The sort will be recalculated after loadData completes
    }
    setEditPlanItem({ itemType: "header", planId: props.plan.id, sort: planItems?.length + 1 || 1 });
  }, [props.plan.id, planItems?.length, showPreviewMode, handleCustomizeLesson]);

  const loadContentName = useCallback(async () => {
    if (!hasAssociatedContent) {
      setContentName("");
      return;
    }
    if (props.plan?.providerPlanName) {
      setContentName(props.plan.providerPlanName);
      return;
    }
    if (!provider) return;
    try {
      const contentPath = getContentPath();
      if (!contentPath) return;

      const instructions = await getProviderInstructions(provider, contentPath, props.plan?.ministryId, props.plan?.providerId);
      if (instructions?.name) setContentName(instructions.name);
    } catch (error) {
      console.error("Error loading content name:", error);
    }
  }, [hasAssociatedContent, getContentPath, provider, props.plan?.providerPlanName, props.plan?.ministryId, props.plan?.providerId]);

  // Fetches provider instructions once per load: builds the fresh media lookup (thumbnails)
  // for saved items, and doubles as the preview source when the plan has no items yet.
  const loadPreviewLessonItems = useCallback(async () => {
    if (hasAssociatedContent && provider) {
      try {
        const contentPath = getContentPath();
        if (!contentPath) {
          setPreviewLessonItems([]);
          setMediaLookup({});
          return;
        }

        const currentProviderId = props.plan?.providerId;
        const instructions = await getProviderInstructions(provider, contentPath, props.plan?.ministryId, currentProviderId);

        setMediaLookup(instructions?.items ? buildProviderMediaLookup(instructions.items) : {});

        if (instructions?.items && planItems.length === 0) {
          // Convert InstructionItems to PlanItemInterface for preview with providerId and providerPath
          const planItemsFromInstructions = instructions.items.map((item, index) => instructionToPlanItem(item, currentProviderId, contentPath, [index]));
          setPreviewLessonItems(planItemsFromInstructions);
        } else {
          setPreviewLessonItems([]);
        }
        if (instructions?.name) setContentName(instructions.name);
      } catch (error) {
        console.error("Error loading preview lesson items:", error);
        setPreviewLessonItems([]);
      }
    } else {
      setPreviewLessonItems([]);
      setMediaLookup({});
    }
  }, [hasAssociatedContent, planItems.length, getContentPath, provider, props.plan?.providerId, props.plan?.ministryId]);

  // Videos still at 0:00 get their real length saved; images intentionally stay at 0
  // (playback leaves the volunteer in control — the plan shows a ~5:00 estimate instead).
  const timeSyncTargets = useMemo(() => {
    const targets: { item: PlanItemInterface; media: ProviderMediaInfo }[] = [];
    const walk = (list: PlanItemInterface[]) => {
      list.forEach((pi) => {
        if (pi.id && pi.itemType !== "header" && (pi.seconds || 0) === 0) {
          const media = matchProviderMedia(pi, mediaLookup);
          if (media && isVideoMedia(pi.label, media)) targets.push({ item: pi, media });
        }
        if (pi.children) walk(pi.children);
      });
    };
    walk(planItems);
    return targets;
  }, [planItems, mediaLookup]);

  const handleSyncTimes = useCallback(async (targets: { item: PlanItemInterface; media: ProviderMediaInfo }[]) => {
    if (targets.length === 0 || settingTimes) return;
    setSettingTimes(true);
    try {
      const updates: PlanItemInterface[] = [];
      // Sequential on purpose: each video loads its metadata over the network.
      for (const { item, media } of targets) {
        const seconds = media.seconds || await getVideoDuration(media.url);
        if (seconds && seconds > 0) updates.push({ ...item, children: undefined, seconds: Math.round(seconds) });
      }
      if (updates.length > 0) {
        await ApiHelper.post("/planItems", updates, "DoingApi");
        loadData();
      }
    } catch (error) {
      console.error("Error syncing times:", error);
      setErrorMessage(Locale.label("plans.serviceOrder.autoSetTimesError") || "Failed to set times");
    } finally {
      setSettingTimes(false);
    }
  }, [settingTimes, loadData]);

  // Auto-sync on load: fill in real video lengths without user action.
  // Each item is only attempted once per session so unmeasurable videos can't loop.
  const attemptedSyncIds = React.useRef<Set<string>>(new Set());
  React.useEffect(() => {
    if (!canEdit || settingTimes) return;
    const pending = timeSyncTargets.filter((t) => t.item.id && !attemptedSyncIds.current.has(t.item.id));
    if (pending.length === 0) return;
    pending.forEach((t) => attemptedSyncIds.current.add(t.item.id!));
    handleSyncTimes(pending);
  }, [timeSyncTargets, canEdit, settingTimes, handleSyncTimes]);

  const handleAddContent = useCallback(() => {
    // Always show the LessonHeaderSelector - it now supports provider browsing
    setShowLessonHeaderSelector(true);
  }, []);

  // Handle selection from LessonHeaderSelector
  const handleLessonHeaderSelect = useCallback(async (items: PlanItemInterface[]) => {
    if (items.length > 0) {
      await saveHierarchicalItems(items);
      loadData();
    }
  }, [loadData]);

  const editContent = useMemo(
    () => (
      <Stack direction="row" spacing={1} alignItems="center">
        <AppIconButton
          label={Locale.label("common.print")}
          icon={<PrintIcon />}
          tone="card"
          onClick={() => window.open(`/serving/plans/print/${props.plan?.id}`, "_blank")} />
        {canEdit && (
          <>
            <AppIconButton
              label={Locale.label("plans.templates.saveTitle") || "Save as Template"}
              icon={<BookmarkAddIcon />}
              tone="card"
              onClick={() => setShowSaveTemplate(true)} />
            {hasAssociatedContent ? (
              <Chip
                icon={<MenuBookIcon sx={{ fontSize: 18 }} />}
                label={contentName || "Loading..."}
                onDelete={handleDisassociateContent}
                deleteIcon={<CloseIcon sx={{ fontSize: 16 }} />}
                size="small"
                sx={{
                  backgroundColor: "rgba(25, 118, 210, 0.08)",
                  borderColor: "primary.main",
                  "& .MuiChip-label": { fontWeight: 500 },
                  "& .MuiChip-deleteIcon": {
                    color: "text.secondary",
                    "&:hover": { color: "error.main" }
                  }
                }}
                variant="outlined"
              />
            ) : (
              <Chip
                icon={<LinkIcon sx={{ fontSize: 18 }} />}
                label={Locale.label("plans.serviceOrder.associateLesson") || "Link Lesson"}
                onClick={() => setShowAssociateLessonSelector(true)}
                size="small"
                sx={{
                  backgroundColor: "rgba(0, 0, 0, 0.04)",
                  borderColor: "divider",
                  cursor: "pointer",
                  "& .MuiChip-label": { fontWeight: 500 },
                  "&:hover": {
                    backgroundColor: "rgba(25, 118, 210, 0.08)",
                    borderColor: "primary.main"
                  }
                }}
                variant="outlined"
              />
            )}
            <ButtonGroup variant="contained" size="small">
              <Button
                startIcon={<AddIcon />}
                onClick={addHeader}
                sx={{
                  textTransform: "none",
                  borderRadius: "8px 0 0 8px",
                  fontWeight: 600
                }}>
                {Locale.label("plans.serviceOrder.addSection")}
              </Button>
              <Button
                onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                sx={{
                  borderRadius: "0 8px 8px 0",
                  minWidth: 32,
                  px: 0.5
                }}>
                <ArrowDropDownIcon />
              </Button>
            </ButtonGroup>
            <Menu
              anchorEl={addMenuAnchor}
              open={Boolean(addMenuAnchor)}
              onClose={() => setAddMenuAnchor(null)}
            >
              <MenuItem onClick={() => { setAddMenuAnchor(null); addHeader(); }}>
                <AddIcon sx={{ mr: 1 }} /> {Locale.label("plans.serviceOrder.addSection")}
              </MenuItem>
              <MenuItem onClick={() => { setAddMenuAnchor(null); handleAddContent(); }}>
                <MenuBookIcon sx={{ mr: 1 }} /> {Locale.label("plans.serviceOrder.addFromLesson") || "Add from Lesson"}
              </MenuItem>
            </Menu>
          </>
        )}
      </Stack>
    ),
    [
      props.plan?.id, addHeader, canEdit, addMenuAnchor, hasAssociatedContent, provider?.name, contentName, handleDisassociateContent, handleAddContent
    ]
  );

  const handleDrop = useCallback(
    (data: any, sort: number) => {
      const pi = data.data as PlanItemInterface;
      pi.sort = sort;
      ApiHelper.post("/planItems/sort", pi, "DoingApi").then(() => {
        loadData();
      });
    },
    [loadData]
  );

  const isItemExcluded = useCallback((planItemId: string): boolean => {
    if (!selectedServiceTimeId) return false;
    return exclusions.some((ex) => ex.planItemId === planItemId && ex.timeId === selectedServiceTimeId && ex.excluded);
  }, [exclusions, selectedServiceTimeId]);

  // Section duration that respects per-item exclusions for the selected service time.
  const effectiveSectionDuration = useCallback((item: PlanItemInterface): number => {
    if (item.itemType !== "header" && isItemExcluded(item.id || "")) return 0;
    let total = item.itemType === "header" ? 0 : estimateSeconds(item, mediaLookup);
    if (item.children) item.children.forEach((c) => { total += effectiveSectionDuration(c); });
    return total;
  }, [isItemExcluded, mediaLookup]);

  const renderPlanItems = () => {
    const result: JSX.Element[] = [];
    let cumulativeTime = 0;

    planItems.forEach((pi, index) => {
      const sectionStartTime = cumulativeTime;
      const excluded = pi.itemType !== "header" && isItemExcluded(pi.id || "");

      result.push(
        <React.Fragment key={pi.id || `temp-${index}`}>
          {canEdit ? (
            <RowDropZone
              accept="planItemHeader"
              onDrop={(item, position) => {
                handleDrop(item, index + (position === "before" ? 0.5 : 1.5));
              }}>
              <DraggableWrapper
                dndType="planItemHeader"
                data={pi}
                handleClassName="dragHandle"
                draggingCallback={(isDragging) => {
                  setShowHeaderDrop(isDragging);
                }}>
                <PlanItem
                  planItem={pi}
                  setEditPlanItem={setEditPlanItem}
                  showItemDrop={showItemDrop}
                  onDragChange={(dragging) => {
                    setShowItemDrop(dragging);
                  }}
                  onChange={() => {
                    loadData();
                    loadTimesAndExclusions();
                  }}
                  startTime={sectionStartTime}
                  associatedContentPath={hasAssociatedContent ? (getContentPath() ?? undefined) : undefined}
                  associatedProviderId={props.plan?.providerId}
                  ministryId={props.plan?.ministryId}
                  serviceTime={selectedServiceTime}
                  exclusions={exclusions}
                  selectedServiceTimeId={selectedServiceTimeId}
                  excluded={excluded}
                  mediaLookup={mediaLookup}
                />
              </DraggableWrapper>
            </RowDropZone>
          ) : (
            <PlanItem
              planItem={pi}
              setEditPlanItem={() => {}}
              showItemDrop={false}
              onDragChange={() => { }}
              onChange={() => { }}
              readOnly={true}
              startTime={sectionStartTime}
              associatedContentPath={hasAssociatedContent ? (getContentPath() ?? undefined) : undefined}
              associatedProviderId={props.plan?.providerId}
              ministryId={props.plan?.ministryId}
              serviceTime={selectedServiceTime}
              exclusions={exclusions}
              selectedServiceTimeId={selectedServiceTimeId}
              excluded={excluded}
              mediaLookup={mediaLookup}
            />
          )}
        </React.Fragment>
      );

      cumulativeTime += effectiveSectionDuration(pi);
    });

    return result;
  };

  // While dragging, scroll the page when the cursor nears the top/bottom edge.
  React.useEffect(() => {
    if (!showHeaderDrop && !showItemDrop) return;
    const EDGE = 130;
    const MAX_SPEED = 24;
    let lastY = -1;
    let raf = 0;
    const onDragOver = (e: DragEvent) => { lastY = e.clientY; };
    const tick = () => {
      if (lastY >= 0) {
        if (lastY < EDGE) {
          window.scrollBy(0, -MAX_SPEED * (1 - lastY / EDGE));
        } else if (lastY > window.innerHeight - EDGE) {
          window.scrollBy(0, MAX_SPEED * (1 - (window.innerHeight - lastY) / EDGE));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener("dragover", onDragOver);
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener("dragover", onDragOver);
      cancelAnimationFrame(raf);
    };
  }, [showHeaderDrop, showItemDrop]);

  React.useEffect(() => {
    loadData();
  }, [loadData]);

  React.useEffect(() => {
    loadTimesAndExclusions();
  }, [loadTimesAndExclusions]);

  React.useEffect(() => {
    loadContentName();
  }, [loadContentName]);

  // Load preview lesson items when plan has associated lesson but no plan items
  React.useEffect(() => {
    loadPreviewLessonItems();
  }, [loadPreviewLessonItems]);

  return (
    <Box>
      {editPlanItem && canEdit && (
        <PlanItemEdit
          planItem={editPlanItem}
          onDone={() => {
            setEditPlanItem(null);
            loadData();
          }}
        />
      )}

      <LessonSelector
        open={showAssociateLessonSelector}
        onClose={() => setShowAssociateLessonSelector(false)}
        onSelect={handleAssociateContent}
        returnVenueName={true}
        ministryId={props.plan?.ministryId}
        defaultProviderId={props.plan?.providerId}
      />

      <LessonHeaderSelector
        open={showLessonHeaderSelector}
        onClose={() => setShowLessonHeaderSelector(false)}
        onSelect={handleLessonHeaderSelect}
        providerId={props.plan?.providerId}
        providerPath={getContentPath() || undefined}
        ministryId={props.plan?.ministryId}
      />

      {showSaveTemplate && canEdit && (
        <SaveTemplateDialog plan={props.plan} onClose={() => setShowSaveTemplate(false)} />
      )}

      <Card
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "divider",
          transition: "all 0.2s ease-in-out",
          "&:hover": { boxShadow: 2 }
        }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AlbumIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="h6">
                  {Locale.label("plans.serviceOrder.orderOfService")}
                </Typography>
              </Stack>
              {totalDuration > 0 && (
                <Chip
                  icon={<ScheduleIcon sx={{ fontSize: 18 }} />}
                  label={formatTime(totalDuration)}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 500 }}
                />
              )}
              {settingTimes && (
                <Chip
                  icon={<ScheduleIcon sx={{ fontSize: 18 }} />}
                  label={Locale.label("plans.serviceOrder.settingTimes") || "Detecting video times..."}
                  size="small"
                  variant="outlined"
                  sx={{ fontWeight: 500 }}
                />
              )}
              {serviceTimes.length > 0 && (
                <TextField
                  select
                  size="small"
                  label={Locale.label("plans.serviceOrder.viewingAs")}
                  value={selectedServiceTimeId}
                  onChange={(e) => setSelectedServiceTimeId(e.target.value)}
                  sx={{ minWidth: 180 }}
                >
                  {serviceTimes.map((st) => (
                    <MenuItem key={st.id} value={st.id}>
                      {st.displayName} {st.startTime ? `· ${new Date(st.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}
                    </MenuItem>
                  ))}
                  <MenuItem value="elapsed">{Locale.label("plans.serviceOrder.runTimes")}</MenuItem>
                </TextField>
              )}
            </Stack>
            {editContent}
          </Stack>

          <DndProvider backend={HTML5Backend}>
            {planItems.length === 0 ? (
              showPreviewMode ? (
                <LessonPreview
                  lessonItems={previewLessonItems}
                  contentName={contentName}
                  onCustomize={handleCustomizeLesson}
                  associatedProviderId={props.plan?.providerId}
                  associatedContentPath={getContentPath() || undefined}
                  ministryId={props.plan?.ministryId}
                  mediaLookup={mediaLookup}
                />
              ) : (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 4,
                    color: "text.secondary"
                  }}>
                  <AlbumIcon sx={{ fontSize: 48, mb: 2, color: "text.secondary" }} />
                  <Typography variant="body1">{Locale.label("plans.serviceOrder.noItems")}</Typography>
                </Box>
              )
            ) : (
              renderPlanItems()
            )}
          </DndProvider>
        </CardContent>
      </Card>
      <Snackbar
        open={!!errorMessage}
        autoHideDuration={6000}
        onClose={() => setErrorMessage(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
});
