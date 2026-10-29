import React from "react";
import { FormCard } from "../../components/ui";
import { EditVerb } from "./SettingsPage";
import { SettingsPanel } from "./SettingsPanel";

interface Props {
  headerText: string;
  headerIcon: string;
  canEdit?: boolean;
  view: React.ReactNode;
  // Child fires the real save when `saveTrigger` changes, then reports the outcome
  // through `onSaveComplete` (true = saved). Children surface their own error UI.
  renderEdit: (saveTrigger: Date | null, onSaveComplete: (ok: boolean) => void) => React.ReactNode;
  onSaved: () => void;
  // How long the Save spinner runs before giving up on the child (default 15s).
  saveTimeoutMs?: number;
  "data-testid"?: string;
}

// View↔edit wrapper for sections that save via shared `saveTrigger` pattern.
export const SettingsToggleSection: React.FC<Props> = (props) => {
  const [editing, setEditing] = React.useState(false);
  const [saveTrigger, setSaveTrigger] = React.useState<Date | null>(null);
  const [saving, setSaving] = React.useState(false);
  const pending = React.useRef(false);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveTimeout = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  // A result that arrives after the timeout still counts: the save landed, so close and refresh.
  const finish = (ok: boolean) => {
    clearSaveTimeout();
    if (!pending.current) return;
    pending.current = false;
    setSaving(false);
    if (!ok) return;
    props.onSaved();
    setEditing(false);
    setSaveTrigger(null);
  };

  const handleSave = () => {
    setSaving(true);
    pending.current = true;
    clearSaveTimeout();
    // Safety net: if a child never reports back, stop the spinner rather than spin forever.
    timeoutRef.current = setTimeout(() => { timeoutRef.current = null; setSaving(false); }, props.saveTimeoutMs ?? 15000);
    setSaveTrigger(new Date());
  };

  const handleCancel = () => {
    pending.current = false;
    clearSaveTimeout();
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
    <SettingsPanel headerText={props.headerText} headerIcon={props.headerIcon} editContent={props.canEdit === false ? undefined : <EditVerb onClick={() => setEditing(true)} />} data-testid={props["data-testid"]}>
      {props.view}
    </SettingsPanel>
  );
};
