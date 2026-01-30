import React, { useMemo } from "react";
import { Icon, Menu, MenuItem } from "@mui/material";
import { type ExternalVenueRefInterface } from "@churchapps/helpers";
import { type PlanItemInterface } from "../../helpers";
import { DraggableWrapper } from "../../components/DraggableWrapper";
import { DroppableWrapper } from "../../components/DroppableWrapper";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { MarkdownPreviewLight } from "@churchapps/apphelper-markdown";
import { getProvider, type ContentFolder, type ContentProvider } from "@churchapps/content-provider-helper";
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
  externalRef?: ExternalVenueRefInterface;
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

export const PlanItem = React.memo((props: Props) => {
  // Get the provider dynamically: use item's providerId, fall back to associatedProviderId, then default to lessonschurch
  const provider: ContentProvider | null = useMemo(() => {
    const pid = props.planItem.providerId || props.associatedProviderId || "lessonschurch";
    return getProvider(pid);
  }, [props.planItem.providerId, props.associatedProviderId]);

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

  const handleActionSelected = async (actionId: string, actionName: string, seconds?: number, selectedProviderId?: string, itemType?: "providerSection" | "providerPresentation" | "providerFile", image?: string, mediaUrl?: string) => {
    setShowActionSelector(false);
    // Use selectedProviderId if provided (from browse other providers), otherwise use current provider
    const itemProviderId = selectedProviderId || props.planItem.providerId || props.associatedProviderId || "lessonschurch";
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
      // Store media URL in link field for direct preview (non-Lessons.church providers)
      // For file items, use mediaUrl if available, otherwise fall back to image
      link: linkValue,
    };
    await ApiHelper.post("/planItems", [newPlanItem], "DoingApi");
    if (props.onChange) props.onChange();
  };

  // Expand a section item to replace it with individual action/presentation items
  const handleExpandToActions = async () => {
    if (!props.planItem.relatedId || !props.associatedVenueId || !provider) return;

    try {
      let actions: { id: string; name: string; seconds?: number }[] = [];
      const itemProviderId = props.planItem.providerId || props.associatedProviderId || "lessonschurch";

      if (props.externalRef) {
        // For external providers, still use the API endpoint
        const venueData = await ApiHelper.getAnonymous(
          `/externalProviders/${props.externalRef.externalProviderId}/venue/${props.externalRef.venueId}/actions`,
          "LessonsApi"
        );
        // Find the section matching this plan item's relatedId
        const matchingSection = venueData?.sections?.find((s: any) => s.id === props.planItem.relatedId);
        actions = matchingSection?.actions || [];
      } else {
        // Use ContentProviderHelper
        const venueFolder = createVenueFolder(props.associatedVenueId);
        const instructions = await provider.getExpandedInstructions(venueFolder);

        if (instructions) {
          // Find the section matching this plan item's relatedId
          // Instructions structure: items (headers) -> children (sections) -> children (actions)
          for (const header of instructions.items) {
            for (const section of header.children || []) {
              if (section.relatedId === props.planItem.relatedId && section.children) {
                actions = section.children.map(action => ({
                  id: action.relatedId || action.id || "",
                  name: action.label || "",
                  seconds: action.seconds
                }));
                break;
              }
            }
            if (actions.length > 0) break;
          }
        }
      }

      if (actions.length > 0) {
        const currentSort = props.planItem.sort || 1;

        // Create new plan items for each action/presentation, starting at the current item's sort position
        const actionItems = actions.map((action, index) => ({
          planId: props.planItem.planId,
          parentId: props.planItem.parentId,
          sort: currentSort + index,
          itemType: "providerPresentation",
          relatedId: action.id,
          label: action.name,
          seconds: action.seconds || 0,
          providerId: itemProviderId,
        }));

        // Delete the original section item first
        await ApiHelper.delete(`/planItems/${props.planItem.id}`, "DoingApi");

        // Create the new action items
        await ApiHelper.post("/planItems", actionItems, "DoingApi");

        // Refresh the plan - the API will handle re-sorting
        if (props.onChange) props.onChange();
      }
    } catch (error) {
      console.error("Error expanding section to actions:", error);
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
            <PlanItem key={c.id} planItem={c} setEditPlanItem={props.setEditPlanItem} readOnly={props.readOnly} showItemDrop={props.showItemDrop} onDragChange={props.onDragChange} onChange={props.onChange} startTime={childStartTime} associatedVenueId={props.associatedVenueId} associatedProviderId={props.associatedProviderId} externalRef={props.externalRef} ministryId={props.ministryId} />
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
          {props.planItem.relatedId ? (
            <a href="about:blank" onClick={(e) => { e.preventDefault(); setLessonSectionId(props.planItem.relatedId); }}>
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
      // New generic provider types + short names + legacy types for backward compat
      case "providerPresentation":
      case "lessonAction":
      case "action":
        return getActionRow();
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
          onExpandToActions={props.associatedVenueId && props.planItem.relatedId ? async () => {
            setLessonSectionId(null);
            await handleExpandToActions();
          } : undefined}
          externalRef={props.externalRef}
        />
      )}
      {actionId && (
        <ActionDialog
          actionId={actionId}
          actionName={props.planItem.label}
          onClose={() => setActionId(null)}
          externalRef={props.externalRef}
          providerId={props.planItem.providerId || props.associatedProviderId}
          embedUrl={props.planItem.link}
        />
      )}
      {addOnId && (
        <AddOnDialog
          addOnId={addOnId}
          addOnName={props.planItem.label}
          onClose={() => setAddOnId(null)}
          providerId={props.planItem.providerId || props.associatedProviderId}
          embedUrl={props.planItem.link}
        />
      )}
      {showActionSelector && (
        <ActionSelector
          open={showActionSelector}
          onClose={() => setShowActionSelector(false)}
          onSelect={handleActionSelected}
          contentPath={props.associatedVenueId}
          providerId={props.associatedProviderId || "lessonschurch"}
          ministryId={props.ministryId}
        />
      )}
    </>
  );
});
