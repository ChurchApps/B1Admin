import { Stack, TextField, Typography } from "@mui/material";
import React from "react";
import { Locale } from "@churchapps/apphelper";
import { type ConditionInterface } from "@churchapps/helpers";
import { ConditionHelper } from "../../../../helpers";

interface Props {
  condition: ConditionInterface;
  onChange: (condition: ConditionInterface) => void;
}

// Lapsed regular giver: weeks only, never amounts. The Api clamps the numbers and needs donations View to save.
const defaults = { regularWeeks: 12, minWeeks: 3, lapsedWeeks: 3 };

export const ConditionGiving = (props: Props) => {
  const data = { ...defaults, ...(props.condition.fieldData ? JSON.parse(props.condition.fieldData) : {}) };

  const update = (changes: Partial<typeof defaults>) => {
    const c = { ...props.condition, operator: "lapsed", value: "", fieldData: JSON.stringify({ ...data, ...changes }) };
    c.label = ConditionHelper.getLabel(c);
    props.onChange(c);
  };

  React.useEffect(() => { update({}); }, [props.condition.field]);

  const numberField = (key: keyof typeof defaults, label: string, testId: string, max: number) => (
    <TextField
      type="number"
      size="small"
      label={label}
      value={data[key]}
      onChange={(e) => update({ [key]: parseInt(e.target.value, 10) || 1 })}
      inputProps={{ min: 1, max }}
      data-testid={testId}
      sx={{ width: 140 }}
    />
  );

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography>{Locale.label("tasks.conditionGiving.gaveIn")}</Typography>
        {numberField("minWeeks", Locale.label("tasks.conditionGiving.weeks"), "giving-min-weeks", data.regularWeeks)}
        <Typography>{Locale.label("tasks.conditionGiving.ofTheLast")}</Typography>
        {numberField("regularWeeks", Locale.label("tasks.conditionGiving.weeks"), "giving-regular-weeks", 104)}
        <Typography>{Locale.label("tasks.conditionGiving.weeksLower")}</Typography>
      </Stack>
      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography>{Locale.label("tasks.conditionGiving.thenNothing")}</Typography>
        {numberField("lapsedWeeks", Locale.label("tasks.conditionGiving.weeks"), "giving-lapsed-weeks", 52)}
        <Typography>{Locale.label("tasks.conditionGiving.weeksLower")}</Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary">{Locale.label("tasks.conditionGiving.privacy")}</Typography>
    </Stack>
  );
};
