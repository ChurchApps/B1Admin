import React from "react";
import { Box } from "@mui/material";
import { DragIndicator as DragIndicatorIcon, Edit as EditIcon, Schedule as ScheduleIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { MarkdownPreviewLight } from "@churchapps/apphelper/markdown";
import { type PlanItemInterface } from "../../../helpers";
import { formatTime, formatClockTime } from "../PlanUtils";
import { PlanItemIcon } from "./PlanItemIcon";
import { type ProviderMediaInfo, matchProviderMedia, isVideoMedia, estimateSeconds } from "../planItemUtils";

interface Props {
  planItem: PlanItemInterface;
  startTime?: number;
  serviceStartTime?: Date;
  excluded?: boolean;
  readOnly?: boolean;
  onLabelClick?: () => void;
  onEditClick: () => void;
  mediaLookup?: Record<string, ProviderMediaInfo>;
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
  mediaLookup
}) => {
  const railLabel = excluded ? "—" : (serviceStartTime ? formatClockTime(serviceStartTime, startTime) : formatTime(startTime));
  const providerMedia = planItem.thumbnailUrl ? undefined : matchProviderMedia(planItem, mediaLookup);
  const showVideoThumb = !!providerMedia && isVideoMedia(planItem.label, providerMedia);
  // Untimed images show a planning estimate (~5:00) rather than an alarming 0:00 —
  // stored seconds stay 0 so playback leaves the volunteer in control.
  const storedSeconds = planItem.seconds ?? 0;
  const estimatedSeconds = storedSeconds === 0 ? estimateSeconds(planItem, mediaLookup) : 0;
  const isEstimate = estimatedSeconds > 0;
  return (
    <Box
      className={`planItem${onLabelClick ? " clickableRow" : ""}`}
      sx={{ display: "flex", alignItems: "center", cursor: onLabelClick ? "pointer" : "default", opacity: excluded ? 0.5 : 1 }}
      onClick={onLabelClick}
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
              // Browsers won't decode a frame until forced; seeking just past 0 paints the first frame without playing.
              onLoadedMetadata={(e: React.SyntheticEvent<HTMLVideoElement>) => {
                try { e.currentTarget.currentTime = 0.1; } catch { /* ignore */ }
              }}
              sx={{ width: 80, height: 45, objectFit: "cover", borderRadius: 2, pointerEvents: "none", backgroundColor: "grey.900" }}
            />
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
        <div>{planItem.label}</div>
        {planItem.description && (
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
      <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0, ml: 1.5 }}>
        {!readOnly && (
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
