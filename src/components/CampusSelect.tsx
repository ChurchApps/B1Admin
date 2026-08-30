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

// Reusable campus dropdown for person/group/plan editors.
export const CampusSelect: React.FC<Props> = ({ control, name = "campusId", label, testId = "campus-select" }) => {
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
