import React from "react";
import { Alert, TextField } from "@mui/material";
import { useForm } from "react-hook-form";
import { type CampusInterface } from "@churchapps/helpers";
import { InputBox, ApiHelper, Locale } from "@churchapps/apphelper";

interface Props {
  campus: CampusInterface;
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

export const CampusEdit: React.FC<Props> = (props) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const { register, handleSubmit, reset, formState } = useForm<AnyRecord>({ defaultValues: { name: "" } });
  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.name?.message) summaryErrors.push(e.name.message);

  const onValid = (values: AnyRecord) => {
    const campus = { ...props.campus, ...values };
    ApiHelper.post("/campuses", [campus], "AttendanceApi")
      .then(props.updatedFunction)
      .finally(() => { setIsSubmitting(false); });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("attendance.campusEdit.confirmDelete"))) ApiHelper.delete("/campuses/" + props.campus.id, "AttendanceApi").then(props.updatedFunction);
  };

  React.useEffect(() => { reset({ name: props.campus?.name || "" }); }, [props.campus, reset]);

  if (props.campus === null || props.campus.id === undefined) return null;

  return (
    <InputBox
      id="campusBox"
      data-cy="campus-box"
      cancelFunction={props.updatedFunction}
      saveFunction={handleSubmit(onValid)}
      deleteFunction={props.campus?.id ? handleDelete : null}
      headerText={props.campus.name}
      headerIcon="church"
      isSubmitting={isSubmitting}
      help="docs/b1-admin/attendance/">
      {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
      <TextField fullWidth label={Locale.label("attendance.campusEdit.name")} id="name" type="text" placeholder={Locale.label("placeholders.campus.name")} data-testid="campus-name-input" aria-label={Locale.label("attendance.campusEdit.nameAria")} error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("attendance.campusEdit.validate.name") })} />
    </InputBox>
  );
};
