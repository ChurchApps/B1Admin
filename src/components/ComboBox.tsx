import React from "react";
import { TextField, MenuItem, Select, FormControl, InputLabel, type SelectChangeEvent } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: string[];
  testId?: string;
  addNewLabel?: string;
  placeholder?: string;
}

export const ComboBox: React.FC<Props> = (props) => {
  const [isAddingNew, setIsAddingNew] = React.useState(false);

  const handleSelect = (e: SelectChangeEvent) => {
    const value = e.target.value;
    if (value === "__ADD_NEW__") {
      setIsAddingNew(true);
      props.onChange("");
    } else {
      setIsAddingNew(false);
      props.onChange(value);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    props.onChange(e.target.value);
  };

  if (isAddingNew) {
    return (
      <TextField
        fullWidth
        type="text"
        label={props.label}
        value={props.value}
        onChange={handleTextChange}
        placeholder={props.placeholder}
        data-testid={props.testId ? `${props.testId}-input` : undefined}
        aria-label={props.label}
        autoFocus
      />
    );
  }

  return (
    <FormControl fullWidth>
      <InputLabel id={`${props.testId}-label`}>{props.label}</InputLabel>
      <Select
        labelId={`${props.testId}-label`}
        value={props.value}
        label={props.label}
        onChange={handleSelect}
        data-testid={props.testId ? `${props.testId}-select` : undefined}
        aria-label={props.label}>
        {props.options.map((option) => (
          <MenuItem key={option} value={option}>{option}</MenuItem>
        ))}
        <MenuItem value="__ADD_NEW__" data-testid="add-new-option">{props.addNewLabel || Locale.label("common.comboBox.addNew")}</MenuItem>
      </Select>
    </FormControl>
  );
};
