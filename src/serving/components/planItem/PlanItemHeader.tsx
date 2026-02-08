import React from "react";
import { Box } from "@mui/material";
import { Add as AddIcon, DragIndicator as DragIndicatorIcon, Edit as EditIcon, Schedule as ScheduleIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { type PlanItemInterface } from "../../../helpers";
import { formatTime, getSectionDuration } from "../PlanUtils";

interface Props {
  planItem: PlanItemInterface;
  startTime?: number;
  readOnly?: boolean;
  onAddClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onEditClick: () => void;
  children?: React.ReactNode;
}

/**
 * Renders a section header row with drag handle, label, action buttons, and duration.
 */
export const PlanItemHeader: React.FC<Props> = ({
  planItem,
  startTime = 0,
  readOnly,
  onAddClick,
  onEditClick,
  children
}) => {
  const sectionDuration = getSectionDuration(planItem);

  return (
    <>
      <Box className="planItemHeader" sx={{ display: "flex", alignItems: "center" }}>
        <div className="timeRailCell">
          <span className="timeRailLabel">{formatTime(startTime)}</span>
          <span className="timeRailDot" />
          <span className="timeRailLine" />
        </div>
        {!readOnly && <DragIndicatorIcon className="dragHandle" sx={{ color: "var(--text-muted)" }} />}
        <Box component="span" sx={{ flex: 1 }}>{planItem.label}</Box>
        <Box component="span" sx={{ display: "flex", alignItems: "center", gap: 0.75, flexShrink: 0, ml: 1.5 }}>
          {!readOnly && (
            <>
              <Box
                component="button"
                type="button"
                className="actionButton"
                onClick={onAddClick}
                aria-label={Locale.label("plans.planItem.addItem") || "Add item to section"}
                sx={{ border: 0, cursor: "pointer", color: "primary.main", background: "transparent" }}>
                <AddIcon />
              </Box>
              <Box
                component="button"
                type="button"
                className="actionButton"
                onClick={onEditClick}
                aria-label={Locale.label("plans.planItem.editSection") || "Edit section"}
                sx={{ border: 0, cursor: "pointer", color: "primary.main", background: "transparent" }}>
                <EditIcon />
              </Box>
            </>
          )}
          <ScheduleIcon sx={{ fontSize: 18, color: "var(--text-muted)", visibility: sectionDuration > 0 ? "visible" : "hidden" }} />
          <Box component="span" sx={{ color: "var(--text-muted)", fontSize: "0.85rem", minWidth: 44, textAlign: "right" }}>
            {sectionDuration > 0 ? formatTime(sectionDuration) : ""}
          </Box>
        </Box>
      </Box>
      {children}
    </>
  );
};
