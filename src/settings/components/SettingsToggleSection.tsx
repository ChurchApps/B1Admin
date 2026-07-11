import React from "react";
import { DisplayBox } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";

interface Props {
  headerText: string;
  headerIcon: string;
  canEdit?: boolean;
  view: React.ReactNode;
  // Child fires the real save when `saveTrigger` changes, then reports the outcome
  // through `onSaveComplete` (true = saved). Children surface their own error UI.
  renderEdit: (saveTrigger: Date | null, onSaveComplete: (ok: boolean) => void) => React.ReactNode;
  onSaved: () => void;
  "data-testid"?: string;
}

// View↔edit wrapper for sections that save via shared `saveTrigger` pattern.
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
      // Safety net: if a child never reports back, stay in edit mode rather than spin forever.
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
    <DisplayBox headerText={props.headerText} headerIcon={props.headerIcon} editFunction={props.canEdit === false ? undefined : () => setEditing(true)} data-testid={props["data-testid"]}>
      {props.view}
    </DisplayBox>
  );
};
