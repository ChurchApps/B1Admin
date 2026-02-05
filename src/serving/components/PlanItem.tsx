import React from "react";
import { Icon, Menu, MenuItem } from "@mui/material";
import { type PlanItemInterface } from "../../helpers";
import { DraggableWrapper } from "../../components/DraggableWrapper";
import { DroppableWrapper } from "../../components/DroppableWrapper";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { MarkdownPreviewLight } from "@churchapps/apphelper-markdown";
import { navigateToPath, type Instructions, type InstructionItem } from "@churchapps/content-provider-helper";
import { SongDialog } from "./SongDialog";
import { LessonDialog } from "./LessonDialog";
import { ActionDialog } from "./ActionDialog";
import { AddOnDialog } from "./AddOnDialog";
import { ActionSelector } from "./ActionSelector";
import { formatTime, getSectionDuration } from "./PlanUtils";

interface Props {
  planItem: PlanItemInterface;
  showItemDrop?: boolean;
  onDragChange?: (isDragging: boolean) => void;
  setEditPlanItem: (pi: PlanItemInterface) => void;
  onChange?: () => void;
  readOnly?: boolean;
  startTime?: number;
  associatedVenueId?: string;
  associatedProviderId?: string;
  ministryId?: string;
}

export const PlanItem = React.memo((props: Props) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [dialogKeyId, setDialogKeyId] = React.useState<string>(null);
  const [lessonSectionId, setLessonSectionId] = React.useState<string>(null);
  const [actionId, setActionId] = React.useState<string>(null);
  const [addOnId, setAddOnId] = React.useState<string>(null);
  const [showActionSelector, setShowActionSelector] = React.useState(false);
  const open = Boolean(anchorEl);

  const handleClose = () => {
    setAnchorEl(null);
  };

  const addSong = () => {
    handleClose();
    props.setEditPlanItem({
      itemType: "arrangementKey",
      planId: props.planItem.planId,
      sort: props.planItem.children?.length + 1 || 1,
      parentId: props.planItem.id,
    });
  };

  const addItem = () => {
    handleClose();
    props.setEditPlanItem({
      itemType: "item",
      planId: props.planItem.planId,
      sort: props.planItem.children?.length + 1 || 1,
      parentId: props.planItem.id,
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
      sort: props.planItem.children?.length + 1 || 1,
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
    };
    await ApiHelper.post("/planItems", [newPlanItem], "DoingApi");
    if (props.onChange) props.onChange();
  };

  // Expand a section item to replace it with individual action/presentation items
  const handleExpandToActions = async () => {
    // Provider-based expansion (uses providerId, providerPath, providerContentPath)
    if (props.planItem.providerId && props.planItem.providerPath && props.planItem.providerContentPath) {
      await handleExpandToActionsViaProvider();
      return;
    }

    // Cannot expand without provider path data
    console.warn("Cannot expand section: no providerPath available");
  };

  // Expand a section via provider fields (providerId, providerPath, providerContentPath)
  const handleExpandToActionsViaProvider = async () => {
    const { providerId, providerPath, providerContentPath, planId, parentId, sort } = props.planItem;
    if (!providerId || !providerPath || !providerContentPath || !props.ministryId) return;

    try {
      // Fetch instructions via API proxy
      const instructions: Instructions = await ApiHelper.post(
        "/providerProxy/getInstructions",
        { ministryId: props.ministryId, providerId, path: providerPath },
        "DoingApi"
      );

      if (!instructions?.items) return;

      // Navigate to specific section using providerContentPath
      const section = navigateToPath(instructions, providerContentPath);
      if (!section?.children || section.children.length === 0) return;

      const currentSort = sort || 1;

      // Create new plan items for each action
      const actionItems = section.children.map((action: InstructionItem, index: number) => ({
        planId,
        parentId,
        sort: currentSort + index,
        itemType: "providerPresentation",
        relatedId: action.relatedId || action.id || "",
        label: action.label || "",
        seconds: action.seconds || 0,
        providerId,
        providerPath,
        providerContentPath: `${providerContentPath}.${index}`,
      }));

      // Delete original section, create new action items
      await ApiHelper.delete(`/planItems/${props.planItem.id}`, "DoingApi");
      await ApiHelper.post("/planItems", actionItems, "DoingApi");

      if (props.onChange) props.onChange();
    } catch (error) {
      console.error("Error expanding section via provider:", error);
    }
  };

  const handleDrop = (data: any, sort: number) => {
    const pi = data.data as PlanItemInterface;
    pi.sort = sort;
    pi.parentId = props.planItem.id;
    ApiHelper.post("/planItems/sort", pi, "DoingApi").then(() => {
      if (props.onChange) props.onChange();
    });
  };

  const getChildren = () => {
    const result: JSX.Element[] = [];
    let cumulativeTime = props.startTime || 0;
    props.planItem.children?.forEach((c, index) => {
      const childStartTime = cumulativeTime;
      result.push(
        <>
          {props.showItemDrop && (
            <DroppableWrapper
              accept="planItem"
              onDrop={(item) => {
                handleDrop(item, index + 0.5);
              }}>
              <div
                style={{
                  height: "30px",
                  border: "2px dashed #1976d2",
                  borderRadius: "4px",
                  backgroundColor: "rgba(25, 118, 210, 0.1)",
                  opacity: 0.3,
                  marginBottom: "4px",
                }}
              />
            </DroppableWrapper>
          )}

          <DraggableWrapper
            dndType="planItem"
            data={c}
            draggingCallback={(isDragging) => {
              if (props.onDragChange) props.onDragChange(isDragging);
            }}>
            <PlanItem key={c.id} planItem={c} setEditPlanItem={props.setEditPlanItem} readOnly={props.readOnly} showItemDrop={props.showItemDrop} onDragChange={props.onDragChange} onChange={props.onChange} startTime={childStartTime} associatedVenueId={props.associatedVenueId} associatedProviderId={props.associatedProviderId} ministryId={props.ministryId} />
          </DraggableWrapper>
        </>
      );
      cumulativeTime += c.seconds || 0;
    });
    if (props.showItemDrop) {
      result.push(
        <>
          <DroppableWrapper
            accept="planItem"
            onDrop={(item) => {
              handleDrop(item, props.planItem.children?.length + 1);
            }}>
            <div
              style={{
                height: "30px",
                border: "2px dashed #1976d2",
                borderRadius: "4px",
                backgroundColor: "rgba(25, 118, 210, 0.1)",
                opacity: 0.3,
                marginBottom: "4px",
              }}
            />
          </DroppableWrapper>
        </>
      );
    }
    return result;
  };

  const getHeaderRow = () => {
    const sectionDuration = getSectionDuration(props.planItem);
    return (
      <>
        <div className="planItemHeader">
          <span style={{ float: "right", display: "flex", alignItems: "center", gap: 4 }}>
            {sectionDuration > 0 && <Icon style={{ fontSize: 16, color: "var(--text-muted)" }}>schedule</Icon>}
            <span style={{ color: "var(--text-muted)", fontSize: "0.9em", minWidth: 40, textAlign: "right" }}>
              {sectionDuration > 0 ? formatTime(sectionDuration) : ""}
            </span>
            {!props.readOnly && (
              <>
                <button
                  type="button"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "#1976d2" }}>
                  <Icon>add</Icon>
                </button>
                <button
                  type="button"
                  onClick={() => props.setEditPlanItem(props.planItem)}
                  style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "#1976d2" }}>
                  <Icon>edit</Icon>
                </button>
              </>
            )}
          </span>
          {!props.readOnly && <Icon style={{ float: "left", color: "var(--text-muted)" }}>drag_indicator</Icon>}
          <span>{props.planItem.label}</span>
        </div>
        {getChildren()}
      </>
    );
  };

  const getItemRow = () => (
    <>
      <div className="planItem">
        <span style={{ float: "right", display: "flex", alignItems: "center", gap: 4 }}>
          <Icon style={{ fontSize: 16, color: "var(--text-muted)" }}>schedule</Icon>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9em", minWidth: 40, textAlign: "right" }}>
            {formatTime(props.planItem.seconds)}
          </span>
          {!props.readOnly && (
            <>
              <span style={{ width: 24 }} />
              <button
                type="button"
                onClick={() => props.setEditPlanItem(props.planItem)}
                style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "#1976d2" }}>
                <Icon>edit</Icon>
              </button>
            </>
          )}
        </span>
        {!props.readOnly && <Icon style={{ float: "left", color: "var(--text-muted)" }}>drag_indicator</Icon>}
        <div>{formatTime(props.startTime || 0)}</div>
        <div>
          {props.planItem.relatedId ? (
            <a href="about:blank" onClick={(e) => { e.preventDefault(); setLessonSectionId(props.planItem.relatedId); }}>
              {props.planItem.label}
            </a>
          ) : props.planItem.link ? (
            <a href={props.planItem.link} target="_blank" rel="noopener noreferrer">
              {props.planItem.label}
            </a>
          ) : (
            props.planItem.label
          )}
        </div>
        {getDescriptionRow()}
      </div>
    </>
  );

  const getSongRow = () => (
    <>
      <div className="planItem">
        <span style={{ float: "right", display: "flex", alignItems: "center", gap: 4 }}>
          <Icon style={{ fontSize: 16, color: "var(--text-muted)" }}>schedule</Icon>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9em", minWidth: 40, textAlign: "right" }}>
            {formatTime(props.planItem.seconds)}
          </span>
          {!props.readOnly && (
            <>
              <span style={{ width: 24 }} />
              <button
                type="button"
                onClick={() => props.setEditPlanItem(props.planItem)}
                style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "#1976d2" }}>
                <Icon>edit</Icon>
              </button>
            </>
          )}
        </span>
        {!props.readOnly && <Icon style={{ float: "left", color: "var(--text-muted)" }}>drag_indicator</Icon>}
        <div>{formatTime(props.startTime || 0)}</div>
        <div>
          {props.planItem.relatedId ? (
            <a href="about:blank" onClick={(e) => { e.preventDefault(); setDialogKeyId(props.planItem.relatedId); }}>
              {props.planItem.label}
            </a>
          ) : (
            props.planItem.label
          )}
        </div>
        {getDescriptionRow()}
      </div>
    </>
  );

  const getDescriptionRow = () => (
    <div
      className="planItemDescription"
      style={{
        clear: "both",
        width: "100%",
        paddingTop: "8px",
        paddingBottom: "8px",
        paddingLeft: "22px",
        fontStyle: "italic",
        color: "#777"
      }}
    >
      <MarkdownPreviewLight value={props.planItem.description || ""} />
    </div>
  );

  const getActionRow = () => (
    <>
      <div className="planItem">
        <span style={{ float: "right", display: "flex", alignItems: "center", gap: 4 }}>
          <Icon style={{ fontSize: 16, color: "var(--text-muted)" }}>schedule</Icon>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9em", minWidth: 40, textAlign: "right" }}>
            {formatTime(props.planItem.seconds)}
          </span>
          {!props.readOnly && (
            <>
              <span style={{ width: 24 }} />
              <button
                type="button"
                onClick={() => props.setEditPlanItem(props.planItem)}
                style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "#1976d2" }}>
                <Icon>edit</Icon>
              </button>
            </>
          )}
        </span>
        {!props.readOnly && <Icon style={{ float: "left", color: "var(--text-muted)" }}>drag_indicator</Icon>}
        <div>{formatTime(props.startTime || 0)}</div>
        <div>
          {props.planItem.relatedId ? (
            <a href="about:blank" onClick={(e) => { e.preventDefault(); setActionId(props.planItem.relatedId); }}>
              {props.planItem.label}
            </a>
          ) : (
            props.planItem.label
          )}
        </div>
        {getDescriptionRow()}
      </div>
    </>
  );

  const getLessonSectionRow = () => (
    <>
      <div className="planItem">
        <span style={{ float: "right", display: "flex", alignItems: "center", gap: 4 }}>
          <Icon style={{ fontSize: 16, color: "var(--text-muted)" }}>schedule</Icon>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9em", minWidth: 40, textAlign: "right" }}>
            {formatTime(props.planItem.seconds)}
          </span>
          {!props.readOnly && (
            <>
              <span style={{ width: 24 }} />
              <button
                type="button"
                onClick={() => props.setEditPlanItem(props.planItem)}
                style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "#1976d2" }}>
                <Icon>edit</Icon>
              </button>
            </>
          )}
        </span>
        {!props.readOnly && <Icon style={{ float: "left", color: "var(--text-muted)" }}>drag_indicator</Icon>}
        <div>{formatTime(props.startTime || 0)}</div>
        <div>
          {(props.planItem.relatedId || (props.planItem.providerId && props.planItem.providerPath && props.planItem.providerContentPath)) ? (
            <a href="about:blank" onClick={(e) => { e.preventDefault(); setLessonSectionId(props.planItem.relatedId || props.planItem.providerContentPath || props.planItem.id); }}>
              {props.planItem.label}
            </a>
          ) : (
            props.planItem.label
          )}
        </div>
        {getDescriptionRow()}
      </div>
    </>
  );

  const getAddOnRow = () => (
    <>
      <div className="planItem">
        <span style={{ float: "right", display: "flex", alignItems: "center", gap: 4 }}>
          <Icon style={{ fontSize: 16, color: "var(--text-muted)" }}>schedule</Icon>
          <span style={{ color: "var(--text-muted)", fontSize: "0.9em", minWidth: 40, textAlign: "right" }}>
            {formatTime(props.planItem.seconds)}
          </span>
          {!props.readOnly && (
            <>
              <span style={{ width: 24 }} />
              <button
                type="button"
                onClick={() => props.setEditPlanItem(props.planItem)}
                style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "#1976d2" }}>
                <Icon>edit</Icon>
              </button>
            </>
          )}
        </span>
        {!props.readOnly && <Icon style={{ float: "left", color: "var(--text-muted)" }}>drag_indicator</Icon>}
        <div>{formatTime(props.startTime || 0)}</div>
        <div>
          {props.planItem.relatedId ? (
            <a href="about:blank" onClick={(e) => { e.preventDefault(); setAddOnId(props.planItem.relatedId); }}>
              {props.planItem.label}
            </a>
          ) : (
            props.planItem.label
          )}
        </div>
        {getDescriptionRow()}
      </div>
    </>
  );

  const getPlanItem = () => {
    switch (props.planItem.itemType) {
      case "header":
        return getHeaderRow();
      case "song":
      case "arrangementKey":
        return getSongRow();
      // Action types
      case "providerPresentation":
      case "lessonAction":
      case "action":
        return getActionRow();
      // File/add-on types (legacy items still in database need AddOnDialog for correct embed URLs)
      case "providerFile":
      case "lessonAddOn":
      case "addon":
      case "file":
        return getAddOnRow();
      case "providerSection":
      case "lessonSection":
      case "section":
        return getLessonSectionRow();
      case "item":
      default:
        return getItemRow();
    }
  };

  return (
    <>
      {getPlanItem()}
      {props.planItem?.itemType === "header" && !props.readOnly && (
        <Menu id="header-menu" anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MenuItem onClick={addSong}>
            <Icon style={{ marginRight: 10 }}>music_note</Icon> {Locale.label("plans.planItem.song")}
          </MenuItem>
          <MenuItem onClick={addItem}>
            <Icon style={{ marginRight: 10 }}>format_list_bulleted</Icon> {Locale.label("plans.planItem.item")}
          </MenuItem>
          <MenuItem onClick={addLessonAction}>
            <Icon style={{ marginRight: 10 }}>menu_book</Icon> {Locale.label("plans.planItem.externalItem") || "External Item"}
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
            (props.associatedVenueId && props.planItem.relatedId) ||
            (props.planItem.providerId && props.planItem.providerPath && props.planItem.providerContentPath)
              ? async () => {
                  setLessonSectionId(null);
                  await handleExpandToActions();
                }
              : undefined
          }
          providerId={props.planItem.providerId}
          embedUrl={props.planItem.link}
          providerPath={props.planItem.providerPath}
          providerContentPath={props.planItem.providerContentPath}
          ministryId={props.ministryId}
        />
      )}
      {actionId && (
        <ActionDialog
          actionId={actionId}
          actionName={props.planItem.label}
          onClose={() => setActionId(null)}
          providerId={props.planItem.providerId || props.associatedProviderId}
          embedUrl={props.planItem.link}
          providerPath={props.planItem.providerPath}
          providerContentPath={props.planItem.providerContentPath}
          ministryId={props.ministryId}
        />
      )}
      {addOnId && (
        <AddOnDialog
          addOnId={addOnId}
          addOnName={props.planItem.label}
          onClose={() => setAddOnId(null)}
          providerId={props.planItem.providerId || props.associatedProviderId}
          embedUrl={props.planItem.link}
          providerPath={props.planItem.providerPath}
          providerContentPath={props.planItem.providerContentPath}
          ministryId={props.ministryId}
        />
      )}
      {showActionSelector && (
        <ActionSelector
          open={showActionSelector}
          onClose={() => setShowActionSelector(false)}
          onSelect={handleActionSelected}
          contentPath={props.associatedVenueId}
          providerId={props.associatedProviderId}
          ministryId={props.ministryId}
        />
      )}
    </>
  );
});
