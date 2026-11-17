import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Radio, RadioGroup } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

export type RecurringEditType = "this" | "future" | "all" | "none";

interface Props {
  action: "edit" | "delete";
  onDone: (editType: RecurringEditType) => void;
}

// Same three choices as B1App's group calendar and the website calendar.
export function EditRecurringModal(props: Props) {
  const [editType, setEditType] = useState<RecurringEditType>("this");

  return (
    <Dialog open={true} onClose={() => props.onDone("none")} data-testid="edit-recurring-dialog">
      <DialogTitle>{props.action === "delete" ? Locale.label("calendars.calendarEvent.recurringDeleteTitle") : Locale.label("calendars.calendarEvent.recurringEditTitle")}</DialogTitle>
      <DialogContent>
        <RadioGroup value={editType} onChange={(e) => setEditType(e.target.value as RecurringEditType)}>
          <FormControlLabel value="this" control={<Radio />} label={Locale.label("calendars.calendarEvent.justThisDate")} data-testid="edit-recurring-this-radio" />
          <FormControlLabel value="future" control={<Radio />} label={Locale.label("calendars.calendarEvent.thisAndFollowing")} data-testid="edit-recurring-future-radio" />
          <FormControlLabel value="all" control={<Radio />} label={Locale.label("calendars.calendarEvent.allDates")} data-testid="edit-recurring-all-radio" />
        </RadioGroup>
      </DialogContent>
      <DialogActions>
        <Button onClick={() => props.onDone("none")} data-testid="edit-recurring-cancel-button">{Locale.label("common.cancel")}</Button>
        <Button variant="contained" color={props.action === "delete" ? "error" : "primary"} onClick={() => props.onDone(editType)} data-testid="edit-recurring-save-button">
          {props.action === "delete" ? Locale.label("common.delete") : Locale.label("common.save")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
