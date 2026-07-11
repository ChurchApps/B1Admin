import { type ConditionInterface } from "@churchapps/helpers";
import { Locale } from "@churchapps/apphelper";

export class ConditionHelper {
  static getTitleCase = (word: string) => {
    const words = word.replace(/([A-Z])/g, " $1");
    return words.substring(0, 1).toUpperCase() + words.substring(1, words.length);
  };

  static getLabel(c: ConditionInterface) {
    const fieldData = c.fieldData ? JSON.parse(c.fieldData) : {};

    let displayField = this.getTitleCase(c.field || "");
    if (fieldData.datePart === "dayOfWeek") displayField += Locale.label("helpers.conditionHelper.dayOfWeek");
    if (fieldData.datePart === "dayOfMonth") displayField += Locale.label("helpers.conditionHelper.dayOfMonth");
    if (fieldData.datePart === "month") displayField += Locale.label("helpers.conditionHelper.month");
    if (fieldData.datePart === "years") displayField = Locale.label("helpers.conditionHelper.yearsSince") + displayField.toLowerCase();

    let displayOperator = c.operator;
    if (displayOperator === "=") displayOperator = Locale.label("helpers.conditionHelper.is");
    else if (displayOperator === "!=") displayOperator = Locale.label("helpers.conditionHelper.isNot");
    else if (displayOperator === "startsWith") displayOperator = Locale.label("helpers.conditionHelper.startsWith");
    else if (displayOperator === "endsWith") displayOperator = Locale.label("helpers.conditionHelper.endsWith");

    let displayValue = c.value;
    const dayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthLabels = [
      "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
    ];
    if (fieldData.datePart === "dayOfWeek") displayValue = dayLabels[parseInt(c.value || "") - 1];
    if (fieldData.datePart === "month") {
      if ((c.value || "").indexOf("{") > -1) displayValue = this.getTitleCase((c.value || "").replace("{", "").replace("}", ""));
      else displayValue = monthLabels[parseInt(c.value || "") - 1];
    }

    const result = displayField + " " + displayOperator + " " + displayValue;

    return result;
  }
}
