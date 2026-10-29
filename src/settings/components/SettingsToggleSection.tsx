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
  // Each Save (and each Cancel) bumps the generation; a result from an older generation is stale.
  const saveGen = React.useRef(0);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSaveTimeout = () => {
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
  };

  // A result that arrives after the timeout still counts: the save landed, so close and refresh.
  const finish = (gen: number, ok: boolean) => {
    if (saveGen.current !== gen) return;
    clearSaveTimeout();
    setSaving(false);
    if (!ok) return;
    props.onSaved();
    setEditing(false);
    setSaveTrigger(null);
  };

  const handleSave = () => {
    const gen = ++saveGen.current;
    setSaving(true);
    clearSaveTimeout();
    // Safety net: if a child never reports back, stop the spinner rather than spin forever.
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (saveGen.current === gen) setSaving(false);
    }, props.saveTimeoutMs ?? 15000);
    setSaveTrigger(new Date());
  };

  const handleCancel = () => {
    saveGen.current++;
    setSaving(false);
    clearSaveTimeout();
    setEditing(false);
    setSaveTrigger(null);
  };

  // The child reports through the callback from the render where `saveTrigger` changed,
  // so this closes over that save's generation.
  const renderGen = saveGen.current;
  const onSaveComplete = (ok: boolean) => finish(renderGen, ok);

  if (editing) {
    return (
      <FormCard title={props.headerText} icon={props.headerIcon} onSave={handleSave} onCancel={handleCancel} isSubmitting={saving} data-testid={props["data-testid"]}>
        {props.renderEdit(saveTrigger, onSaveComplete)}
      </FormCard>
    );
  }

  return (
    <SettingsPanel headerText={props.headerText} headerIcon={props.headerIcon} editContent={props.canEdit === false ? undefined : <EditVerb onClick={() => setEditing(true)} />} data-testid={props["data-testid"]}>
      {props.view}
    </SettingsPanel>
  );
};
