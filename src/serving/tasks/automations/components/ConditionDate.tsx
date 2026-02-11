import { FormControl, InputLabel, ListSubheader, MenuItem, Select, TextField, type SelectChangeEvent, Stack } from "@mui/material";
import React from "react";
import { type ConditionInterface, Locale } from "@churchapps/apphelper";
import { ConditionHelper } from "../../../../helpers";

interface Props {
  condition: ConditionInterface;
  onChange: (condition: ConditionInterface) => void;
}

export const ConditionDate = (props: Props) => {
  const init = () => {
    const c = { ...props.condition };
    if (!c.value) {
      c.value = "";
      c.operator = "=";
      c.fieldData = JSON.stringify({ datePart: "full" });
    }
    c.label = ConditionHelper.getLabel(c);
    props.onChange(c);
  };

  React.useEffect(init, [props.condition.field]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const c = { ...props.condition };
    const val = e.target.value;
    switch (e.target.name) {
      case "value": c.value = val; break;
      case "operator": c.operator = val; break;
      case "datePart":
        c.fieldData = JSON.stringify({ datePart: val });
        if (val === "dayOfWeek" || val === "month" || val === "dayOfMonth" || val === "years") c.value = "1";
        break;
    }
    c.label = ConditionHelper.getLabel(c);
    props.onChange(c);
  };

  const getDateField = () => {
    const label = ConditionHelper.getTitleCase(props.condition.field);
    return (
      <TextField
        fullWidth
        type="date"
        label={label}
        value={props.condition.value || ""}
        name="value"
        onChange={handleChange}
        variant="outlined"
        InputLabelProps={{ shrink: true }}
        sx={{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "primary.main" } } }}
      />
    );
  };

  const getNumberField = () => {
    const label = ConditionHelper.getTitleCase(props.condition.field);
    return (
      <TextField
        fullWidth
        type="number"
        label={label}
        value={props.condition.value || ""}
        name="value"
        onChange={handleChange}
        data-testid="condition-number-input"
        aria-label="Number value"
        variant="outlined"
        sx={{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "primary.main" } } }}
      />
    );
  };

  const getDayOfWeek = () => (
    <FormControl fullWidth variant="outlined">
      <InputLabel>{Locale.label("tasks.conditionDate.dayOf")}</InputLabel>
      <Select label={Locale.label("tasks.conditionDate.dayOf")} value={props.condition.value || "1"} name="value" onChange={handleChange} data-testid="day-of-week-select" aria-label="Day of week">
        <MenuItem value="1">{Locale.label("tasks.conditionDate.sun")}</MenuItem>
        <MenuItem value="2">{Locale.label("tasks.conditionDate.mon")}</MenuItem>
        <MenuItem value="3">{Locale.label("tasks.conditionDate.tues")}</MenuItem>
        <MenuItem value="4">{Locale.label("tasks.conditionDate.wed")}</MenuItem>
        <MenuItem value="5">{Locale.label("tasks.conditionDate.thurs")}</MenuItem>
        <MenuItem value="6">{Locale.label("tasks.conditionDate.fri")}</MenuItem>
        <MenuItem value="7">{Locale.label("tasks.conditionDate.sat")}</MenuItem>
      </Select>
    </FormControl>
  );

  const getMonth = () => (
    <FormControl fullWidth variant="outlined">
      <InputLabel>{Locale.label("tasks.conditionDate.month")}</InputLabel>
      <Select
        label={Locale.label("tasks.conditionDate.month")}
        value={props.condition.value || "1"}
        name="value"
        onChange={handleChange}
        sx={{
          "& .MuiListSubheader-root": {
            backgroundColor: "grey.100",
            fontWeight: 600,
            color: "text.primary",
            lineHeight: "36px"
          }
        }}>
        <ListSubheader>{Locale.label("tasks.conditionDate.absolute")}</ListSubheader>
        <MenuItem value="1">{Locale.label("month.jan")}</MenuItem>
        <MenuItem value="2">{Locale.label("month.feb")}</MenuItem>
        <MenuItem value="3">{Locale.label("month.mar")}</MenuItem>
        <MenuItem value="4">{Locale.label("month.apr")}</MenuItem>
        <MenuItem value="5">{Locale.label("month.may")}</MenuItem>
        <MenuItem value="6">{Locale.label("month.june")}</MenuItem>
        <MenuItem value="7">{Locale.label("month.july")}</MenuItem>
        <MenuItem value="8">{Locale.label("month.aug")}</MenuItem>
        <MenuItem value="9">{Locale.label("month.sep")}</MenuItem>
        <MenuItem value="10">{Locale.label("month.oct")}</MenuItem>
        <MenuItem value="11">{Locale.label("month.nov")}</MenuItem>
        <MenuItem value="12">{Locale.label("month.dec")}</MenuItem>
        <ListSubheader>{Locale.label("tasks.conditionDate.relative")}</ListSubheader>
        <MenuItem value="{previousMonth}">{Locale.label("tasks.conditionDate.prevMonth")}</MenuItem>
        <MenuItem value="{currentMonth}">{Locale.label("tasks.conditionDate.curMonth")}</MenuItem>
        <MenuItem value="{nextMonth}">{Locale.label("tasks.conditionDate.nextMonth")}</MenuItem>
      </Select>
    </FormControl>
  );

  const getField = () => {
    let result = getDateField();
    switch (fieldData?.datePart) {
      case "dayOfWeek": result = getDayOfWeek(); break;
      case "month": result = getMonth(); break;
      case "dayOfMonth":
      case "years": result = getNumberField(); break;
    }

    return result;
  };

  const fieldData = props.condition.fieldData ? JSON.parse(props.condition.fieldData) : {};

  return (
    <Stack spacing={2}>
      <FormControl fullWidth variant="outlined">
        <InputLabel>{Locale.label("tasks.conditionDate.datePart")}</InputLabel>
        <Select label={Locale.label("tasks.conditionDate.datePart")} value={fieldData.datePart || "full"} name="datePart" onChange={handleChange}>
          <MenuItem value="full">{Locale.label("tasks.conditionDate.dateFull")}</MenuItem>
          <MenuItem value="dayOfWeek">{Locale.label("tasks.conditionDate.weekDay")}</MenuItem>
          <MenuItem value="dayOfMonth">{Locale.label("tasks.conditionDate.monthDay")}</MenuItem>
          <MenuItem value="month">{Locale.label("tasks.conditionDate.month")}</MenuItem>
          <MenuItem value="years">{Locale.label("tasks.conditionDate.yearsE")}</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth variant="outlined">
        <InputLabel>{Locale.label("tasks.conditionDate.op")}</InputLabel>
        <Select label={Locale.label("tasks.conditionDate.op")} value={props.condition.operator || "="} name="operator" onChange={handleChange}>
          <MenuItem value="=">=</MenuItem>
          <MenuItem value=">">&gt;</MenuItem>
          <MenuItem value=">=">&gt;=</MenuItem>
          <MenuItem value="<">&lt;</MenuItem>
          <MenuItem value="<=">&lt;=</MenuItem>
          <MenuItem value="!=">!=</MenuItem>
        </Select>
      </FormControl>
      {getField()}
    </Stack>
  );
};
