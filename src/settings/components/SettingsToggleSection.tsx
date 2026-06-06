import React from "react";
import { DisplayBox, InputBox } from "@churchapps/apphelper";

interface Props {
  headerText: string;
  headerIcon: string;
  canEdit?: boolean;
  view: React.ReactNode;
  renderEdit: (saveTrigger: Date | null, onError: (errors: string[]) => void) => React.ReactNode;
  onSaved: () => void;
  "data-testid"?: string;
}

// View↔edit wrapper for sections whose editors save via the shared `saveTrigger`
// pattern (set a Date, the child saves in an effect). Mirrors the save flow that
// ChurchSettingsEdit used to run for all sections at once.
export const SettingsToggleSection: React.FC<Props> = (props) => {
  const [editing, setEditing] = React.useState(false);
  const [saveTrigger, setSaveTrigger] = React.useState<Date | null>(null);
  const [saving, setSaving] = React.useState(false);
  const childErrorsRef = React.useRef<string[]>([]);

  const handleSave = async () => {
    childErrorsRef.current = [];
    setSaving(true);
    setSaveTrigger(new Date());
    await new Promise((resolve) => setTimeout(resolve, 500));
    setSaving(false);
    if (childErrorsRef.current.length > 0) return;
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
      <InputBox headerText={props.headerText} headerIcon={props.headerIcon} saveFunction={handleSave} cancelFunction={handleCancel} isSubmitting={saving} data-testid={props["data-testid"]}>
        {props.renderEdit(saveTrigger, (errors) => { childErrorsRef.current = errors; })}
      </InputBox>
    );
  }

  return (
    <DisplayBox headerText={props.headerText} headerIcon={props.headerIcon} editFunction={props.canEdit === false ? undefined : () => setEditing(true)} data-testid={props["data-testid"]}>
      {props.view}
    </DisplayBox>
  );
};
