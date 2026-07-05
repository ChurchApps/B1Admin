import { type ConditionInterface } from "@churchapps/helpers";
import { ConditionHelper } from "../../../../helpers";

export const applyConditionChange = (
  condition: ConditionInterface,
  name: string,
  value: string,
  updateLabel = true
): ConditionInterface => {
  const c = { ...condition };
  if (name === "value") c.value = value;
  else if (name === "operator") c.operator = value;
  if (updateLabel) c.label = ConditionHelper.getLabel(c);
  return c;
};
