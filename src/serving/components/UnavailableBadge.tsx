import { Box, Tooltip } from "@mui/material";
import { EventBusy as EventBusyIcon } from "@mui/icons-material";
import { type BlockoutDateInterface } from "@churchapps/helpers";
import { Locale } from "@churchapps/apphelper";
import { StatusBadge } from "../../components/ui";
import { formatBlockoutRange } from "../helpers/blockoutHelper";

interface Props {
  blockout: BlockoutDateInterface;
  // Icon only, for tight spots like the overview grid.
  compact?: boolean;
}

export const UnavailableBadge = ({ blockout, compact }: Props) => {
  const label = Locale.label("plans.blockouts.unavailable", "Unavailable");
  const title = Locale.label("plans.blockouts.blockedOut", "Blocked out") + ": " + formatBlockoutRange(blockout);
  return (
    <Tooltip title={title}>
      {compact ? (
        <Box component="span" role="img" aria-label={label + " — " + title} data-testid="unavailable-badge" sx={{ display: "inline-flex", verticalAlign: "middle", color: "var(--b1-danger)", ml: 0.25 }}>
          <EventBusyIcon sx={{ fontSize: 16 }} />
        </Box>
      ) : (
        <Box component="span" sx={{ display: "inline-flex" }}>
          <StatusBadge tone="danger" data-testid="unavailable-badge">
            <EventBusyIcon sx={{ fontSize: 14 }} />
            {label}
          </StatusBadge>
        </Box>
      )}
    </Tooltip>
  );
};
