import React from "react";
import { Box, TextField, CircularProgress } from "@mui/material";
import { DragIndicator as DragIndicatorIcon, Edit as EditIcon, Schedule as ScheduleIcon, ContentCopy as ContentCopyIcon, MusicNote as MusicNoteIcon, UnfoldLess as UnfoldLessIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { MarkdownPreviewLight } from "@churchapps/apphelper/markdown";
import { type PlanItemInterface } from "../../../helpers";
import { formatTime, formatClockTime } from "../PlanUtils";
import { PlanItemIcon } from "./PlanItemIcon";
import { type ProviderMediaInfo, matchProviderMedia, isVideoMedia, isAudioMedia, estimateSeconds } from "../planItemUtils";

interface Props {
  planItem: PlanItemInterface;
  startTime?: number;
  serviceStartTime?: Date;
  excluded?: boolean;
  readOnly?: boolean;
  onLabelClick?: () => void;
  onEditClick: () => void;
  onDuplicateClick?: () => void;
  onCollapseClick?: () => void;
  mediaLookup?: Record<string, ProviderMediaInfo>;
  onChange?: () => void;
  positionLabel?: { text: string; assigned: boolean };
}

/**
 * Renders a generic plan item row with thumbnail/icon, label, description, and duration.
 */
export const PlanItemRow: React.FC<Props> = ({
  planItem,
  startTime = 0,
  serviceStartTime,
  excluded,
  readOnly,
  onLabelClick,
  onEditClick,
  onDuplicateClick,
  onCollapseClick,
  mediaLookup,
  onChange,
  positionLabel
}) => {
  const railLabel = excluded ? "—" : (serviceStartTime ? formatClockTime(serviceStartTime, startTime) : formatTime(startTime));
  const providerMedia = planItem.thumbnailUrl ? undefined : matchProviderMedia(planItem, mediaLookup);
  const showVideoThumb = !!providerMedia && isVideoMedia(planItem.label, providerMedia);
  const showAudioIcon = !!providerMedia && isAudioMedia(planItem.label, providerMedia);
  // Untimed images show a planning estimate (~5:00) rather than an alarming 0:00 —
  // stored seconds stay 0 so playback leaves the volunteer in control.
  const storedSeconds = planItem.seconds ?? 0;
  const estimatedSeconds = storedSeconds === 0 ? estimateSeconds(planItem, mediaLookup) : 0;
  const isEstimate = estimatedSeconds > 0;

  const isScriptLine = !planItem.thumbnailUrl && !providerMedia && ["lessonAction", "action", "item", "providerPresentation"].includes(planItem.itemType || "");

  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [optimisticText, setOptimisticText] = React.useState<string | null>(null);
  const [editText, setEditText] = React.useState(planItem.textOverride ?? planItem.description ?? planItem.label ?? "");

  React.useEffect(() => {
    setOptimisticText(null);
  }, [planItem]);

  const displayText = optimisticText ?? planItem.textOverride ?? planItem.description ?? planItem.label;

  const handleDelete = async () => {
    setIsSaving(true);
    try {
      const { ApiHelper } = await import("@churchapps/apphelper");
      await ApiHelper.delete("/planItems/" + planItem.id, "DoingApi");
      onChange?.();
    } catch (e) {
      console.error(e);
      setIsSaving(false);
    }
  };

  const handleSaveText = async (insertBelow = false) => {
    const newText = editText.trim();
    if (newText === "") {
      await handleDelete();
      return;
    }

    if (editText !== (planItem.textOverride ?? planItem.description ?? planItem.label)) {
      setIsSaving(true);
      setIsEditing(false);
      setOptimisticText(editText);
      try {
        const pi = { ...planItem };
        if (pi.providerId || pi.providerPath) {
          pi.textOverride = editText;
        } else {
          if (pi.description) pi.description = editText;
          else pi.label = editText;
        }

        const { ApiHelper } = await import("@churchapps/apphelper");
        await ApiHelper.post("/planItems", [pi], "DoingApi");

        if (insertBelow) {
          const newItem: any = {
            planId: planItem.planId,
            parentId: planItem.parentId,
            itemType: "item",
            label: "",
            sort: (planItem.sort || 0) + 0.5,
          };
          await ApiHelper.post("/planItems/sort", newItem, "DoingApi");
        }

        onChange?.();
      } catch (e) {
        console.error(e);
      } finally {
        setIsSaving(false);
      }
    } else {
      setIsEditing(false);
      if (insertBelow) {
        setIsSaving(true);
        try {
          const { ApiHelper } = await import("@churchapps/apphelper");
          const newItem: any = {
            planId: planItem.planId,
            parentId: planItem.parentId,
            itemType: "item",
            label: "",
            sort: (planItem.sort || 0) + 0.5,
          };
          await ApiHelper.post("/planItems/sort", newItem, "DoingApi");
          onChange?.();
        } catch (e) {
          console.error(e);
        } finally {
          setIsSaving(false);
        }
      }
    }
  };

  const handleRestore = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    setOptimisticText("");
    try {
      const pi = { ...planItem, textOverride: "" };
      const { ApiHelper } = await import("@churchapps/apphelper");
      await ApiHelper.post("/planItems", [pi], "DoingApi");
      onChange?.();
    } finally {
      setIsSaving(false);
    }
  };

  const handleTextClick = (e: React.MouseEvent) => {
    if (readOnly || !isScriptLine) {
      if (onLabelClick) onLabelClick();
      return;
    }
    e.stopPropagation();
    setEditText(displayText || "");
    setIsEditing(true);
  };

  return (
    <Box
      className={`planItem${onLabelClick || (isScriptLine && !readOnly) ? " clickableRow" : ""}`}
      sx={{ display: "flex", alignItems: "center", cursor: onLabelClick || (isScriptLine && !readOnly) ? "pointer" : "default", opacity: excluded ? 0.5 : 1 }}
      onClick={isEditing ? undefined : (isScriptLine && !readOnly ? handleTextClick : onLabelClick)}
    >
      <div className="timeRailCell">
        <span className="timeRailLabel" style={excluded ? { color: "var(--text-muted)" } : undefined}>{railLabel}</span>
        <span className="timeRailDot" />
        <span className="timeRailLine" />
      </div>
      {!readOnly && (
        <Box
          component="span"
          className="dragHandle rowControl"
          sx={{ display: "inline-flex", alignItems: "center", color: "text.secondary", flexShrink: 0 }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <DragIndicatorIcon />
        </Box>
      )}
      {!isScriptLine && (
        <Box sx={{ width: 80, height: 45, mr: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {planItem.thumbnailUrl ? (
            <Box
              component="img"
              src={planItem.thumbnailUrl}
              alt=""
              sx={{ width: 80, height: 45, objectFit: "cover", borderRadius: 2 }}
              onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                e.currentTarget.style.display = "none";
                if (e.currentTarget.nextElementSibling) {
                  (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                }
              }}
            />
          ) : providerMedia ? (
            showVideoThumb ? (
              <Box
                component="video"
                src={providerMedia.url}
                preload="metadata"
                muted
                playsInline
                onLoadedMetadata={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                  try { e.currentTarget.currentTime = 0.1; } catch { /* ignore */ }
                }}
                sx={{ width: 80, height: 45, objectFit: "cover", borderRadius: 2, pointerEvents: "none", backgroundColor: "grey.900" }}
              />
            ) : showAudioIcon ? (
              <Box
                component="span"
                sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 80, height: 45, backgroundColor: "grey.300", borderRadius: 2 }}
              >
                <MusicNoteIcon sx={{ fontSize: 32, color: "text.secondary" }} />
              </Box>
            ) : (
              <Box
                component="img"
                src={providerMedia.url}
                alt=""
                loading="lazy"
                sx={{ width: 80, height: 45, objectFit: "cover", borderRadius: 2 }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.style.display = "none";
                  if (e.currentTarget.nextElementSibling) {
                    (e.currentTarget.nextElementSibling as HTMLElement).style.display = "flex";
                  }
                }}
              />
            )
          ) : null}
          <Box
            component="span"
            sx={{
              display: planItem.thumbnailUrl || providerMedia ? "none" : "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 80,
              height: 45,
              backgroundColor: "grey.300",
              borderRadius: 2
            }}
          >
            <PlanItemIcon itemType={planItem.itemType} />
          </Box>
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 0, ml: isScriptLine ? 2 : 0 }}>
        {isEditing ? (
          <TextField
            autoFocus
            multiline
            fullWidth
            size="small"
            variant="outlined"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={() => handleSaveText()}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSaveText(true);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            sx={{
              backgroundColor: "white",
              "& .MuiOutlinedInput-root": { padding: "8px" }
            }}
          />
        ) : (
          <>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <div style={isScriptLine ? { fontSize: "1.1rem", lineHeight: 1.4, whiteSpace: "pre-wrap" } : { whiteSpace: "pre-wrap" }}>{displayText}</div>
              {isSaving && <CircularProgress size={16} />}
            </Box>
            {(!isScriptLine && planItem.description && (!planItem.textOverride || planItem.textOverride === "")) && (
              <Box
                className="planItemDescription"
                sx={{
                  clear: "both",
                  width: "100%",
                  pt: 0.5,
                  fontSize: "0.9rem"
                }}
              >
                <MarkdownPreviewLight value={planItem.description || ""} />
              </Box>
            )}
            {planItem.textOverride && (planItem.providerId || planItem.providerPath) && !readOnly && (
              <Box component="span" sx={{ fontSize: "0.8rem", color: "primary.main", cursor: "pointer", mt: 0.5, display: "inline-block" }} onClick={handleRestore}>
                {Locale.label("plans.planItem.restoreOriginal") || "Restore Original"}
              </Box>
            )}
          </>
        )}
      </Box>
      {positionLabel?.text && (
        <Box
          component="span"
          className="planItemPosition"
          sx={{ flexShrink: 0, ml: 1.5, fontSize: "0.85rem", textAlign: "right", color: positionLabel.assigned ? "text.secondary" : "text.disabled", fontStyle: positionLabel.assigned ? "normal" : "italic" }}
        >
          {positionLabel.text}
        </Box>
      )}
      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0, ml: 1.5 }}>
        {!readOnly && (
          <>
            {onCollapseClick && (
              <Box
                component="button"
                type="button"
                className="actionButton rowControl"
                data-testid="collapse-to-section-button"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onCollapseClick(); }}
                aria-label={Locale.label("plans.planItem.collapseToSection")}
                title={Locale.label("plans.planItem.collapseToSection")}
                sx={{ border: 0, cursor: "pointer", color: "primary.main", background: "transparent" }}
              >
                <UnfoldLessIcon />
              </Box>
            )}
            <Box
              component="button"
              type="button"
              className="actionButton rowControl"
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); onEditClick(); }}
              aria-label={Locale.label("plans.planItem.editItem") || "Edit item"}
              sx={{ border: 0, cursor: "pointer", color: "primary.main", background: "transparent" }}
            >
              <EditIcon />
            </Box>
            {onDuplicateClick && (
              <Box
                component="button"
                type="button"
                className="actionButton rowControl"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onDuplicateClick(); }}
                aria-label={Locale.label("common.duplicate") || "Duplicate"}
                sx={{ border: 0, cursor: "pointer", color: "primary.main", background: "transparent" }}
              >
                <ContentCopyIcon />
              </Box>
            )}
          </>
        )}
        <ScheduleIcon sx={{ fontSize: 18, color: storedSeconds === 0 && !isEstimate ? "error.main" : "text.secondary" }} />
        <Box
          component="span"
          title={isEstimate
            ? (Locale.label("plans.planItem.estimatedDuration") || "Estimated — advances manually during class")
            : Locale.label("plans.planItem.duration")}
          sx={{
            color: storedSeconds === 0 && !isEstimate ? "error.main" : "text.secondary",
            fontStyle: isEstimate ? "italic" : "normal",
            fontSize: "0.85rem",
            minWidth: 44,
            textAlign: "right"
          }}
        >
          {isEstimate ? `~${formatTime(estimatedSeconds)}` : formatTime(storedSeconds)}
        </Box>
      </Box>
    </Box>
  );
};
