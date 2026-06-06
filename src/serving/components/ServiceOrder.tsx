import React, { memo, useCallback, useMemo } from "react";
import { Stack, Typography, Button, ButtonGroup, Box, Card, CardContent, Menu, MenuItem, Chip, Snackbar, Alert, TextField } from "@mui/material";
import { Print as PrintIcon, Add as AddIcon, Album as AlbumIcon, MenuBook as MenuBookIcon, ArrowDropDown as ArrowDropDownIcon, Link as LinkIcon, Close as CloseIcon, Schedule as ScheduleIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type GroupInterface, type PlanInterface, type TimeInterface, type PlanItemTimeInterface } from "@churchapps/helpers";
import { type PlanItemInterface } from "../../helpers";
import { ApiHelper, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { getProvider, type InstructionItem, type IProvider, type Instructions } from "@churchapps/content-providers";
import { PlanItemEdit } from "./PlanItemEdit";
import { LessonSelector } from "./LessonSelector";
import { LessonHeaderSelector } from "./LessonHeaderSelector";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { PlanItem } from "./PlanItem";
import { LessonPreview } from "./LessonPreview";
import { DraggableWrapper } from "../../components/DraggableWrapper";
import { DroppableWrapper } from "../../components/DroppableWrapper";
import { DroppableScroll } from "../../site/admin/DroppableScroll";
import { getSectionDuration, formatTime } from "./PlanUtils";
import { findThumbnailRecursive } from "./planItemUtils";

interface Props {
  plan: PlanInterface;
  onPlanUpdate?: () => void;
}


// Helper to get instructions from provider based on its capabilities
async function getProviderInstructions(provider: IProvider, path: string): Promise<Instructions | null> {
  const capabilities = provider.capabilities;
  if (capabilities.instructions && provider.getInstructions) {
    return provider.getInstructions(path);
  }
  return null;
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
    description: item.description,
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
  const hasPlansEdit = UserHelper.checkAccess(Permissions.membershipApi.plans.edit);

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

  // Get the provider dynamically based on plan's providerId
  const provider: IProvider | null = useMemo(() => {
    if (props.plan?.providerId) {
      return getProvider(props.plan.providerId);
    }
    return null;
  }, [props.plan?.providerId]);

  // Calculate total plan duration
  const totalDuration = useMemo(() => {
    return planItems.reduce((total, item) => total + getSectionDuration(item), 0);
  }, [planItems]);

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
    const itemsToSave = items.map((item, index) => {
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
      if (items[i].children && items[i].children.length > 0) {
        const newParentId = savedItems[i]?.id;
        if (newParentId) {
          await saveHierarchicalItems(items[i].children, newParentId);
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

      const instructions = await getProviderInstructions(provider, contentPath);
      const currentProviderId = props.plan?.providerId;

      if (instructions?.items && instructions.items.length > 0) {
        // Convert InstructionItems to PlanItemInterface with providerId and providerPath
        const planItemsFromInstructions = instructions.items.map((item, index) => instructionToPlanItem(item, currentProviderId, contentPath, [index]));

        // Keep top-level headers with their section children, but strip grandchildren (actions)
        const sectionsOnly = planItemsFromInstructions.map((item: PlanItemInterface) => ({
          ...item,
          // Keep children (sections) but strip their children (actions)
          children: item.children?.map((section: PlanItemInterface) => ({
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
  }, [hasAssociatedContent, getContentPath, provider, props.plan?.providerId, loadData]);

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

      const instructions = await getProviderInstructions(provider, contentPath);
      if (instructions?.name) setContentName(instructions.name);
    } catch (error) {
      console.error("Error loading content name:", error);
    }
  }, [hasAssociatedContent, getContentPath, provider, props.plan?.providerPlanName]);

  const loadPreviewLessonItems = useCallback(async () => {
    if (hasAssociatedContent && planItems.length === 0 && provider) {
      try {
        const contentPath = getContentPath();
        if (!contentPath) {
          setPreviewLessonItems([]);
          return;
        }

        const instructions = await getProviderInstructions(provider, contentPath);
        const currentProviderId = props.plan?.providerId;

        if (instructions?.items) {
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
    }
  }, [hasAssociatedContent, planItems.length, getContentPath, provider, props.plan?.providerId]);

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
    let total = item.itemType === "header" ? 0 : (item.seconds || 0);
    if (item.children) item.children.forEach((c) => { total += effectiveSectionDuration(c); });
    return total;
  }, [isItemExcluded]);

  const renderPlanItems = () => {
    const result: JSX.Element[] = [];
    let cumulativeTime = 0;

    planItems.forEach((pi, index) => {
      const sectionStartTime = cumulativeTime;
      const excluded = pi.itemType !== "header" && isItemExcluded(pi.id || "");

      result.push(
        <React.Fragment key={pi.id || `temp-${index}`}>
          {canEdit && showHeaderDrop && (
            <DroppableWrapper
              accept="planItemHeader"
              onDrop={(item) => {
                handleDrop(item, index + 0.5);
              }}>
              <Box
                sx={{
                  height: 40,
                  border: "2px dashed",
                  borderColor: "primary.main",
                  borderRadius: 1,
                  backgroundColor: "primary.light",
                  opacity: 0.3,
                  mb: 1
                }}
              />
            </DroppableWrapper>
          )}
          {canEdit ? (
            <DraggableWrapper
              dndType="planItemHeader"
              data={pi}
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
                associatedContentPath={hasAssociatedContent ? getContentPath() : undefined}
                associatedProviderId={props.plan?.providerId}
                ministryId={props.plan?.ministryId}
                serviceTime={selectedServiceTime}
                exclusions={exclusions}
                selectedServiceTimeId={selectedServiceTimeId}
                excluded={excluded}
              />
            </DraggableWrapper>
          ) : (
            <PlanItem
              planItem={pi}
              setEditPlanItem={null}
              showItemDrop={false}
              onDragChange={() => { }}
              onChange={() => { }}
              readOnly={true}
              startTime={sectionStartTime}
              associatedContentPath={hasAssociatedContent ? getContentPath() : undefined}
              associatedProviderId={props.plan?.providerId}
              ministryId={props.plan?.ministryId}
              serviceTime={selectedServiceTime}
              exclusions={exclusions}
              selectedServiceTimeId={selectedServiceTimeId}
              excluded={excluded}
            />
          )}
        </React.Fragment>
      );

      cumulativeTime += effectiveSectionDuration(pi);
    });

    return result;
  };

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
                <AlbumIcon sx={{ color: "primary.main", fontSize: 28 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
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
            {(showHeaderDrop || showItemDrop) && (
              <>
                <div style={{ position: "fixed", bottom: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, width: "min(600px, 80%)" }}>
                  <DroppableScroll direction="down" text={Locale.label("plans.serviceOrder.scrollDown")} acceptTypes={["planItemHeader", "planItem"]} />
                </div>
                <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, width: "min(600px, 80%)" }}>
                  <DroppableScroll direction="up" text={Locale.label("plans.serviceOrder.scrollUp")} acceptTypes={["planItemHeader", "planItem"]} />
                </div>
              </>
            )}
            {planItems.length === 0 ? (
              showPreviewMode ? (
                <LessonPreview
                  lessonItems={previewLessonItems}
                  contentName={contentName}
                  onCustomize={handleCustomizeLesson}
                  associatedProviderId={props.plan?.providerId}
                  associatedContentPath={getContentPath() || undefined}
                  ministryId={props.plan?.ministryId}
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
              <>
                {renderPlanItems()}
                {showHeaderDrop && (
                  <DroppableWrapper
                    accept="planItemHeader"
                    onDrop={(item) => {
                      handleDrop(item, planItems?.length + 1);
                    }}>
                    <Box
                      sx={{
                        height: 40,
                        border: "2px dashed",
                        borderColor: "primary.main",
                        borderRadius: 1,
                        backgroundColor: "primary.light",
                        opacity: 0.3,
                        mb: 1
                      }}
                    />
                  </DroppableWrapper>
                )}
              </>
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
