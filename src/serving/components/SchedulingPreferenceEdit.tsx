import React, { useEffect } from "react";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControl, InputLabel, Select, MenuItem, Stack } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type SchedulingPreferenceInterface } from "../../helpers";

interface Props {
  personId: string;
  personName: string;
  onClose: () => void;
}

// maxPerMonth is cleared via null (not undefined) so the API explicitly unsets it, but the
// shared interface only types it as number | undefined - widen locally to match actual usage.
type LocalPreference = Omit<SchedulingPreferenceInterface, "maxPerMonth"> & { maxPerMonth?: number | null };

export const SchedulingPreferenceEdit = (props: Props) => {
  const [preference, setPreference] = React.useState<LocalPreference>({ personId: props.personId });

  useEffect(() => {
    ApiHelper.get("/schedulingPreferences/people?ids=" + props.personId, "DoingApi").then((data: SchedulingPreferenceInterface[]) => {
      if (data?.length > 0) setPreference(data[0]);
    });
  }, [props.personId]);

  const handleSave = () => {
    const pref = { ...preference, personId: props.personId };
    if (!pref.maxPerMonth) pref.maxPerMonth = null;
    ApiHelper.post("/schedulingPreferences", [pref], "DoingApi").then(props.onClose);
  };

  return (
    <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="xs" data-testid="scheduling-preference-dialog">
      <DialogTitle>{(Locale.label("plans.schedulingPreference.title") || "Scheduling Preferences") + " - " + props.personName}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            fullWidth
            type="number"
            label={Locale.label("plans.schedulingPreference.maxPerMonth") || "Max times per month"}
            helperText={Locale.label("plans.schedulingPreference.maxPerMonthHelper") || "Leave blank for no limit"}
            value={preference.maxPerMonth ?? ""}
            onChange={(e) => setPreference({ ...preference, maxPerMonth: e.target.value ? parseInt(e.target.value) : null })}
            data-testid="max-per-month-input"
            slotProps={{ htmlInput: { min: 1 } }}
          />
          <TextField
            fullWidth
            label={Locale.label("plans.schedulingPreference.preferredTimes") || "Preferred service times"}
            helperText={Locale.label("plans.schedulingPreference.preferredTimesHelper") || "e.g. 9:00 am or First Service. Separate multiple with commas."}
            value={preference.preferredTimes ?? ""}
            onChange={(e) => setPreference({ ...preference, preferredTimes: e.target.value })}
            data-testid="preferred-times-input"
          />
          <FormControl fullWidth>
            <InputLabel id="householdScheduling">{Locale.label("plans.schedulingPreference.household") || "Household scheduling"}</InputLabel>
            <Select
              labelId="householdScheduling"
              label={Locale.label("plans.schedulingPreference.household") || "Household scheduling"}
              value={preference.householdScheduling ?? "none"}
              onChange={(e) => setPreference({ ...preference, householdScheduling: e.target.value })}
              data-testid="household-scheduling-select">
              <MenuItem value="none">{Locale.label("plans.schedulingPreference.householdNone") || "No preference"}</MenuItem>
              <MenuItem value="together">{Locale.label("plans.schedulingPreference.householdTogether") || "Schedule household together"}</MenuItem>
              <MenuItem value="apart">{Locale.label("plans.schedulingPreference.householdApart") || "Don't schedule household the same day"}</MenuItem>
            </Select>
          </FormControl>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} data-testid="preference-cancel-button">{Locale.label("common.cancel") || "Cancel"}</Button>
        <Button variant="contained" onClick={handleSave} data-testid="preference-save-button">{Locale.label("common.save") || "Save"}</Button>
      </DialogActions>
    </Dialog>
  );
};
