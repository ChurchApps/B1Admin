import React from "react";
import { Box } from "@mui/material";
import { Add as AddIcon, DragIndicator as DragIndicatorIcon, Edit as EditIcon, Schedule as ScheduleIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { type PlanItemInterface } from "../../../helpers";
import { formatTime, formatClockTime, getSectionDuration } from "../PlanUtils";

interface Props {
  planItem: PlanItemInterface;
  startTime?: number;
  serviceStartTime?: Date;
  readOnly?: boolean;
  excluded?: boolean;
  positionLabel?: { text: string; assigned: boolean };
  onAddClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onEditClick: () => void;
  children?: React.ReactNode;
  /** Wraps just the header row (not the children), e.g. to make it a drop target. */
  wrapRow?: (row: React.ReactNode) => React.ReactNode;
}

/** Section header row with drag handle, label, action buttons, and duration. */
export const PlanItemHeader: React.FC<Props> = ({
  planItem,
  startTime = 0,
  serviceStartTime,
  readOnly,
  excluded,
  positionLabel,
  onAddClick,
  onEditClick,
  children,
  wrapRow
}) => {
  const sectionDuration = getSectionDuration(planItem);
  const railLabel = excluded ? "—" : (serviceStartTime ? formatClockTime(serviceStartTime, startTime) : formatTime(startTime));

  const headerRow = (
    <Box className="planItemHeader" sx={{ display: "flex", alignItems: "center", opacity: excluded ? 0.5 : 1 }}>
      <div className="timeRailCell">
        <span className="timeRailLabel" style={excluded ? { color: "var(--text-muted)" } : undefined}>{railLabel}</span>
        <span className="timeRailDot" />
        <span className="timeRailLine" />
      </div>
      {!readOnly && (
        <Box component="span" className="dragHandle" sx={{ display: "inline-flex", alignItems: "center", color: "text.secondary" }}>
          <DragIndicatorIcon />
        </Box>
      )}
      <Box component="span" sx={{ flex: 1 }}>{planItem.label}</Box>
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
            <Box
              component="button"
              type="button"
              className="actionButton alwaysVisible"
              onClick={onAddClick}
              aria-label={Locale.label("plans.planItem.addItem") || "Add item to section"}
              sx={{ border: 0, cursor: "pointer", color: "primary.main", background: "transparent" }}>
              <AddIcon />
            </Box>
            <Box
              component="button"
              type="button"
              className="actionButton alwaysVisible"
              onClick={onEditClick}
              aria-label={Locale.label("plans.planItem.editSection") || "Edit section"}
              sx={{ border: 0, cursor: "pointer", color: "primary.main", background: "transparent" }}>
              <EditIcon />
            </Box>
          </>
        )}
        <ScheduleIcon sx={{ fontSize: 18, color: "text.secondary", visibility: sectionDuration > 0 ? "visible" : "hidden" }} />
        <Box component="span" sx={{ color: "text.secondary", fontSize: "0.85rem", minWidth: 44, textAlign: "right" }}>
          {sectionDuration > 0 ? formatTime(sectionDuration) : ""}
        </Box>
      </Box>
    </Box>
  );

  return (
    <>
      {wrapRow ? wrapRow(headerRow) : headerRow}
      {children}
    </>
  );
};
