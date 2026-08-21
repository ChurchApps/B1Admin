import React from "react";
import { Menu, MenuItem } from "@mui/material";
import { FormatListBulleted as FormatListBulletedIcon, MenuBook as MenuBookIcon, MusicNote as MusicNoteIcon } from "@mui/icons-material";
import { type PlanItemInterface } from "../../helpers";
import { DraggableWrapper } from "../../components/DraggableWrapper";
import { RowDropZone } from "./RowDropZone";
import { type TimeInterface, type PlanItemTimeInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { SongDialog } from "./SongDialog";
import { LessonDialog } from "./LessonDialog";
import { getNextChildSort, estimateSeconds, duplicatePlanItem, findExpandedRuns, type ProviderMediaInfo } from "./planItemUtils";
import { ActionDialog } from "./ActionDialog";
import { ActionSelector } from "./ActionSelector";
import { PlanItemHeader, PlanItemRow } from "./planItem/index";
import { usePlanItemExpand } from "./planItem/usePlanItemExpand";
import { useConfirmDelete } from "../../hooks";

interface Props {
  planItem: PlanItemInterface;
  showItemDrop?: boolean;
  onDragChange?: (isDragging: boolean) => void;
  setEditPlanItem: ((pi: PlanItemInterface) => void) | null;
  onChange?: () => void;
  readOnly?: boolean;
  startTime?: number;
  associatedContentPath?: string;
  associatedProviderId?: string;
  ministryId?: string;
  serviceTime?: TimeInterface | null;
  exclusions?: PlanItemTimeInterface[];
  selectedServiceTimeId?: string;
  excluded?: boolean;
  mediaLookup?: Record<string, ProviderMediaInfo>;
  /** Set on the first item of a run of actions expanded from one section, enabling the collapse control. */
  collapseItems?: PlanItemInterface[];
  positionLabels?: Record<string, { text: string; assigned: boolean }>;
}

export const PlanItem = React.memo((props: Props) => {
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [dialogKeyId, setDialogKeyId] = React.useState<string | null>(null);
  const [lessonSectionId, setLessonSectionId] = React.useState<string | null>(null);
  const [actionId, setActionId] = React.useState<string | null>(null);
  const [showActionSelector, setShowActionSelector] = React.useState(false);
  const open = Boolean(anchorEl);

  // Use the expand hook for section expansion functionality
  const { handleExpandToActions, canCollapse, handleCollapseToSection, handleSaveDescription, handleRestoreOriginal } = usePlanItemExpand({
    planItem: props.planItem,
    associatedProviderId: props.associatedProviderId,
    associatedContentPath: props.associatedContentPath,
    ministryId: props.ministryId,
    collapseItems: props.collapseItems,
    onChange: props.onChange
  });
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const showCollapse = canCollapse && !props.readOnly;
  const handleCollapseClick = async () => {
    const confirmed = await confirm(Locale.label("plans.planItem.collapseToSectionConfirm"), {
      title: Locale.label("plans.planItem.collapseToSection"),
      confirmLabel: Locale.label("plans.planItem.collapseToSection"),
      "data-testid": "confirm-collapse-dialog"
    });
    if (confirmed) await handleCollapseToSection();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const addSong = () => {
    handleClose();
    props.setEditPlanItem?.({
      itemType: "arrangementKey",
      planId: props.planItem.planId,
      sort: getNextChildSort(props.planItem.children),
      parentId: props.planItem.id
    });
  };

  const addItem = () => {
    handleClose();
    props.setEditPlanItem?.({
      itemType: "item",
      planId: props.planItem.planId,
      sort: getNextChildSort(props.planItem.children),
      parentId: props.planItem.id
    });
  };

  const addLessonAction = () => {
    handleClose();
    setShowActionSelector(true);
  };

  const handleActionSelected = async (actionId: string, actionName: string, seconds?: number, selectedProviderId?: string, itemType?: "providerSection" | "providerPresentation" | "providerFile", image?: string, mediaUrl?: string, providerPath?: string, providerContentPath?: string) => {
    setShowActionSelector(false);
    // Use selectedProviderId if provided (from browse other providers), otherwise use current provider
    const itemProviderId = selectedProviderId || props.planItem.providerId || props.associatedProviderId;
    const linkValue = mediaUrl || (itemType === "providerFile" ? image : undefined);
    // Create new plan item - use provided itemType or default to providerPresentation
    const newPlanItem: PlanItemInterface = {
      itemType: itemType || "providerPresentation",
      planId: props.planItem.planId,
      sort: getNextChildSort(props.planItem.children),
      parentId: props.planItem.id,
      relatedId: actionId,
      label: actionName,
      seconds: seconds || 0,
      providerId: itemProviderId,
      providerPath: providerPath,
      providerContentPath: providerContentPath,
      // Store media URL in link field for direct preview (non-Lessons.church providers)
      // For file items, use mediaUrl if available, otherwise fall back to image
      link: linkValue,
      thumbnailUrl: image
    };
    await ApiHelper.post("/planItems", [newPlanItem], "DoingApi");
    if (props.onChange) props.onChange();
  };

  const handleDrop = (data: any, sort: number) => {
    const pi = data.data as PlanItemInterface;
    pi.sort = sort;
    pi.parentId = props.planItem.id;
    ApiHelper.post("/planItems/sort", pi, "DoingApi").then(() => {
      if (props.onChange) props.onChange();
    });
  };

  const duplicating = React.useRef(false);
  const handleDuplicate = async () => {
    if (duplicating.current) return;
    duplicating.current = true;
    try {
      await duplicatePlanItem(props.planItem);
      if (props.onChange) props.onChange();
    } finally {
      duplicating.current = false;
    }
  };

  const isChildExcluded = (childId: string): boolean => {
    if (!props.selectedServiceTimeId) return false;
    return (props.exclusions || []).some((ex) => ex.planItemId === childId && ex.timeId === props.selectedServiceTimeId && ex.excluded);
  };

  const expandedRuns = React.useMemo(
    () => (props.readOnly ? new Map<string, PlanItemInterface[]>() : findExpandedRuns(props.planItem.children || [])),
    [props.planItem.children, props.readOnly]
  );

  const getChildren = () => {
    const result: JSX.Element[] = [];
    let cumulativeTime = props.startTime || 0;
    props.planItem.children?.forEach((c, index) => {
      const childStartTime = cumulativeTime;
      const childExcluded = c.itemType !== "header" && isChildExcluded(c.id || "");
      const childPlanItem = (
        <PlanItem key={c.id} planItem={c} setEditPlanItem={props.setEditPlanItem} readOnly={props.readOnly} showItemDrop={props.showItemDrop} onDragChange={props.onDragChange} onChange={props.onChange} startTime={childStartTime} associatedContentPath={props.associatedContentPath} associatedProviderId={props.associatedProviderId} ministryId={props.ministryId} serviceTime={props.serviceTime} exclusions={props.exclusions} selectedServiceTimeId={props.selectedServiceTimeId} excluded={childExcluded} mediaLookup={props.mediaLookup} collapseItems={expandedRuns.get(c.id || "")} positionLabels={props.positionLabels} />
      );
      result.push(
        <React.Fragment key={c.id || `child-${index}`}>
          {props.readOnly ? (
            childPlanItem
          ) : (
            <RowDropZone
              accept="planItem"
              onDrop={(item, position) => {
                handleDrop(item, index + (position === "before" ? 0.5 : 1.5));
              }}>
              <DraggableWrapper
                dndType="planItem"
                data={c}
                handleClassName="dragHandle"
                draggingCallback={(isDragging) => {
                  if (props.onDragChange) props.onDragChange(isDragging);
                }}>
                {childPlanItem}
              </DraggableWrapper>
            </RowDropZone>
          )}
        </React.Fragment>
      );
      if (!childExcluded) cumulativeTime += estimateSeconds(c, props.mediaLookup);
    });
    return result;
  };

  const getHeaderRow = () => (
    <PlanItemHeader
      planItem={props.planItem}
      startTime={props.startTime}
      serviceStartTime={props.serviceTime?.startTime}
      readOnly={props.readOnly}
      positionLabel={props.planItem.positionId ? props.positionLabels?.[props.planItem.positionId] : undefined}
      onAddClick={(e) => setAnchorEl(e.currentTarget)}
      onEditClick={() => props.setEditPlanItem?.(props.planItem)}
      wrapRow={props.readOnly ? undefined : (row) => (
        <RowDropZone
          accept="planItem"
          mode="into"
          onDrop={(item) => {
            handleDrop(item, 0.5);
          }}>
          {row}
        </RowDropZone>
      )}
    >
      {getChildren()}
    </PlanItemHeader>
  );

  const getGenericRow = (onLabelClick?: () => void) => (
    <PlanItemRow
      planItem={props.planItem}
      startTime={props.startTime}
      serviceStartTime={props.serviceTime?.startTime}
      excluded={props.excluded}
      readOnly={props.readOnly}
      onLabelClick={onLabelClick}
      onEditClick={() => props.setEditPlanItem?.(props.planItem)}
      onDuplicateClick={handleDuplicate}
      onCollapseClick={showCollapse ? handleCollapseClick : undefined}
      onSaveDescription={handleSaveDescription}
      onRestoreOriginal={handleRestoreOriginal}
      mediaLookup={props.mediaLookup}
      positionLabel={props.planItem.positionId ? props.positionLabels?.[props.planItem.positionId] : undefined}
    />
  );

  const getPlanItem = () => {
    switch (props.planItem.itemType) {
      case "header": return getHeaderRow();
      case "song":
      case "arrangementKey": return getGenericRow(props.planItem.relatedId ? () => setDialogKeyId(props.planItem.relatedId || null) : undefined);
      // Action types
      case "providerPresentation":
      case "lessonAction":
      case "action": return getGenericRow(props.planItem.relatedId ? () => setActionId(props.planItem.relatedId || null) : undefined);
      // File/add-on types (legacy items still in database need AddOnDialog for correct embed URLs)
      case "providerFile":
      case "lessonAddOn":
      case "addon":
      case "file": return getGenericRow(props.planItem.relatedId ? () => setActionId(props.planItem.relatedId || null) : undefined);
      case "providerSection":
      case "lessonSection":
      case "section":
        return getGenericRow(
          (props.planItem.relatedId || (props.planItem.providerId && props.planItem.providerPath && props.planItem.providerContentPath))
            ? () => setLessonSectionId(props.planItem.relatedId || props.planItem.providerContentPath || props.planItem.id || null)
            : undefined
        );
      case "item":
      default: return getGenericRow(props.planItem.relatedId ? () => setLessonSectionId(props.planItem.relatedId || null) : undefined);
    }
  };

  return (
    <>
      {getPlanItem()}
      {showCollapse && ConfirmDialogElement}
      {props.planItem?.itemType === "header" && !props.readOnly && (
        <Menu id="header-menu" anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MenuItem onClick={addSong}>
            <MusicNoteIcon sx={{ mr: 1.25 }} /> {Locale.label("plans.planItem.song")}
          </MenuItem>
          <MenuItem onClick={addItem}>
            <FormatListBulletedIcon sx={{ mr: 1.25 }} /> {Locale.label("plans.planItem.item")}
          </MenuItem>
          <MenuItem onClick={addLessonAction}>
            <MenuBookIcon sx={{ mr: 1.25 }} /> {Locale.label("plans.planItem.externalItem") || "External Item"}
          </MenuItem>
        </Menu>
      )}
      {dialogKeyId && <SongDialog arrangementKeyId={dialogKeyId} onClose={() => setDialogKeyId(null)} />}
      {lessonSectionId && (
        <LessonDialog
          sectionId={lessonSectionId}
          sectionName={props.planItem.label}
          onClose={() => setLessonSectionId(null)}
          onExpandToActions={
            !props.readOnly && (
              (props.associatedContentPath && props.planItem.relatedId) ||
              (props.planItem.providerId && props.planItem.providerPath && props.planItem.providerContentPath)
            )
              ? async () => {
                setLessonSectionId(null);
                await handleExpandToActions();
              }
              : undefined
          }
          providerId={props.planItem.providerId}
          downloadUrl={props.planItem.link}
          providerPath={props.planItem.providerPath}
          providerContentPath={props.planItem.providerContentPath}
          relatedId={props.planItem.relatedId}
          ministryId={props.ministryId}
        />
      )}
      {actionId && (
        <ActionDialog
          contentName={props.planItem.label}
          onClose={() => setActionId(null)}
          providerId={props.planItem.providerId || props.associatedProviderId}
          downloadUrl={props.planItem.link}
          providerPath={props.planItem.providerPath}
          providerContentPath={props.planItem.providerContentPath}
          relatedId={props.planItem.relatedId}
          ministryId={props.ministryId}
        />
      )}
      {showActionSelector && (
        <ActionSelector
          open={showActionSelector}
          onClose={() => setShowActionSelector(false)}
          onSelect={handleActionSelected}
          contentPath={props.associatedContentPath}
          providerId={props.associatedProviderId}
          ministryId={props.ministryId}
        />
      )}
    </>
  );
});
