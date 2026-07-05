import React from "react";
import { Alert, TextField, MenuItem } from "@mui/material";
import { type QuestionInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type PersonFieldInterface, type PersonFieldChoice } from "../../helpers/Interfaces";
import { FormCard } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";
import { ChoicesEdit } from "../../forms/components/ChoicesEdit";

const FIELD_TYPES = ["Textbox", "Whole Number", "Decimal", "Date", "Yes/No", "Multiple Choice"];

interface Props {
  field: PersonFieldInterface;
  updatedFunction: () => void;
}

export const CustomFieldEdit: React.FC<Props> = (props) => {
  const [name, setName] = React.useState("");
  const [fieldType, setFieldType] = React.useState("Textbox");
  const [choices, setChoices] = React.useState<PersonFieldChoice[]>([]);
  const [error, setError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  React.useEffect(() => {
    setName(props.field?.name || "");
    setFieldType(props.field?.fieldType || "Textbox");
    let parsed: PersonFieldChoice[] = [];
    if (props.field?.choices) {
      try { parsed = JSON.parse(props.field.choices); } catch { parsed = []; }
    }
    setChoices(Array.isArray(parsed) ? parsed : []);
    setError("");
  }, [props.field]);

  const handleSave = () => {
    if (!name.trim()) { setError(Locale.label("settings.customFieldEdit.validate.name")); return; }
    setIsSubmitting(true);
    const field: PersonFieldInterface = {
      ...props.field,
      name: name.trim(),
      fieldType,
      choices: fieldType === "Multiple Choice" ? JSON.stringify(choices) : null
    };
    ApiHelper.post("/personfields", [field], "MembershipApi")
      .then(props.updatedFunction)
      .finally(() => { setIsSubmitting(false); });
  };

  const handleDelete = async () => {
    if (await confirm(Locale.label("settings.customFieldEdit.confirmDelete"))) {
      ApiHelper.delete("/personfields/" + props.field.id, "MembershipApi").then(props.updatedFunction);
    }
  };

  if (props.field === null) return null;

  return (
    <FormCard
      id="customFieldBox"
      data-testid="custom-field-box"
      title={props.field.name || Locale.label("settings.customFields.field")}
      icon="list_alt"
      onSave={handleSave}
      onCancel={props.updatedFunction}
      onDelete={props.field?.id ? handleDelete : undefined}
      isSubmitting={isSubmitting}
      help="docs/b1-admin/settings/">
      {ConfirmDialogElement}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField fullWidth label={Locale.label("settings.customFieldEdit.name")} data-testid="custom-field-name-input" value={name} onChange={(e) => setName(e.target.value)} sx={{ mb: 1 }} />
      <TextField fullWidth select label={Locale.label("settings.customFieldEdit.fieldType")} data-testid="custom-field-type-select" value={fieldType} onChange={(e) => setFieldType(e.target.value)} sx={{ mb: 1 }}>
        {FIELD_TYPES.map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
      </TextField>
      {fieldType === "Multiple Choice" && (
        <ChoicesEdit question={{ choices } as QuestionInterface} updatedFunction={(q) => setChoices([...((q.choices as PersonFieldChoice[]) || [])])} />
      )}
    </FormCard>
  );
};
