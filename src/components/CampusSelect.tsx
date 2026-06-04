import React from "react";
import { Controller, type Control } from "react-hook-form";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { useCampuses } from "../hooks/useCampuses";

interface Props {
  control: Control<any>;
  name?: string;
  label?: string;
  testId?: string;
}

// Reusable campus dropdown for react-hook-form. Loads the shared campus list and
// renders an "Unassigned" option (value "") plus one item per campus. Used by
// the person, group, and plan editors so the dropdown only lives in one place.
export const CampusSelect: React.FC<Props> = ({ control, name = "campusId", label, testId = "campus-select" }) => {
  const campuses = useCampuses();
  const lbl = label ?? Locale.label("person.campus");
  const labelId = `${name}-campus-label`;
  return (
    <FormControl fullWidth>
      <InputLabel id={labelId}>{lbl}</InputLabel>
      <Controller name={name} control={control} render={({ field }) => (
        <Select {...field} value={field.value ?? ""} labelId={labelId} label={lbl} data-testid={testId}>
          <MenuItem value="">{Locale.label("people.personEdit.noCampus")}</MenuItem>
          {campuses.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </Select>
      )} />
    </FormControl>
  );
};
