import { Box, Typography, Stack, Checkbox } from "@mui/material";
import { StatusBadge } from "../../../../components/ui";
import { Locale, DateHelper } from "@churchapps/apphelper";
import { PushPin as PinIcon } from "@mui/icons-material";
import { type TaskInterface } from "@churchapps/helpers";

interface Props {
  card: TaskInterface;
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
        borderRadius: "var(--b1-radius-control)",
        border: "1px solid",
        borderColor: props.selected ? "primary.main" : isOverdue ? "var(--b1-danger)" : "var(--b1-border)",
        backgroundColor: props.selected ? "var(--b1-selected)" : isOverdue ? "var(--b1-danger-bg)" : "background.paper",
        cursor: "pointer",
        "&:hover": { borderColor: props.selected ? "primary.main" : isOverdue ? "var(--b1-danger)" : "var(--b1-control-border)" }
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
            <StatusBadge tone="neutral">{card.assignedToLabel || Locale.label("tasks.workflowBoard.unassigned")}</StatusBadge>
            {isOverdue && (
              <StatusBadge tone="danger" data-testid={"card-overdue-" + card.id}>{Locale.label("tasks.workflowCard.overdue")}</StatusBadge>
            )}
            {isSnoozed && (
              <StatusBadge tone="neutral" data-testid={"card-snoozed-" + card.id}>{Locale.label("tasks.workflowCard.snoozed")}</StatusBadge>
            )}
            {!isOverdue && !isSnoozed && due && (
              <StatusBadge tone="neutral">{DateHelper.formatHtml5Date(due)}</StatusBadge>
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};
