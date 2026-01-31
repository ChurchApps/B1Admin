import React, { memo, useCallback, useMemo } from "react";
import { Stack, Typography, Button, ButtonGroup, Box, Card, CardContent, Menu, MenuItem, Chip } from "@mui/material";
import { Print as PrintIcon, Add as AddIcon, Album as AlbumIcon, MenuBook as MenuBookIcon, ArrowDropDown as ArrowDropDownIcon, Link as LinkIcon, Close as CloseIcon } from "@mui/icons-material";
import { type PlanInterface } from "@churchapps/helpers";
import { type PlanItemInterface } from "../../helpers";
import { ApiHelper, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { getProvider, type InstructionItem, type IProvider, type Instructions } from "@churchapps/content-provider-helper";
import { PlanItemEdit } from "./PlanItemEdit";
import { LessonSelector } from "./LessonSelector";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { PlanItem } from "./PlanItem";
import { LessonPreview } from "./LessonPreview";
import { DraggableWrapper } from "../../components/DraggableWrapper";
import { DroppableWrapper } from "../../components/DroppableWrapper";
import { getSectionDuration } from "./PlanUtils";

interface Props {
  plan: PlanInterface;
  onPlanUpdate?: () => void;
}


// Helper to get instructions from provider based on its capabilities
async function getProviderInstructions(provider: IProvider, path: string): Promise<Instructions | null> {
  const capabilities = provider.capabilities;
  // Try getInstructions first, then fall back to getExpandedInstructions
  if (capabilities.instructions && provider.getInstructions) {
    return provider.getInstructions(path);
  }
  if (capabilities.expandedInstructions && provider.getExpandedInstructions) {
    return provider.getExpandedInstructions(path);
  }
  return null;
}

// Helper to convert InstructionItem to PlanItemInterface
function instructionToPlanItem(item: InstructionItem, providerId?: string, providerPath?: string, pathIndices: number[] = []): PlanItemInterface {
  // Map provider item types to plan item types
  let itemType = item.itemType || "item";
  if (itemType === "section") itemType = "providerSection";
  else if (itemType === "action") itemType = "providerPresentation";
  else if (itemType === "addon" || itemType === "file") itemType = "providerFile";

  // Generate dot-notation path from indices (e.g., [0, 2, 1] -> "0.2.1")
  const contentPath = pathIndices.length > 0 ? pathIndices.join('.') : undefined;

  return {
    itemType,
    relatedId: item.relatedId,
    label: item.label || "",
    description: item.description,
    seconds: item.seconds,
    providerId,
    providerPath,
    providerContentPath: contentPath,
    children: item.children?.map((child, index) => instructionToPlanItem(child, providerId, providerPath, [...pathIndices, index]))
  };
}

export const ServiceOrder = memo((props: Props) => {
  const [planItems, setPlanItems] = React.useState<PlanItemInterface[]>([]);
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.plans.edit);
  const [editPlanItem, setEditPlanItem] = React.useState<PlanItemInterface>(null);
  const [showHeaderDrop, setShowHeaderDrop] = React.useState(false);
  const [showItemDrop, setShowItemDrop] = React.useState(false);
  const [showAssociateLessonSelector, setShowAssociateLessonSelector] = React.useState(false);
  const [addMenuAnchor, setAddMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [venueName, setVenueName] = React.useState<string>("");
  const [previewLessonItems, setPreviewLessonItems] = React.useState<PlanItemInterface[]>([]);

  // Get the provider dynamically based on plan's providerId (or fall back to lessonschurch for backward compat)
  const provider: IProvider | null = useMemo(() => {
    // New provider system
    if (props.plan?.providerId) {
      return getProvider(props.plan.providerId);
    }
    // Backward compatibility: if using old contentType/contentId system, assume lessonschurch
    if (props.plan?.contentType === "venue" || props.plan?.contentType === "externalVenue") {
      return getProvider("lessonschurch");
    }
    return null;
  }, [props.plan?.providerId, props.plan?.contentType]);

  const loadData = useCallback(async () => {
    if (props.plan?.id) {
      try {
        const data = await ApiHelper.get("/planItems/plan/" + props.plan.id.toString(), "DoingApi");
        setPlanItems(data || []);
      } catch (error) {
        console.error("Error loading plan items:", error);
        setPlanItems([]);
      }
    }
  }, [props.plan?.id]);


  const handleAssociateLesson = useCallback(async (contentId: string, selectedVenueName?: string, contentPath?: string, providerId?: string) => {
    try {
      setShowAssociateLessonSelector(false);
      // Update the plan with the content association using path-based system
      const updatedPlan = {
        ...props.plan,
        providerId: providerId || "lessonschurch",
        providerPlanId: contentPath || contentId, // Store path for provider method calls
        providerPlanName: selectedVenueName || "",
        // Backward compat
        contentType: "provider",
        contentId: contentId
      };
      await ApiHelper.post("/plans", [updatedPlan], "DoingApi");
      setVenueName(selectedVenueName || "");
      if (props.onPlanUpdate) props.onPlanUpdate();
    } catch (error) {
      console.error("Error associating lesson:", error);
    }
  }, [props.plan, props.onPlanUpdate]);

  const handleDisassociateLesson = useCallback(async () => {
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
      setVenueName("");
      if (props.onPlanUpdate) props.onPlanUpdate();
    } catch (error) {
      console.error("Error disassociating lesson:", error);
    }
  }, [props.plan, props.onPlanUpdate]);

  // Helper methods for lesson/content association
  const hasAssociatedContent = !!(props.plan?.providerId && props.plan?.providerPlanId);
  const hasAssociatedLesson = hasAssociatedContent; // Alias for backward compat

  // Get content path for provider method calls
  const getContentPath = useCallback((): string | null => {
    if (!hasAssociatedContent) return null;
    return props.plan?.providerPlanId || null;
  }, [hasAssociatedContent, props.plan?.providerPlanId]);

  // Determine if we should show preview mode
  const showPreviewMode = hasAssociatedLesson && planItems.length === 0 && previewLessonItems.length > 0;

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
      const currentProviderId = props.plan?.providerId || "lessonschurch";

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

  const handleLessonSelect = useCallback(async () => {
    if (!provider) return;
    try {
      const contentPath = getContentPath();
      if (!contentPath) return;

      const instructions = await getProviderInstructions(provider, contentPath);
      const currentProviderId = props.plan?.providerId || "lessonschurch";

      if (instructions?.items && instructions.items.length > 0) {
        // Convert InstructionItems to PlanItemInterface with providerId, providerPath and save
        const planItemsFromInstructions = instructions.items.map((item, index) => instructionToPlanItem(item, currentProviderId, contentPath, [index]));
        await saveHierarchicalItems(planItemsFromInstructions);
        // Reload data to show the new editable items
        loadData();
      }
    } catch (error) {
      console.error("Error importing lesson items:", error);
    }
  }, [getContentPath, provider, props.plan?.providerId, loadData]);

  // Load content/venue name when there's an associated content
  const loadVenueName = useCallback(async () => {
    if (!hasAssociatedContent) {
      setVenueName("");
      return;
    }
    // Use providerPlanName if available (new system)
    if (props.plan?.providerPlanName) {
      setVenueName(props.plan.providerPlanName);
      return;
    }
    // Otherwise fetch from provider
    if (!provider) return;
    try {
      const contentPath = getContentPath();
      if (!contentPath) return;

      const instructions = await getProviderInstructions(provider, contentPath);
      if (instructions?.venueName) setVenueName(instructions.venueName);
    } catch (error) {
      console.error("Error loading venue name:", error);
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
        const currentProviderId = props.plan?.providerId || "lessonschurch";

        if (instructions?.items) {
          // Convert InstructionItems to PlanItemInterface for preview with providerId and providerPath
          const planItemsFromInstructions = instructions.items.map((item, index) => instructionToPlanItem(item, currentProviderId, contentPath, [index]));
          setPreviewLessonItems(planItemsFromInstructions);
        } else {
          setPreviewLessonItems([]);
        }
        if (instructions?.venueName) setVenueName(instructions.venueName);
      } catch (error) {
        console.error("Error loading preview lesson items:", error);
        setPreviewLessonItems([]);
      }
    } else {
      setPreviewLessonItems([]);
    }
  }, [hasAssociatedContent, planItems.length, getContentPath, provider, props.plan?.providerId]);

  const handleAddLesson = useCallback(async () => {
    if (hasAssociatedLesson) {
      // Use the associated venue directly without showing a modal
      await handleLessonSelect();
    }
  }, [hasAssociatedLesson, handleLessonSelect]);

  const editContent = useMemo(
    () => (
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          onClick={() => window.open(`/serving/plans/print/${props.plan?.id}`, '_blank')}
          variant="outlined"
          startIcon={<PrintIcon />}
          size="small"
          sx={{
            textTransform: "none",
            borderRadius: 2,
            fontWeight: 600,
          }}>
          {Locale.label("plans.serviceOrder.print")}
        </Button>
        {canEdit && (
          <>
            {hasAssociatedContent ? (
              <Chip
                icon={<LinkIcon />}
                label={`${provider?.name || "Content"}: ${venueName || "Loading..."}`}
                onDelete={handleDisassociateLesson}
                deleteIcon={<CloseIcon />}
                color="primary"
                variant="outlined"
              />
            ) : (
              <Button
                variant="outlined"
                startIcon={<LinkIcon />}
                size="small"
                onClick={() => setShowAssociateLessonSelector(true)}
                sx={{ textTransform: "none" }}
              >
                {Locale.label("plans.serviceOrder.associateLesson") || "Associate Lesson"}
              </Button>
            )}
            <ButtonGroup variant="contained" size="small">
              <Button
                startIcon={<AddIcon />}
                onClick={addHeader}
                sx={{
                  textTransform: "none",
                  borderRadius: "8px 0 0 8px",
                  fontWeight: 600,
                }}>
                {Locale.label("plans.serviceOrder.addSection")}
              </Button>
              {hasAssociatedLesson && (
                <Button
                  onClick={(e) => setAddMenuAnchor(e.currentTarget)}
                  sx={{
                    borderRadius: "0 8px 8px 0",
                    minWidth: 32,
                    px: 0.5,
                  }}>
                  <ArrowDropDownIcon />
                </Button>
              )}
            </ButtonGroup>
            {hasAssociatedLesson && (
              <Menu
                anchorEl={addMenuAnchor}
                open={Boolean(addMenuAnchor)}
                onClose={() => setAddMenuAnchor(null)}
              >
                <MenuItem onClick={() => { setAddMenuAnchor(null); addHeader(); }}>
                  <AddIcon sx={{ mr: 1 }} /> {Locale.label("plans.serviceOrder.addSection")}
                </MenuItem>
                <MenuItem onClick={() => { setAddMenuAnchor(null); handleAddLesson(); }}>
                  <MenuBookIcon sx={{ mr: 1 }} /> {Locale.label("plans.serviceOrder.addLesson")}
                </MenuItem>
              </Menu>
            )}
          </>
        )}
      </Stack>
    ),
    [props.plan?.id, addHeader, canEdit, addMenuAnchor, hasAssociatedLesson, venueName, handleDisassociateLesson, handleAddLesson]
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

  const renderPlanItems = () => {
    const result: JSX.Element[] = [];
    let cumulativeTime = 0;

    planItems.forEach((pi, index) => {
      const sectionStartTime = cumulativeTime;

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
                  mb: 1,
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
                }}
                startTime={sectionStartTime}
                associatedVenueId={hasAssociatedContent ? getContentPath() : undefined}
                associatedProviderId={props.plan?.providerId || (hasAssociatedContent ? "lessonschurch" : undefined)}
                ministryId={props.plan?.ministryId}
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
              associatedVenueId={hasAssociatedContent ? getContentPath() : undefined}
              associatedProviderId={props.plan?.providerId || (hasAssociatedContent ? "lessonschurch" : undefined)}
              ministryId={props.plan?.ministryId}
            />
          )}
        </React.Fragment>
      );

      cumulativeTime += getSectionDuration(pi);
    });

    return result;
  };

  React.useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Load venue name when there's an associated lesson
  React.useEffect(() => {
    loadVenueName();
  }, [loadVenueName]);

  // Load preview lesson items when plan has associated lesson but no plan items
  React.useEffect(() => {
    loadPreviewLessonItems();
  }, [loadPreviewLessonItems]);

  return (
    <Box>
      {editPlanItem && canEdit && (
        <Box sx={{ mb: 3 }}>
          <PlanItemEdit
            planItem={editPlanItem}
            onDone={() => {
              setEditPlanItem(null);
              loadData();
            }}
          />
        </Box>
      )}

      <LessonSelector
        open={showAssociateLessonSelector}
        onClose={() => setShowAssociateLessonSelector(false)}
        onSelect={handleAssociateLesson}
        returnVenueName={true}
        ministryId={props.plan?.ministryId}
        defaultProviderId={props.plan?.providerId}
      />

      <Card
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "var(--border-light)",
          transition: "all 0.2s ease-in-out",
          "&:hover": { boxShadow: 2 },
        }}>
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AlbumIcon sx={{ color: "primary.main", fontSize: 28 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                {Locale.label("plans.serviceOrder.orderOfService")}
              </Typography>
            </Stack>
            {editContent}
          </Stack>

          <Box
            sx={{
              minHeight: 200,
              p: 3,
              border: "1px dashed",
              borderColor: "var(--border-main)",
              borderRadius: 2,
              backgroundColor: "var(--bg-sub)",
            }}>
            <DndProvider backend={HTML5Backend}>
              {planItems.length === 0 ? (
                showPreviewMode ? (
                  <LessonPreview
                    lessonItems={previewLessonItems}
                    venueName={venueName}
                    onCustomize={handleCustomizeLesson}
                  />
                ) : (
                  <Box
                    sx={{
                      textAlign: "center",
                      py: 4,
                      color: "text.secondary",
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
                          mb: 1,
                        }}
                      />
                    </DroppableWrapper>
                  )}
                </>
              )}
            </DndProvider>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
});
