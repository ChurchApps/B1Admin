import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { useCampuses } from "../hooks/useCampuses";

interface Props<T extends FieldValues> {
  control: Control<T>;
  name?: FieldPath<T>;
  label?: string;
  testId?: string;
}

// Reusable campus dropdown for person/group/plan editors.
export const CampusSelect = <T extends FieldValues>({ control, name = "campusId" as FieldPath<T>, label, testId = "campus-select" }: Props<T>) => {
  const campuses = useCampuses();
  const lbl = label ?? Locale.label("person.campus");
  const labelId = `${name}-campus-label`;
  return (
    <FormControl fullWidth>
      <InputLabel id={labelId}>{lbl}</InputLabel>
      <Controller name={name} control={control} render={({ field }) => {
        const raw = field.value ?? "";
        const known = raw === "" || campuses.some((c) => c.id === raw);
        return (
          <Select {...field} value={known ? raw : ""} labelId={labelId} label={lbl} data-testid={testId}>
            <MenuItem value="">{Locale.label("people.personEdit.noCampus")}</MenuItem>
            {campuses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
          </Select>
        );
      }} />
    </FormControl>
  );
};
