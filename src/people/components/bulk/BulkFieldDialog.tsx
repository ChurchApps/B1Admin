import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Typography } from "@mui/material";

export interface BulkFieldOption { value: string; label: string }

export interface BulkResult { message: string; severity: "success" | "error"; fieldUpdates?: Record<string, any> }

interface Props {
  open: boolean;
  field: "membershipStatus" | "maritalStatus" | "gender" | "optedOut" | "campusId";
  title: string;
  fieldLabel: string;
  isBoolean?: boolean;
  options: BulkFieldOption[];
  personIds: string[];
  onClose: () => void;
  onComplete: (result: BulkResult) => void;
}

export const BulkFieldDialog: React.FC<Props> = (props) => {
  const [value, setValue] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (props.open) setValue("");
  }, [props.open]);

  const handleApply = async () => {
    if (value === "") return;
    const updateValue = props.isBoolean ? value === "true" : value;
    setIsSubmitting(true);
    try {
      const updates = { [props.field]: updateValue };
      await ApiHelper.post("/people/bulk-update", { personIds: props.personIds, updates }, "MembershipApi");
      props.onComplete({
        message: Locale.label("people.bulk.fieldSuccess").replace("{count}", props.personIds.length.toString()),
        severity: "success",
        fieldUpdates: updates
      });
      props.onClose();
    } catch (error) {
      props.onComplete({ message: error instanceof Error ? error.message : Locale.label("people.bulk.error"), severity: "error" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={props.open} onClose={() => !isSubmitting && props.onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>{props.title}</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>{Locale.label("people.bulk.fieldPrompt").replace("{count}", props.personIds.length.toString())}</Typography>
        <FormControl fullWidth>
          <InputLabel id="bulk-field-label">{props.fieldLabel}</InputLabel>
          <Select labelId="bulk-field-label" label={props.fieldLabel} value={value} onChange={(e) => setValue(e.target.value)} data-testid="bulk-field-select">
            {props.options.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} variant="outlined" disabled={isSubmitting}>{Locale.label("common.cancel")}</Button>
        <Button onClick={handleApply} variant="contained" disabled={isSubmitting || value === ""} data-testid="bulk-field-apply">{Locale.label("people.bulk.apply")}</Button>
      </DialogActions>
    </Dialog>
  );
};
