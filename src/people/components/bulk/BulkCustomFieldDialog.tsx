import React from "react";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type PersonFieldInterface } from "@churchapps/helpers";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Typography } from "@mui/material";
import { useBulkApplyDialog } from "./useBulkApplyDialog";
import { type BulkResult } from "./BulkFieldDialog";

interface Props {
  open: boolean;
  personIds: string[];
  onClose: () => void;
  onComplete: (result: BulkResult) => void;
}

export const BulkCustomFieldDialog: React.FC<Props> = (props) => {
  const [fieldId, setFieldId] = React.useState("");
  const [value, setValue] = React.useState("");

  const { options, isSubmitting, handleApply } = useBulkApplyDialog<PersonFieldInterface>({
    open: props.open,
    onClose: props.onClose,
    onComplete: props.onComplete,
    onOpen: () => { setFieldId(""); setValue(""); },
    // ponytail: Yes/No only — other types each need their own value editor. Add when asked.
    loadOptions: async () => {
      const fields: PersonFieldInterface[] = await ApiHelper.get("/personfields", "MembershipApi");
      return (fields || []).filter((f) => f.fieldType === "Yes/No");
    },
    apply: async () => {
      const payload = props.personIds.map((personId) => ({ personId, fieldId, value }));
      await ApiHelper.post("/personfieldvalues", payload, "MembershipApi");
      return {
        message: Locale.label("people.bulk.fieldSuccess").replace("{count}", props.personIds.length.toString()),
        severity: "success"
      };
    }
  });

  return (
    <Dialog open={props.open} onClose={() => !isSubmitting && props.onClose()} maxWidth="xs" fullWidth>
      <DialogTitle>{Locale.label("people.bulk.customFieldTitle")}</DialogTitle>
      <DialogContent>
        <Typography sx={{ mb: 2 }}>{Locale.label("people.bulk.fieldPrompt").replace("{count}", props.personIds.length.toString())}</Typography>
        {options.length === 0
          ? <Typography data-testid="bulk-custom-field-empty">{Locale.label("people.bulk.noCustomFields")}</Typography>
          : (
            <>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="bulk-custom-field-label">{Locale.label("people.bulk.customField")}</InputLabel>
                <Select labelId="bulk-custom-field-label" label={Locale.label("people.bulk.customField")} value={fieldId} onChange={(e) => setFieldId(e.target.value)} data-testid="bulk-custom-field-select">
                  {options.map((f) => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="bulk-custom-value-label">{Locale.label("people.bulk.value")}</InputLabel>
                <Select labelId="bulk-custom-value-label" label={Locale.label("people.bulk.value")} value={value} onChange={(e) => setValue(e.target.value)} data-testid="bulk-custom-value-select">
                  <MenuItem value="True">{Locale.label("common.yes")}</MenuItem>
                  <MenuItem value="False">{Locale.label("common.no")}</MenuItem>
                </Select>
              </FormControl>
            </>
          )}
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} variant="outlined" disabled={isSubmitting}>{Locale.label("common.cancel")}</Button>
        <Button onClick={handleApply} variant="contained" disabled={isSubmitting || !fieldId || !value} data-testid="bulk-custom-field-apply">{Locale.label("people.bulk.apply")}</Button>
      </DialogActions>
    </Dialog>
  );
};
