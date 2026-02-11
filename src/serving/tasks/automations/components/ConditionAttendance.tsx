import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent, Stack } from "@mui/material";
import React from "react";
import { type ConditionInterface, Locale } from "@churchapps/apphelper";

interface Props {
  condition: ConditionInterface;
  onChange: (condition: ConditionInterface) => void;
}

export const ConditionAttendance = (props: Props) => {
  const fieldData: any = props.condition.fieldData ? JSON.parse(props.condition.fieldData) : {};

  const init = () => {
    const c = { ...props.condition };
    c.operator = ">";
    c.value = "0";

    if (!fieldData.eventType) {
      fieldData.eventType = "any";
      c.fieldData = JSON.stringify(fieldData);
    }
    props.onChange(c);
  };

  React.useEffect(init, [props.condition.field]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const c = { ...props.condition };
    const val = e.target.value;
    switch (e.target.name) {
      case "value": c.value = val; break;
      case "operator": c.operator = val; break;
    }
    props.onChange(c);
  };

  const handleFieldDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const val = e.target.value;
    switch (e.target.name) {
      case "eventType": fieldData.eventType = val; break;
      case "campusId": fieldData.campusId = val; break;
    }
    const c = { ...props.condition };
    c.fieldData = JSON.stringify(fieldData);
    props.onChange(c);
  };
  /*
    const getCampus = () => (
      <FormControl fullWidth>
        <InputLabel>Campus</InputLabel>
        <Select fullWidth label="Campus" value={fieldData.campusId || ""} name="campusId" onChange={handleFieldDataChange}>
          <MenuItem value="Member">Member</MenuItem>
          <MenuItem value="Visitor">Visitor</MenuItem>
          <MenuItem value="Staff">Staff</MenuItem>
        </Select>
      </FormControl>
    )
  */
  return (
    <Stack spacing={2}>
      <FormControl fullWidth variant="outlined">
        <InputLabel>{Locale.label("tasks.conditionAttendance.op")}</InputLabel>
        <Select label={Locale.label("tasks.conditionAttendance.op")} value={props.condition.operator || ">"} name="operator" onChange={handleChange}>
          <MenuItem value=">">{Locale.label("tasks.conditionAttendance.hasAtt")}</MenuItem>
          <MenuItem value="=">{Locale.label("tasks.conditionAttendance.hasNoAtt")}</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth variant="outlined">
        <InputLabel>{Locale.label("tasks.conditionAttendance.eventType")}</InputLabel>
        <Select label={Locale.label("tasks.conditionAttendance.eventType")} value={fieldData.eventType || "any"} name="eventType" onChange={handleFieldDataChange}>
          <MenuItem value="any">{Locale.label("tasks.conditionAttendance.anywhere")}</MenuItem>
          <MenuItem value="campus">{Locale.label("tasks.conditionAttendance.campus")}</MenuItem>
          <MenuItem value="service">{Locale.label("tasks.conditionAttendance.serv")}</MenuItem>
          <MenuItem value="serviceTime">{Locale.label("tasks.conditionAttendance.servTime")}</MenuItem>
          <MenuItem value="group">{Locale.label("tasks.conditionAttendance.group")}</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
};
