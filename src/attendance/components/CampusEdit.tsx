import React from "react";
import { TextField } from "@mui/material";
import { type CampusInterface } from "@churchapps/helpers";
import { InputBox, ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";

interface Props {
  campus: CampusInterface;
  updatedFunction: () => void;
}

export const CampusEdit: React.FC<Props> = (props) => {
  const [campus, setCampus] = React.useState({} as CampusInterface);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setErrors([]);
    const c = { ...campus } as CampusInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "name": c.name = value; break;
    }
    setCampus(c);
  };

  const validate = () => {
    const result = [];
    if (!campus.name) result.push(Locale.label("attendance.campusEdit.validate.name"));
    setErrors(result);
    return result.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      ApiHelper.post("/campuses", [campus], "AttendanceApi")
        .then(props.updatedFunction)
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("attendance.campusEdit.confirmDelete"))) ApiHelper.delete("/campuses/" + campus.id, "AttendanceApi").then(props.updatedFunction);
  };

  React.useEffect(() => setCampus(props.campus), [props.campus]);

  if (campus === null || campus.id === undefined) return null;

  return (
    <InputBox
      id="campusBox"
      data-cy="campus-box"
      cancelFunction={props.updatedFunction}
      saveFunction={handleSave}
      deleteFunction={props.campus?.id ? handleDelete : null}
      headerText={campus.name}
      headerIcon="church"
      isSubmitting={isSubmitting}
      help="b1Admin/attendance">
      <ErrorMessages errors={errors} />
      <TextField
        fullWidth
        label={Locale.label("attendance.campusEdit.name")}
        id="name"
        name="name"
        type="text"
        value={campus.name}
        onChange={handleChange}
        placeholder={Locale.label("placeholders.campus.name")}
        data-testid="campus-name-input"
        aria-label="Campus name"
      />
    </InputBox>
  );
};
