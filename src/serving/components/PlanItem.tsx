import React from "react";
import { Box, Menu, MenuItem } from "@mui/material";
import { Add as AddIcon, DragIndicator as DragIndicatorIcon, Edit as EditIcon, FormatListBulleted as FormatListBulletedIcon, MenuBook as MenuBookIcon, MusicNote as MusicNoteIcon, Schedule as ScheduleIcon } from "@mui/icons-material";
import { type PlanItemInterface } from "../../helpers";
import { DraggableWrapper } from "../../components/DraggableWrapper";
import { DroppableWrapper } from "../../components/DroppableWrapper";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { MarkdownPreviewLight } from "@churchapps/apphelper-markdown";
import { navigateToPath, type Instructions, type InstructionItem } from "@churchapps/content-provider-helper";
import { SongDialog } from "./SongDialog";

// Helper to find thumbnail recursively in instruction tree
function findThumbnailRecursive(item: InstructionItem): string | undefined {
  if (item.thumbnail) return item.thumbnail;
  if (item.children) {
    for (const child of item.children) {
      const found = findThumbnailRecursive(child);
      if (found) return found;
    }
  }
  return undefined;
}
import { LessonDialog } from "./LessonDialog";
import { ActionDialog } from "./ActionDialog";
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
      thumbnailUrl: image,
    };
    await ApiHelper.post("/planItems", [newPlanItem], "DoingApi");
    if (props.onChange) props.onChange();
  };

  // Expand a section item to replace it with individual action/presentation items
  const handleExpandToActions = async () => {
    // Provider-based expansion (uses providerId, providerPath, providerContentPath on the item itself)
    if (props.planItem.providerId && props.planItem.providerPath && props.planItem.providerContentPath) {
      await handleExpandToActionsViaProvider();
      return;
    }

    // Fall back to plan-level provider data for legacy items that only have relatedId
    if (props.associatedProviderId && props.associatedVenueId && props.planItem.relatedId) {
      await handleExpandToActionsLegacy();
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
        thumbnailUrl: findThumbnailRecursive(action),
      }));

      // Delete original section, create new action items
      await ApiHelper.delete(`/planItems/${props.planItem.id}`, "DoingApi");
      await ApiHelper.post("/planItems", actionItems, "DoingApi");

      if (props.onChange) props.onChange();
    } catch (error) {
      console.error("Error expanding section via provider:", error);
    }
  };

  // Expand a section using plan-level provider data for legacy items (only have relatedId, no per-item provider fields)
  const handleExpandToActionsLegacy = async () => {
    const providerId = props.associatedProviderId;
    const providerPath = props.associatedVenueId;
    if (!providerId || !providerPath || !props.ministryId) return;

    try {
      const instructions: Instructions = await ApiHelper.post(
        "/providerProxy/getInstructions",
        { ministryId: props.ministryId, providerId, path: providerPath },
        "DoingApi"
      );

      if (!instructions?.items) return;

      // Search the instruction tree for a matching relatedId
      const findSection = (items: InstructionItem[], parentPath: string): { item: InstructionItem; path: string } | null => {
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const currentPath = parentPath ? `${parentPath}.${i}` : `${i}`;
          if (item.relatedId === props.planItem.relatedId || item.id === props.planItem.relatedId) {
            return { item, path: currentPath };
          }
          if (item.children) {
            const found = findSection(item.children, currentPath);
            if (found) return found;
          }
        }
        return null;
      };

      const found = findSection(instructions.items, "");
      if (!found || !found.item.children || found.item.children.length === 0) return;

      const section = found.item;
      const currentSort = props.planItem.sort || 1;

      const actionItems = section.children.map((action: InstructionItem, index: number) => ({
        planId: props.planItem.planId,
        parentId: props.planItem.parentId,
        sort: currentSort + index,
        itemType: "providerPresentation",
        relatedId: action.relatedId || action.id || "",
        label: action.label || "",
        seconds: action.seconds || 0,
        providerId,
        providerPath,
        providerContentPath: `${found.path}.${index}`,
        thumbnailUrl: findThumbnailRecursive(action),
      }));

      await ApiHelper.delete(`/planItems/${props.planItem.id}`, "DoingApi");
      await ApiHelper.post("/planItems", actionItems, "DoingApi");
      if (props.onChange) props.onChange();
    } catch (error) {
      console.error("Error expanding section via legacy association:", error);
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
        <React.Fragment key={c.id || `child-${index}`}>
          {props.showItemDrop && (
            <DroppableWrapper
              accept="planItem"
              onDrop={(item) => {
                handleDrop(item, index + 0.5);
              }}>
              <Box
                sx={{
                  height: "30px",
                  border: "2px dashed",
                  borderColor: "primary.main",
                  borderRadius: 1,
                  backgroundColor: "primary.light",
                  opacity: 0.3,
                  mb: 0.5,
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
        </React.Fragment>
      );
      cumulativeTime += c.seconds || 0;
    });
    if (props.showItemDrop) {
      result.push(
        <React.Fragment key="trailing-drop-zone">
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
        </React.Fragment>
      );
    }
    return result;
  };

  const getHeaderRow = () => {
    const sectionDuration = getSectionDuration(props.planItem);
    return (
      <>
        <div className="planItemHeader" style={{ display: "flex", alignItems: "center" }}>
          <div className="timeRailCell">
            <span className="timeRailLabel">{formatTime(props.startTime || 0)}</span>
            <span className="timeRailDot" />
            <span className="timeRailLine" />
          </div>
          {!props.readOnly && <DragIndicatorIcon className="dragHandle" style={{ color: "var(--text-muted)" }} />}
          <span style={{ flex: 1 }}>{props.planItem.label}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {sectionDuration > 0 && <ScheduleIcon style={{ fontSize: 16, color: "var(--text-muted)" }} />}
            <span style={{ color: "var(--text-muted)", fontSize: "0.9em", minWidth: 40, textAlign: "right" }}>
              {sectionDuration > 0 ? formatTime(sectionDuration) : ""}
            </span>
            {!props.readOnly && (
              <>
                <button
                  type="button"
                  className="actionButton"
                  onClick={(e) => setAnchorEl(e.currentTarget)}
                  style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "#1976d2" }}>
                  <AddIcon />
                </button>
                <button
                  type="button"
                  className="actionButton"
                  onClick={() => props.setEditPlanItem(props.planItem)}
                  style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "#1976d2" }}>
                  <EditIcon />
                </button>
              </>
            )}
          </span>
        </div>
        {getChildren()}
      </>
    );
  };

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

  const getItemIcon = () => {
    const iconStyle = { fontSize: 32, color: "var(--text-muted)" };
    switch (props.planItem.itemType) {
      case "song":
      case "arrangementKey":
        return <MusicNoteIcon style={iconStyle} />;
      case "providerSection":
      case "lessonSection":
      case "section":
      case "providerPresentation":
      case "lessonAction":
      case "action":
      case "providerFile":
      case "lessonAddOn":
      case "addon":
      case "file":
        return <MenuBookIcon style={iconStyle} />;
      case "item":
      default:
        return <FormatListBulletedIcon style={iconStyle} />;
    }
  };

  const getGenericRow = (onLabelClick?: () => void) => (
    <>
      <div className="planItem" style={{ display: "flex", alignItems: "center" }}>
        <div className="timeRailCell">
          <span className="timeRailLabel">{formatTime(props.startTime || 0)}</span>
          <span className="timeRailDot" />
          <span className="timeRailLine" />
        </div>
        {!props.readOnly && <DragIndicatorIcon className="dragHandle" style={{ color: "var(--text-muted)", flexShrink: 0 }} />}
        <div style={{ width: 80, height: 45, marginRight: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {props.planItem.thumbnailUrl ? (
            <img
              src={props.planItem.thumbnailUrl}
              alt=""
              style={{ width: 80, height: 45, objectFit: "cover", borderRadius: 8 }}
              onError={(e) => { e.currentTarget.style.display = "none"; e.currentTarget.nextElementSibling && ((e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex"); }}
            />
          ) : null}
          <span style={{ display: props.planItem.thumbnailUrl ? "none" : "flex", alignItems: "center", justifyContent: "center", width: 80, height: 45, backgroundColor: "#e0e0e0", borderRadius: 8 }}>
            {getItemIcon()}
          </span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div>
            {onLabelClick ? (
              <button type="button" onClick={onLabelClick}
                style={{ background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer", font: "inherit" }}>
                {props.planItem.label}
              </button>
            ) : props.planItem.link ? (
              <a href={props.planItem.link} target="_blank" rel="noopener noreferrer">
                {props.planItem.label}
              </a>
            ) : (
              props.planItem.label
            )}
          </div>
          {props.planItem.description && getDescriptionRow()}
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 8 }}>
          <ScheduleIcon style={{ fontSize: 16, color: "var(--text-muted)" }} />
          <span title="Duration" style={{ color: "var(--text-muted)", fontSize: "0.9em", minWidth: 40, textAlign: "right" }}>
            {formatTime(props.planItem.seconds)}
          </span>
          {!props.readOnly && (
            <>
              <span style={{ width: 24 }} />
              <button
                type="button"
                className="actionButton"
                onClick={() => props.setEditPlanItem(props.planItem)}
                style={{ background: "none", border: 0, padding: 0, cursor: "pointer", color: "#1976d2" }}>
                <EditIcon />
              </button>
            </>
          )}
        </span>
      </div>
    </>
  );

  const getPlanItem = () => {
    switch (props.planItem.itemType) {
      case "header":
        return getHeaderRow();
      case "song":
      case "arrangementKey":
        return getGenericRow(props.planItem.relatedId ? () => setDialogKeyId(props.planItem.relatedId) : undefined);
      // Action types
      case "providerPresentation":
      case "lessonAction":
      case "action":
        return getGenericRow(props.planItem.relatedId ? () => setActionId(props.planItem.relatedId) : undefined);
      // File/add-on types (legacy items still in database need AddOnDialog for correct embed URLs)
      case "providerFile":
      case "lessonAddOn":
      case "addon":
      case "file":
        return getGenericRow(props.planItem.relatedId ? () => setActionId(props.planItem.relatedId) : undefined);
      case "providerSection":
      case "lessonSection":
      case "section":
        return getGenericRow(
          (props.planItem.relatedId || (props.planItem.providerId && props.planItem.providerPath && props.planItem.providerContentPath))
            ? () => setLessonSectionId(props.planItem.relatedId || props.planItem.providerContentPath || props.planItem.id)
            : undefined
        );
      case "item":
      default:
        return getGenericRow(props.planItem.relatedId ? () => setLessonSectionId(props.planItem.relatedId) : undefined);
    }
  };

  return (
    <>
      {getPlanItem()}
      {props.planItem?.itemType === "header" && !props.readOnly && (
        <Menu id="header-menu" anchorEl={anchorEl} open={open} onClose={handleClose}>
          <MenuItem onClick={addSong}>
            <MusicNoteIcon style={{ marginRight: 10 }} /> {Locale.label("plans.planItem.song")}
          </MenuItem>
          <MenuItem onClick={addItem}>
            <FormatListBulletedIcon style={{ marginRight: 10 }} /> {Locale.label("plans.planItem.item")}
          </MenuItem>
          <MenuItem onClick={addLessonAction}>
            <MenuBookIcon style={{ marginRight: 10 }} /> {Locale.label("plans.planItem.externalItem") || "External Item"}
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
          downloadUrl={props.planItem.link}
          providerPath={props.planItem.providerPath}
          providerContentPath={props.planItem.providerContentPath}
          ministryId={props.ministryId}
        />
      )}
      {actionId && (
        <ActionDialog
          contentId={actionId}
          contentName={props.planItem.label}
          onClose={() => setActionId(null)}
          providerId={props.planItem.providerId || props.associatedProviderId}
          downloadUrl={props.planItem.link}
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
