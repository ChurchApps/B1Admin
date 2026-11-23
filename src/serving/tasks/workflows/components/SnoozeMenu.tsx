import React from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Menu, MenuItem, TextField } from "@mui/material";
import { DateHelper, Locale } from "@churchapps/apphelper";

interface Props {
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onSnooze: (body: { days?: number; until?: string }) => void;
}

export const SnoozeMenu = ({ anchorEl, onClose, onSnooze }: Props) => {
  const [picking, setPicking] = React.useState(false);
  const tomorrow = DateHelper.formatHtml5Date(DateHelper.addDays(new Date(), 1));
  const [date, setDate] = React.useState(tomorrow);

  const pickDate = () => {
    onClose();
    setDate(tomorrow);
    setPicking(true);
  };

  // The card wakes at the start of the picked day, in the user's time zone.
  const snoozeUntilDate = () => {
    setPicking(false);
    onSnooze({ until: new Date(date + "T00:00:00").toISOString() });
  };

  return (
    <>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={onClose}>
        <MenuItem onClick={() => onSnooze({ days: 1 })} data-testid="snooze-1">{Locale.label("tasks.workflowCard.snooze1Day")}</MenuItem>
        <MenuItem onClick={() => onSnooze({ days: 3 })}>{Locale.label("tasks.workflowCard.snooze3Days")}</MenuItem>
        <MenuItem onClick={() => onSnooze({ days: 7 })}>{Locale.label("tasks.workflowCard.snooze1Week")}</MenuItem>
        <MenuItem onClick={pickDate} data-testid="snooze-pick-date">{Locale.label("tasks.workflowCard.snoozePickDate")}</MenuItem>
      </Menu>
      <Dialog open={picking} onClose={() => setPicking(false)} maxWidth="xs" fullWidth data-testid="snooze-date-dialog">
        <DialogTitle>{Locale.label("tasks.workflowCard.snoozeUntil")}</DialogTitle>
        <DialogContent>
          <TextField type="date" fullWidth value={date} onChange={(e) => setDate(e.target.value)} sx={{ mt: 1 }} slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: tomorrow, "data-testid": "snooze-date-input" } }} label={Locale.label("tasks.workflowCard.snoozeDate")} />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setPicking(false)}>{Locale.label("common.cancel")}</Button>
          <Button variant="contained" onClick={snoozeUntilDate} disabled={!date || date < tomorrow} data-testid="snooze-date-confirm">{Locale.label("tasks.workflowCard.snooze")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
