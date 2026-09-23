import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent, Stack } from "@mui/material";
import React from "react";
import { ConditionHelper } from "../../../../helpers";
import { Locale } from "@churchapps/apphelper";
import { type ConditionInterface } from "@churchapps/helpers";
import { getLocalizedMembershipStatusOptions } from "../../../../people/helpers/MembershipStatusOptions";
import { applyConditionChange } from "./conditionHelpers";

interface Props {
  condition: ConditionInterface;
  onChange: (condition: ConditionInterface) => void;
}

export const ConditionSelect = (props: Props) => {
  const init = () => {
    const c = { ...props.condition };
    if (!c.value) {
      c.value = "";
      if (c.field === "gender") c.value = "Unspecified";
      if (c.field === "maritalStatus") c.value = "Unknown";
      if (c.field === "membershipStatus") c.value = "Visitor";
      c.operator = "=";
    }
    c.label = ConditionHelper.getLabel(c);
    props.onChange(c);
  };

  React.useEffect(init, [props.condition.field]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    props.onChange(applyConditionChange(props.condition, e.target.name, e.target.value));
  };

  const getGender = () => (
    <FormControl fullWidth variant="outlined">
      <InputLabel>{Locale.label("person.gender")}</InputLabel>
      <Select label={Locale.label("person.gender")} value={props.condition.value || "Unspecified"} name="value" onChange={handleChange}>
        <MenuItem value="Unspecified">{Locale.label("person.unspecified")}</MenuItem>
        <MenuItem value="Male">{Locale.label("person.male")}</MenuItem>
        <MenuItem value="Female">{Locale.label("person.female")}</MenuItem>
      </Select>
    </FormControl>
  );

  const getMaritalStatus = () => (
    <FormControl fullWidth variant="outlined">
      <InputLabel>{Locale.label("person.maritalStatus")}</InputLabel>
      <Select label={Locale.label("person.maritalStatus")} value={props.condition.value || "Unknown"} name="value" onChange={handleChange}>
        <MenuItem value="Unknown">{Locale.label("person.unknown")}</MenuItem>
        <MenuItem value="Single">{Locale.label("person.single")}</MenuItem>
        <MenuItem value="Married">{Locale.label("person.married")}</MenuItem>
        <MenuItem value="Divorced">{Locale.label("person.divorced")}</MenuItem>
        <MenuItem value="Widowed">{Locale.label("person.widowed")}</MenuItem>
      </Select>
    </FormControl>
  );

  const getMembershipStatus = () => (
    <FormControl fullWidth variant="outlined">
      <InputLabel>{Locale.label("person.membershipStatus")}</InputLabel>
      <Select label={Locale.label("person.membershipStatus")} value={props.condition.value || "Visitor"} name="value" onChange={handleChange}>
        {getLocalizedMembershipStatusOptions().map((option) => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
      </Select>
    </FormControl>
  );

  const getValueField = () => {
    let result = <></>;
    switch (props.condition.field) {
      case "gender": result = getGender(); break;
      case "maritalStatus": result = getMaritalStatus(); break;
      case "membershipStatus": result = getMembershipStatus(); break;
    }
    return result;
  };

  return (
    <Stack spacing={2}>
      <FormControl fullWidth variant="outlined">
        <InputLabel>{Locale.label("tasks.conditionSelect.op")}</InputLabel>
        <Select label={Locale.label("tasks.conditionSelect.op")} value={props.condition.operator || "="} name="operator" onChange={handleChange}>
          <MenuItem value="=">{Locale.label("tasks.conditionSelect.is")}</MenuItem>
          <MenuItem value="!=">{Locale.label("tasks.conditionSelect.isNot")}</MenuItem>
        </Select>
      </FormControl>
      {getValueField()}
    </Stack>
  );
};
