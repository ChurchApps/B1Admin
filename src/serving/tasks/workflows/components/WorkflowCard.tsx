import { Box, Typography, Chip, Stack, Checkbox } from "@mui/material";
import { Locale, DateHelper } from "@churchapps/apphelper";
import { Person as PersonIcon, Schedule as DueIcon, Snooze as SnoozeIcon, PushPin as PinIcon } from "@mui/icons-material";
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
        mb: 1.25,
        borderRadius: 2,
        border: "1px solid",
        borderColor: props.selected
          ? "primary.main"
          : isOverdue
            ? "error.main"
            : (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0",
        backgroundColor: props.selected
          ? (theme) => theme.palette.mode === "dark" ? "rgba(25, 118, 210, 0.08)" : "rgba(25, 118, 210, 0.04)"
          : isOverdue
            ? (theme) => theme.palette.mode === "dark" ? "rgba(211, 47, 47, 0.15)" : "rgba(211, 47, 47, 0.04)"
            : "background.paper",
        boxShadow: props.selected
          ? "0 4px 12px rgba(25, 118, 210, 0.15)"
          : "0 2px 4px rgba(0,0,0,0.02)",
        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
        cursor: "pointer",
        "&:hover": {
          boxShadow: "0 8px 16px rgba(0,0,0,0.06)",
          transform: "translateY(-2px)",
          borderColor: props.selected ? "primary.main" : isOverdue ? "error.main" : "primary.light"
        }
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
            <Chip
              size="small"
              icon={<PersonIcon sx={{ fontSize: "14px !important" }} />}
              label={card.assignedToLabel || Locale.label("tasks.workflowBoard.unassigned")}
              variant="outlined"
              sx={{
                fontSize: "0.75rem",
                height: 22,
                backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0",
                color: "text.secondary"
              }}
            />
            {isOverdue && (
              <Chip
                size="small"
                color="error"
                icon={<DueIcon sx={{ fontSize: "14px !important" }} />}
                label={Locale.label("tasks.workflowCard.overdue")}
                data-testid={"card-overdue-" + card.id}
                sx={{ fontSize: "0.75rem", height: 22, fontWeight: 500 }}
              />
            )}
            {isSnoozed && (
              <Chip
                size="small"
                color="default"
                icon={<SnoozeIcon sx={{ fontSize: "14px !important" }} />}
                label={Locale.label("tasks.workflowCard.snoozed")}
                data-testid={"card-snoozed-" + card.id}
                sx={{ fontSize: "0.75rem", height: 22, fontWeight: 500 }}
              />
            )}
            {!isOverdue && !isSnoozed && due && (
              <Chip
                size="small"
                variant="outlined"
                icon={<DueIcon sx={{ fontSize: "14px !important" }} />}
                label={DateHelper.formatHtml5Date(due)}
                sx={{
                  fontSize: "0.75rem",
                  height: 22,
                  backgroundColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.03)" : "#f8fafc",
                  borderColor: (theme) => theme.palette.mode === "dark" ? "rgba(255, 255, 255, 0.1)" : "#e2e8f0",
                  color: "text.secondary"
                }}
              />
            )}
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
};
