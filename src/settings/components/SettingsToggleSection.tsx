import React from "react";
import { Box } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { verbSx, SectionLabel } from "../plated";

interface Props {
  headerText: string;
  headerIcon: string;
  canEdit?: boolean;
  view: React.ReactNode;
  renderEdit: (saveTrigger: Date | null, onSaveComplete: (ok: boolean) => void) => React.ReactNode;
  onSaved: () => void;
  "data-testid"?: string;
}

export const SettingsToggleSection: React.FC<Props> = (props) => {
  const [editing, setEditing] = React.useState(false);
  const [saveTrigger, setSaveTrigger] = React.useState<Date | null>(null);
  const [saving, setSaving] = React.useState(false);
  const pendingResolve = React.useRef<((ok: boolean) => void) | null>(null);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = (ok: boolean) => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    const resolve = pendingResolve.current;
    if (!resolve) return;
    pendingResolve.current = null;
    resolve(ok);
  };

  const handleSave = async () => {
    setSaving(true);
    const ok = await new Promise<boolean>((resolve) => {
      pendingResolve.current = resolve;
      timeoutRef.current = setTimeout(() => finish(false), 15000);
      setSaveTrigger(new Date());
    });
    setSaving(false);
    if (!ok) return;
    props.onSaved();
    setEditing(false);
    setSaveTrigger(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setSaveTrigger(null);
  };

  if (editing) {
    return (
      <FormCard title={props.headerText} icon={props.headerIcon} onSave={handleSave} onCancel={handleCancel} isSubmitting={saving} data-testid={props["data-testid"]}>
        {props.renderEdit(saveTrigger, finish)}
      </FormCard>
    );
  }

  return (
    <Box data-testid={props["data-testid"]}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 1 }}>
        <SectionLabel sx={{ mt: 0 }}>{props.headerText}</SectionLabel>
        {props.canEdit !== false && (
          <Box component="button" type="button" data-testid="small-button-edit" onClick={() => setEditing(true)} sx={verbSx}>{Locale.label("common.edit")}</Box>
        )}
      </Box>
      {props.view}
    </Box>
  );
};
