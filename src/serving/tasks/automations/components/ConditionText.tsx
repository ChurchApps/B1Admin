import { FormControl, InputLabel, MenuItem, Select, TextField, type SelectChangeEvent, Stack } from "@mui/material";
import React from "react";
import { ConditionHelper } from "../../../../helpers";
import { type ConditionInterface, Locale } from "@churchapps/apphelper";

interface Props {
  condition: ConditionInterface;
  onChange: (condition: ConditionInterface) => void;
}

export const ConditionText = (props: Props) => {
  const init = () => {
    const c = { ...props.condition };
    if (!c.value) {
      c.value = "";
      c.operator = "=";
    }
    c.label = ConditionHelper.getLabel(c);
    props.onChange(c);
  };

  React.useEffect(init, [props.condition.field]); //eslint-disable-line

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const c = { ...props.condition };
    const val = e.target.value;
    switch (e.target.name) {
      case "value":
        c.value = val;
        break;
      case "operator":
        c.operator = val;
        break;
    }
    c.label = ConditionHelper.getLabel(c);
    props.onChange(c);
  };

  const getTextField = () => {
    const label = ConditionHelper.getTitleCase(props.condition.field);
    return (
      <TextField
        fullWidth
        type="text"
        label={label}
        value={props.condition.value || ""}
        name="value"
        onChange={handleChange}
        data-testid="condition-value-input"
        aria-label="Condition value"
        variant="outlined"
        sx={{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "primary.main" } } }}
      />
    );
  };

  return (
    <Stack spacing={2}>
      <FormControl fullWidth variant="outlined">
        <InputLabel>{Locale.label("tasks.conditionText.op")}</InputLabel>
        <Select
          label={Locale.label("tasks.conditionText.op")}
          value={props.condition.operator || "="}
          name="operator"
          onChange={handleChange}
          data-testid="condition-operator-select"
          aria-label="Condition operator">
          <MenuItem value="=">=</MenuItem>
          <MenuItem value="contains">{Locale.label("tasks.conditionText.contains")}</MenuItem>
          <MenuItem value="startsWith">{Locale.label("tasks.conditionText.startW")}</MenuItem>
          <MenuItem value="endsWith">{Locale.label("tasks.conditionText.endW")}</MenuItem>
          <MenuItem value=">">&gt;</MenuItem>
          <MenuItem value=">=">&gt;=</MenuItem>
          <MenuItem value="<">&lt;</MenuItem>
          <MenuItem value="<=">&lt;=</MenuItem>
          <MenuItem value="!=">!=</MenuItem>
        </Select>
      </FormControl>
      {getTextField()}
    </Stack>
  );
};
