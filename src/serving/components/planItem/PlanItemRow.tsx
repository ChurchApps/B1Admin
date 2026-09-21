import React from "react";
import { Box, Checkbox, Chip } from "@mui/material";
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, DragIndicator as DragIndicatorIcon, Edit as EditIcon, Schedule as ScheduleIcon, ContentCopy as ContentCopyIcon, MusicNote as MusicNoteIcon, RestartAlt as RestartAltIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { MarkdownPreviewLight } from "@churchapps/apphelper/markdown";
import { type PlanItemInterface } from "../../../helpers";
import { formatTime, formatClockTime } from "../PlanUtils";
import { PlanItemIcon } from "./PlanItemIcon";
import { InlineEditableText } from "./InlineEditableText";
import { type ProviderMediaInfo, matchProviderMedia, isVideoMedia, isAudioMedia, estimateSeconds, TEXT_ACTION_TYPES } from "../planItemUtils";

interface Props {
  planItem: PlanItemInterface;
  startTime?: number;
  serviceStartTime?: Date;
  excluded?: boolean;
  readOnly?: boolean;
  onLabelClick?: () => void;
  onEditClick: () => void;
  onDuplicateClick?: () => void;
  onSaveDescription?: (text: string) => void;
  onRestoreOriginal?: () => void;
  mediaLookup?: Record<string, ProviderMediaInfo>;
  positionLabel?: { text: string; assigned: boolean };
  /** Row starts a customized section: folded it stands in for the whole run, unfolded it offers to fold back. */
  fold?: { folded: boolean; count?: number; total?: number; onToggle: () => void };
  /** Parent section is in bulk-select mode: show a checkbox and make the row toggle selection. */
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
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
  onSaveDescription,
  onRestoreOriginal,
  mediaLookup,
  positionLabel,
  fold,
  selectable,
  selected,
  onToggleSelect
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
  // Script lines edit inline; the row itself no longer opens the read-only dialog.
  const isTextLine = TEXT_ACTION_TYPES.has(planItem.actionType || "");
  const isTextAction = !readOnly && !!onSaveDescription && isTextLine;
  const isFolded = !!fold?.folded;
  const foldChip = fold?.total
    ? (Locale.label("plans.planItem.itemsOfTotal") || "{count} of {total} items").replace("{count}", String(fold.count)).replace("{total}", String(fold.total))
    : (Locale.label("plans.planItem.itemsCount") || "{count} items").replace("{count}", String(fold?.count));
  const showFoldChip = isFolded && fold?.count !== undefined;
  const foldLabel = isFolded ? (Locale.label("plans.planItem.showRows") || "Show as separate rows") : (Locale.label("plans.planItem.hideRows") || "Fold back into one row");
  const canRestore = isTextAction && !!onRestoreOriginal && !!planItem.providerId && !!planItem.providerPath && !!planItem.providerContentPath;
  const selecting = !readOnly && !!selectable && !!onToggleSelect;
  const rowClick = selecting ? onToggleSelect : (isTextAction ? undefined : onLabelClick);
  return (
    <Box
      className={`planItem${rowClick ? " clickableRow" : ""}`}
      sx={{ display: "flex", alignItems: "center", cursor: rowClick ? "pointer" : "default", opacity: excluded ? 0.5 : 1 }}
      onClick={rowClick}
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
      {selecting && (
        <Checkbox
          size="small"
          checked={!!selected}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          onChange={() => onToggleSelect?.()}
          data-testid="planItem-select-checkbox"
          slotProps={{ input: { "aria-label": `${Locale.label("plans.planItem.selectItem") || "Select"} ${planItem.label || ""}`.trim() } }}
          sx={{ p: 0.5, mr: 0.5, flexShrink: 0 }}
        />
      )}
      {isTextLine && (
        <Box sx={{ width: 80, mr: 1, flexShrink: 0, textAlign: "right", fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "text.secondary" }}>
          {planItem.actionType}
        </Box>
      )}
      <Box sx={{ width: 80, height: 45, mr: 1, flexShrink: 0, display: isTextLine ? "none" : "flex", alignItems: "center", justifyContent: "center" }}>
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
              // Browsers won't decode a frame until forced; seeking just past 0 paints the first frame without playing.
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
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {!(isTextLine && planItem.description) && (
          <div>
            {planItem.label}
            {showFoldChip && <Chip size="small" variant="outlined" color="primary" label={foldChip} sx={{ ml: 1 }} data-testid="customized-chip" />}
          </div>
        )}
        {isTextAction ? (
          <Box className="planItemDescription" sx={{ clear: "both", width: "100%", pt: 0.5, fontSize: "0.9rem" }}>
            <InlineEditableText
              value={planItem.description || ""}
              onSave={(text) => onSaveDescription?.(text)}
              placeholder={Locale.label("plans.planItem.clickToAddText") || "Click to add text"}
              data-testid="planItem-inline-text"
            />
          </Box>
        ) : planItem.description && (
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
        {fold && !readOnly && (
          <Box
            component="button"
            type="button"
            className="actionButton"
            data-testid="fold-toggle-button"
            onClick={(e: React.MouseEvent) => { e.stopPropagation(); fold.onToggle(); }}
            aria-label={foldLabel}
            title={foldLabel}
            sx={{ border: 0, cursor: "pointer", color: "primary.main", background: "transparent" }}
          >
            {isFolded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </Box>
        )}
        {!readOnly && !showFoldChip && (
          <>
            {canRestore && (
              <Box
                component="button"
                type="button"
                className="actionButton rowControl"
                data-testid="restore-original-button"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); onRestoreOriginal?.(); }}
                aria-label={Locale.label("plans.planItem.restoreOriginal") || "Restore original"}
                title={Locale.label("plans.planItem.restoreOriginal") || "Restore original"}
                sx={{ border: 0, cursor: "pointer", color: "primary.main", background: "transparent" }}
              >
                <RestartAltIcon />
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
