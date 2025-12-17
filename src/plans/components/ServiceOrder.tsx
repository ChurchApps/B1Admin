import React, { memo, useCallback, useMemo } from "react";
import { Stack, Typography, Button, Box, Card, CardContent } from "@mui/material";
import { Print as PrintIcon, Add as AddIcon, Album as AlbumIcon, MenuBook as MenuBookIcon, Edit as EditIcon } from "@mui/icons-material";
import { type PlanInterface } from "@churchapps/helpers";
import { ApiHelper, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { type PlanItemInterface } from "../../helpers";
import { PlanItemEdit } from "./PlanItemEdit";
import { LessonSelector } from "./LessonSelector";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { PlanItem } from "./PlanItem";
import { DraggableWrapper } from "../../components/DraggableWrapper";
import { DroppableWrapper } from "../../components/DroppableWrapper";
import { Link } from "react-router-dom";

interface Props {
  plan: PlanInterface;
}

export const ServiceOrder = memo((props: Props) => {
  const [planItems, setPlanItems] = React.useState<PlanItemInterface[]>([]);
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.plans.edit);
  const [editPlanItem, setEditPlanItem] = React.useState<PlanItemInterface>(null);
  const [showHeaderDrop, setShowHeaderDrop] = React.useState(false);
  const [showItemDrop, setShowItemDrop] = React.useState(false);
  const [showLessonSelector, setShowLessonSelector] = React.useState(false);
  const [itemsFromLesson, setItemsFromLesson] = React.useState(false);

  const loadData = useCallback(async () => {
    if (props.plan?.id) {
      try {
        const data = await ApiHelper.get("/planItems/plan/" + props.plan.id.toString(), "DoingApi");
        setPlanItems(data || []);
        setItemsFromLesson(false);

        // If no plan items and plan has venue content, load from LessonsApi
        if ((!data || data.length === 0) && props.plan.contentType === "venue" && props.plan.contentId) {
          const venueData = await ApiHelper.get(`/venues/public/planItems/${props.plan.contentId}`, "LessonsApi");
          setPlanItems(venueData || []);
          setItemsFromLesson(true);
        }
      } catch (error) {
        console.error("Error loading plan items:", error);
        setPlanItems([]);
        setItemsFromLesson(false);
      }
    }
  }, [props.plan?.id, props.plan?.contentType, props.plan?.contentId]);

  const addHeader = useCallback(() => {
    setEditPlanItem({ itemType: "header", planId: props.plan.id, sort: planItems?.length + 1 || 1 });
  }, [props.plan.id, planItems?.length]);

  const handleLessonSelect = useCallback(async (venueId: string) => {
    const updatedPlan = {
      ...props.plan,
      contentType: "venue",
      contentId: venueId
    };
    try {
      await ApiHelper.post("/plans", updatedPlan, "DoingApi");
      setShowLessonSelector(false);
      // Directly load lesson items using the venueId we just saved
      // (props.plan hasn't updated yet, so we can't rely on loadData)
      const venueData = await ApiHelper.get(`/venues/public/planItems/${venueId}`, "LessonsApi");
      setPlanItems(venueData || []);
      setItemsFromLesson(true);
    } catch (error) {
      console.error("Error updating plan with lesson:", error);
    }
  }, [props.plan]);

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

  const handleCustomize = useCallback(async () => {
    if (!itemsFromLesson || planItems.length === 0) return;

    try {
      // Save hierarchical plan items level by level
      await saveHierarchicalItems(planItems);

      // Clear the lesson association from the plan
      const updatedPlan = {
        ...props.plan,
        contentType: null,
        contentId: null
      };
      await ApiHelper.post("/plans", updatedPlan, "DoingApi");

      // Reload data to show the new editable items
      loadData();
    } catch (error) {
      console.error("Error customizing lesson items:", error);
    }
  }, [itemsFromLesson, planItems, props.plan, loadData]);

  const editContent = useMemo(
    () => (
      <Stack direction="row" spacing={1}>
        <Button
          onClick={() => window.open(`/plans/print/${props.plan?.id}`, '_blank')}
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
            {!itemsFromLesson && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={addHeader}
                size="small"
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 600,
                }}>
                {Locale.label("plans.serviceOrder.addSection")}
              </Button>
            )}
            {itemsFromLesson && planItems.length > 0 && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleCustomize}
                size="small"
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 600,
                }}>
                {Locale.label("plans.serviceOrder.customize")}
              </Button>
            )}
            {(planItems.length === 0 || itemsFromLesson) && (
              <Button
                variant="outlined"
                startIcon={<MenuBookIcon />}
                onClick={() => setShowLessonSelector(true)}
                size="small"
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 600,
                }}>
                {itemsFromLesson ? Locale.label("plans.serviceOrder.switchLesson") : Locale.label("plans.serviceOrder.associateLesson")}
              </Button>
            )}
          </>
        )}
      </Stack>
    ),
    [props.plan?.id, addHeader, canEdit, planItems.length, itemsFromLesson, handleCustomize]
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

  const getSectionDuration = (section: PlanItemInterface) => {
    let totalSeconds = 0;
    section.children?.forEach((child) => {
      if (child.seconds) {
        totalSeconds += child.seconds;
      }
    });
    return totalSeconds;
  };

  const renderPlanItems = () => {
    const result: JSX.Element[] = [];
    let cumulativeTime = 0;

    planItems.forEach((pi, index) => {
      const sectionStartTime = cumulativeTime;

      result.push(
        <React.Fragment key={pi.id || `temp-${index}`}>
          {canEdit && !itemsFromLesson && showHeaderDrop && (
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
          {canEdit && !itemsFromLesson ? (
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
                readOnly={itemsFromLesson}
                startTime={sectionStartTime}
              />
            </DraggableWrapper>
          ) : (
            <PlanItem
              planItem={pi}
              setEditPlanItem={itemsFromLesson ? null : setEditPlanItem}
              showItemDrop={false}
              onDragChange={() => { }}
              onChange={() => { }}
              readOnly={itemsFromLesson}
              startTime={sectionStartTime}
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
        open={showLessonSelector}
        onClose={() => setShowLessonSelector(false)}
        onSelect={handleLessonSelect}
      />

      <Card
        sx={{
          borderRadius: 2,
          border: "1px solid",
          borderColor: "grey.200",
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
              borderColor: "grey.300",
              borderRadius: 2,
              backgroundColor: "grey.50",
            }}>
            <DndProvider backend={HTML5Backend}>
              {planItems.length === 0 ? (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 4,
                    color: "text.secondary",
                  }}>
                  <AlbumIcon sx={{ fontSize: 48, mb: 2, color: "grey.400" }} />
                  <Typography variant="body1">{Locale.label("plans.serviceOrder.noItems")}</Typography>
                </Box>
              ) : (
                <>
                  {renderPlanItems()}
                  {showHeaderDrop && !itemsFromLesson && (
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
