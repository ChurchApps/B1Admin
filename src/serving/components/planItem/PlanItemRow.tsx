import React from "react";
import { Box } from "@mui/material";
import { DragIndicator as DragIndicatorIcon, Edit as EditIcon, Schedule as ScheduleIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { MarkdownPreviewLight } from "@churchapps/apphelper-markdown";
import { type PlanItemInterface } from "../../../helpers";
import { formatTime } from "../PlanUtils";
import { PlanItemIcon } from "./PlanItemIcon";

interface Props {
  planItem: PlanItemInterface;
  startTime?: number;
  readOnly?: boolean;
  onLabelClick?: () => void;
  onEditClick: () => void;
}

/**
 * Renders a generic plan item row with thumbnail/icon, label, description, and duration.
 */
export const PlanItemRow: React.FC<Props> = ({
  planItem,
  startTime = 0,
  readOnly,
  onLabelClick,
  onEditClick
}) => {
  return (
    <Box
      className={`planItem${onLabelClick ? " clickableRow" : ""}`}
      sx={{ display: "flex", alignItems: "center", cursor: onLabelClick ? "pointer" : "default" }}
      onClick={onLabelClick}
    >
      <div className="timeRailCell">
        <span className="timeRailLabel">{formatTime(startTime)}</span>
        <span className="timeRailDot" />
        <span className="timeRailLine" />
      </div>
      {!readOnly && (
        <DragIndicatorIcon
          className="dragHandle rowControl"
          sx={{ color: "var(--text-muted)", flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        />
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
        ) : null}
        <Box
          component="span"
          sx={{
            display: planItem.thumbnailUrl ? "none" : "flex",
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
        <ScheduleIcon sx={{ fontSize: 18, color: planItem.seconds === 0 ? "error.main" : "var(--text-muted)" }} />
        <Box
          component="span"
          title="Duration"
          sx={{
            color: planItem.seconds === 0 ? "error.main" : "var(--text-muted)",
            fontSize: "0.85rem",
            minWidth: 44,
            textAlign: "right"
          }}
        >
          {formatTime(planItem.seconds)}
        </Box>
      </Box>
    </Box>
  );
};
