import { Box, Typography, Chip, Stack, Checkbox } from "@mui/material";
import React from "react";
import { Locale, DateHelper } from "@churchapps/apphelper";
import { Person as PersonIcon, Schedule as DueIcon, Snooze as SnoozeIcon, PushPin as PinIcon } from "@mui/icons-material";
import { type WorkflowCardInterface } from "../interfaces";

interface Props {
  card: WorkflowCardInterface;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onOpen?: () => void;
}

export const WorkflowCard = (props: Props) => {
  const { card } = props;
  const now = new Date();
  const due = card.dueDate ? DateHelper.toDate(card.dueDate) : null;
  const snoozed = card.snoozedUntil ? DateHelper.toDate(card.snoozedUntil) : null;
  const isSnoozed = snoozed && snoozed > now;
  const isOverdue = !isSnoozed && due && due < now;

  return (
    <Box
      data-testid={"workflow-card-" + card.id}
      onClick={props.onOpen}
      sx={{
        p: 1.5,
        mb: 1,
        borderRadius: 2,
        border: "1px solid",
        borderColor: props.selected ? "primary.main" : isOverdue ? "error.main" : "divider",
        backgroundColor: isOverdue ? "rgba(211,47,47,0.06)" : "background.paper",
        "&:hover": { boxShadow: 2 }
      }}>
      <Stack direction="row" alignItems="flex-start" spacing={0.5}>
        {props.selectable && (
          <Checkbox
            size="small"
            checked={!!props.selected}
            data-testid={"card-select-" + card.id}
            onClick={(e) => e.stopPropagation()}
            onChange={() => props.onToggleSelect?.()}
            sx={{ p: 0.25, mt: -0.25 }}
          />
        )}
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{card.title || card.associatedWithLabel}</Typography>
            {card.pinnedAssignment && <PinIcon fontSize="inherit" color="primary" data-testid={"card-pinned-" + card.id} />}
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
            <Chip size="small" icon={<PersonIcon />} label={card.assignedToLabel || Locale.label("tasks.workflowBoard.unassigned")} variant="outlined" />
            {isOverdue && <Chip size="small" color="error" icon={<DueIcon />} label={Locale.label("tasks.workflowCard.overdue")} data-testid={"card-overdue-" + card.id} />}
            {isSnoozed && <Chip size="small" color="default" icon={<SnoozeIcon />} label={Locale.label("tasks.workflowCard.snoozed")} data-testid={"card-snoozed-" + card.id} />}
            {!isOverdue && !isSnoozed && due && <Chip size="small" variant="outlined" icon={<DueIcon />} label={DateHelper.formatHtml5Date(due)} />}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};
