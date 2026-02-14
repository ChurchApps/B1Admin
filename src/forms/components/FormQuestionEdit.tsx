import { Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField, type SelectChangeEvent } from "@mui/material";
import React, { useState } from "react";
import { ChoicesEdit } from ".";
import { type QuestionInterface } from "@churchapps/helpers";
import { useMountedState, ApiHelper, InputBox, UniqueIdHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { PaymentEdit } from "./PaymentEdit";

interface Props {
  questionId: string;
  formId: string;
  updatedFunction: () => void;
}

export function FormQuestionEdit(props: Props) {
  const [question, setQuestion] = useState<QuestionInterface>({
    title: "",
    fieldType: "Textbox",
    placeholder: "",
    required: false,
    description: "",
    choices: null
  } as QuestionInterface);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isMounted = useMountedState();

  function loadData() {
    if (!isMounted()) {
      return;
    }
    if (props.questionId) {
      ApiHelper.get("/questions/" + props.questionId + "?formId=" + props.formId, "MembershipApi").then((data: QuestionInterface) => setQuestion(data));
    } else setQuestion({ formId: props.formId, fieldType: "Textbox" } as QuestionInterface);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    setErrors([]);
    const q = { ...question } as QuestionInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "fieldType": q.fieldType = value; break;
      case "title": q.title = value; break;
      case "description": q.description = value; break;
      case "placeholder": q.placeholder = value; break;
    }
    setQuestion(q);
  };

  const handleCheckChange = (e: React.SyntheticEvent<Element | Event>, checked: boolean) => {
    setErrors([]);
    const q = { ...question } as QuestionInterface;
    q.required = checked;
    setQuestion(q);
  };

  const getChoices = (fieldType: string) => {
    let result = <></>;
    switch (fieldType) {
      case "Multiple Choice":
      case "Checkbox":
        result = <ChoicesEdit question={question} updatedFunction={setQuestion} />;
        break;
      case "Payment":
        result = <PaymentEdit question={question} updatedFunction={setQuestion} />;
        break;
      default:
        result = (
          <TextField fullWidth label={Locale.label("forms.formQuestionEdit.plcOp")} id="placeholder" type="text" name="placeholder" value={question.placeholder || ""} onChange={handleChange} placeholder={Locale.label("placeholders.form.questionPlaceholder")} />
        );
        break;
    }
    return result;
  };

  const validate = () => {
    const result = [];
    if (!question.title) result.push(Locale.label("forms.formQuestionEdit.questionReq"));
    if (!question.fieldType) result.push(Locale.label("forms.formQuestionEdit.fieldReq"));
    setErrors(result);
    return result.length === 0;
  };

  function handleSave() {
    if (validate()) {
      setIsSubmitting(true);
      ApiHelper.post("/questions/", [question], "MembershipApi")
        .then(() => props.updatedFunction())
        .finally(() => {
          setIsSubmitting(false);
        });
    }
  }

  function handleDelete() {
    if (window.confirm(Locale.label("forms.formQuestionEdit.confirmMsg"))) {
      ApiHelper.delete("/questions/" + question.id + "/?formId=" + props.formId, "MembershipApi").then(props.updatedFunction);
    }
  }

  React.useEffect(loadData, [props.questionId || props.formId]);

  return (
    <InputBox
      id="questionBox"
      headerIcon="help"
      headerText={Locale.label("forms.formQuestionEdit.questionEdit")}
      saveFunction={handleSave}
      cancelFunction={props.updatedFunction}
      isSubmitting={isSubmitting}
      deleteFunction={!UniqueIdHelper.isMissing(question.id) ? handleDelete : undefined}
      help="docs/b1-admin/forms/">
      <ErrorMessages errors={errors} />
      <FormControl fullWidth>
        <InputLabel id="provider">{Locale.label("forms.formQuestionEdit.prov")}</InputLabel>
        <Select name="fieldType" labelId="provider" label={Locale.label("forms.formQuestionEdit.prov")} value={question.fieldType} onChange={handleChange}>
          <MenuItem value="Textbox">{Locale.label("forms.formQuestionEdit.textBox")}</MenuItem>
          <MenuItem value="Whole Number">{Locale.label("forms.formQuestionEdit.wholeNum")}</MenuItem>
          <MenuItem value="Decimal">{Locale.label("forms.formQuestionEdit.decNum")}</MenuItem>
          <MenuItem value="Date">{Locale.label("forms.formQuestionEdit.date")}</MenuItem>
          <MenuItem value="Yes/No">{Locale.label("forms.formQuestionEdit.yesNo")}</MenuItem>
          <MenuItem value="Email">{Locale.label("person.email")}</MenuItem>
          <MenuItem value="Phone Number">{Locale.label("forms.formQuestionEdit.phoneNum")}</MenuItem>
          <MenuItem value="Text Area">{Locale.label("forms.formQuestionEdit.textArea")}</MenuItem>
          <MenuItem value="Multiple Choice">{Locale.label("forms.formQuestionEdit.multiChoice")}</MenuItem>
          <MenuItem value="Checkbox">{Locale.label("forms.formQuestionEdit.checkBox")}</MenuItem>
          <MenuItem value="Payment">{Locale.label("forms.formQuestionEdit.payment")}</MenuItem>
        </Select>
      </FormControl>

      <TextField
        fullWidth
        label={Locale.label("common.title")}
        id="title"
        type="text"
        name="title"
        value={question.title || ""}
        onChange={handleChange}
        placeholder={Locale.label("placeholders.form.questionTitle")}
        data-testid="question-title-input"
        aria-label="Question title"
      />
      <TextField
        fullWidth
        label={Locale.label("forms.formQuestionEdit.desc")}
        id="description"
        type="text"
        name="description"
        value={question.description || ""}
        onChange={handleChange}
        placeholder={Locale.label("placeholders.form.questionDescription")}
        data-testid="question-description-input"
        aria-label="Question description"
      />

      {getChoices(question.fieldType)}
      {question.fieldType !== "Payment" && (
        <FormControlLabel
          control={<Checkbox data-testid="question-required-checkbox" aria-label="Question required" />}
          label={Locale.label("forms.formQuestionEdit.ansReq")}
          name="required"
          checked={!!question.required}
          onChange={handleCheckChange}
        />
      )}
    </InputBox>
  );
}
