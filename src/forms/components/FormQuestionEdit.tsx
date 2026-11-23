import { Checkbox, FormControl, FormControlLabel, FormHelperText, Grid, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import React from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { ChoicesEdit } from ".";
import { type QuestionInterface } from "../../helpers";
import { useMountedState, ApiHelper, UniqueIdHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { useConfirmDelete, useErrorSummary } from "../../hooks";
import { PaymentEdit } from "./PaymentEdit";

// The installed @churchapps/helpers predates showIf.
export type ConditionalQuestion = QuestionInterface & { showIf?: { questionId?: string; value?: string } | null };

interface Props {
  questionId: string;
  formId: string;
  questions?: ConditionalQuestion[];
  updatedFunction: () => void;
}

// The form starts with choices: null until a question is loaded.
type QuestionFormValues = Omit<ConditionalQuestion, "choices" | "showIf"> & { choices?: QuestionInterface["choices"] | null; showIf: { questionId: string; value: string } };

const noCondition = { questionId: "", value: "" };
const nonTriggerTypes = ["Heading", "Payment"];

// Choices a condition can match; other answer types can only be checked for "answered".
export const getConditionChoices = (q?: QuestionInterface) => {
  if (!q) return [];
  if (q.fieldType === "Yes/No") return [{ value: "True", text: Locale.label("common.yes") }, { value: "False", text: Locale.label("common.no") }];
  if (q.fieldType === "Multiple Choice" || q.fieldType === "Checkbox") return q.choices || [];
  return [];
};

export function FormQuestionEdit(props: Props) {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isMounted = useMountedState();

  const { control, register, handleSubmit, reset, watch, setValue } = useForm<QuestionFormValues>({ defaultValues: { title: "", fieldType: "Textbox", placeholder: "", required: false, description: "", choices: null, showIf: noCondition } });

  const { errors } = useFormState({ control });
  const e = errors;
  const summaryErrors = useErrorSummary(errors, ["title", "fieldType"]);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const fieldType = watch("fieldType");
  const showIfQuestionId = watch("showIf.questionId");
  const watchedQuestion = watch() as QuestionInterface;

  function loadData() {
    if (!isMounted()) return;
    if (props.questionId) {
      ApiHelper.get("/questions/" + props.questionId + "?formId=" + props.formId, "MembershipApi").then((data: ConditionalQuestion) => reset({ ...data, showIf: { questionId: data.showIf?.questionId || "", value: data.showIf?.value || "" } }));
    } else {
      reset({ formId: props.formId, fieldType: "Textbox", title: "", placeholder: "", required: false, description: "", choices: null, showIf: noCondition });
    }
  }

  const getChoices = (ft: string | undefined) => {
    switch (ft) {
      case "Multiple Choice":
      case "Checkbox":
        return <ChoicesEdit question={watchedQuestion} updatedFunction={(q) => reset(q)} />;
      case "Payment":
        return <PaymentEdit question={watchedQuestion} updatedFunction={(q) => reset(q)} />;
      default:
        return <TextField fullWidth label={Locale.label("forms.formQuestionEdit.plcOp")} id="placeholder" type="text" placeholder={Locale.label("placeholders.form.questionPlaceholder")} {...register("placeholder")} />;
    }
  };

  // One level only: a question others depend on can't be conditional, and a conditional question can't be a trigger.
  const getConditionEdit = () => {
    const questions = props.questions || [];
    const ownIndex = questions.findIndex((q) => q.id === watchedQuestion.id);
    const earlier = ownIndex === -1 ? questions : questions.slice(0, ownIndex);
    const triggers = earlier.filter((q) => q.id && !q.showIf?.questionId && !nonTriggerTypes.includes(q.fieldType || ""));
    const hasDependents = !!watchedQuestion.id && questions.some((q) => q.showIf?.questionId === watchedQuestion.id);
    if (triggers.length === 0 && !showIfQuestionId) return null;
    const choices = getConditionChoices(questions.find((q) => q.id === showIfQuestionId));
    return (
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth disabled={hasDependents}>
            <InputLabel id="showIfQuestion">{Locale.label("forms.formQuestionEdit.showIf")}</InputLabel>
            <Controller name="showIf.questionId" control={control} render={({ field }) => (
              <Select {...field} value={field.value ?? ""} onChange={(ev) => { field.onChange(ev.target.value); setValue("showIf.value", ""); }} labelId="showIfQuestion" label={Locale.label("forms.formQuestionEdit.showIf")} data-testid="question-show-if-select">
                <MenuItem value="">{Locale.label("forms.formQuestionEdit.always")}</MenuItem>
                {triggers.map((q) => <MenuItem key={q.id} value={q.id}>{q.title}</MenuItem>)}
              </Select>
            )} />
            <FormHelperText>{Locale.label(hasDependents ? "forms.formQuestionEdit.hasDependents" : "forms.formQuestionEdit.showIfHelper")}</FormHelperText>
          </FormControl>
        </Grid>
        {showIfQuestionId && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth>
              <InputLabel id="showIfValue">{Locale.label("forms.formQuestionEdit.showIfAnswer")}</InputLabel>
              <Controller name="showIf.value" control={control} render={({ field }) => (
                <Select {...field} value={field.value ?? ""} labelId="showIfValue" label={Locale.label("forms.formQuestionEdit.showIfAnswer")} data-testid="question-show-if-value-select">
                  <MenuItem value="">{Locale.label("forms.formQuestionEdit.anyAnswer")}</MenuItem>
                  {choices.map((c) => <MenuItem key={c.value} value={c.value}>{c.text}</MenuItem>)}
                </Select>
              )} />
            </FormControl>
          </Grid>
        )}
      </Grid>
    );
  };

  const onValid = (values: QuestionFormValues) => {
    setIsSubmitting(true);
    const question = { ...values, showIf: values.showIf.questionId ? values.showIf : null };
    ApiHelper.post("/questions/", [question], "MembershipApi")
      .then(() => props.updatedFunction())
      .finally(() => { setIsSubmitting(false); });
  };

  async function handleDelete() {
    if (await confirm(Locale.label("forms.formQuestionEdit.confirmMsg"))) {
      const dependents = (props.questions || []).filter((q) => q.showIf?.questionId === watchedQuestion.id).map((q) => ({ ...q, showIf: null }));
      await ApiHelper.delete("/questions/" + watchedQuestion.id + "/?formId=" + props.formId, "MembershipApi");
      if (dependents.length > 0) await ApiHelper.post("/questions/", dependents, "MembershipApi");
      props.updatedFunction();
    }
  }

  React.useEffect(loadData, [props.questionId || props.formId]);

  return (
    <FormCard id="questionBox" icon="help" title={Locale.label("forms.formQuestionEdit.questionEdit")} onSave={handleSubmit(onValid)} onCancel={props.updatedFunction} isSubmitting={isSubmitting} onDelete={!UniqueIdHelper.isMissing(watchedQuestion.id) ? handleDelete : undefined} help="docs/b1-admin/forms/">
      {ConfirmDialogElement}
      <ErrorMessages errors={summaryErrors} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth>
            <InputLabel id="provider">{Locale.label("forms.formQuestionEdit.fieldType")}</InputLabel>
            <Controller name="fieldType" control={control} render={({ field }) => (
              <Select {...field} value={field.value ?? "Textbox"} labelId="provider" label={Locale.label("forms.formQuestionEdit.fieldType")}>
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
            )} />
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField fullWidth label={Locale.label("common.title")} id="title" type="text" placeholder={Locale.label("placeholders.form.questionTitle")} data-testid="question-title-input" aria-label={Locale.label("forms.formQuestionEdit.questionTitleAria")} error={!!e.title} helperText={e.title?.message} {...register("title", { required: Locale.label("forms.formQuestionEdit.questionReq") })} />
        </Grid>
      </Grid>
      <TextField fullWidth label={Locale.label("forms.formQuestionEdit.desc")} id="description" type="text" placeholder={Locale.label("placeholders.form.questionDescription")} data-testid="question-description-input" aria-label={Locale.label("forms.formQuestionEdit.questionDescriptionAria")} {...register("description")} />

      {getChoices(fieldType)}
      {getConditionEdit()}
      {fieldType !== "Payment" && (
        <Controller name="required" control={control} render={({ field }) => (
          <FormControlLabel control={<Checkbox checked={!!field.value} onChange={(ev) => field.onChange(ev.target.checked)} data-testid="question-required-checkbox" aria-label={Locale.label("forms.formQuestionEdit.questionRequiredAria")} />} label={Locale.label("forms.formQuestionEdit.ansReq")} />
        )} />
      )}
    </FormCard>
  );
}
