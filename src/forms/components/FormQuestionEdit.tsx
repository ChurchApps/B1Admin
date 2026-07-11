import { Checkbox, FormControl, FormControlLabel, Grid, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import React from "react";
import { useForm, Controller, useFormState } from "react-hook-form";
import { ChoicesEdit } from ".";
import { type QuestionInterface } from "@churchapps/helpers";
import { useMountedState, ApiHelper, UniqueIdHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { useConfirmDelete, useErrorSummary } from "../../hooks";
import { PaymentEdit } from "./PaymentEdit";

interface Props {
  questionId: string;
  formId: string;
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

export function FormQuestionEdit(props: Props) {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const isMounted = useMountedState();

  const { control, register, handleSubmit, reset, watch } = useForm<AnyRecord>({ defaultValues: { title: "", fieldType: "Textbox", placeholder: "", required: false, description: "", choices: null } });

  const { errors } = useFormState({ control });
  const e = errors as any;
  const summaryErrors = useErrorSummary(errors, ["title", "fieldType"]);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const fieldType = watch("fieldType");
  const watchedQuestion = watch() as QuestionInterface;

  function loadData() {
    if (!isMounted()) return;
    if (props.questionId) {
      ApiHelper.get("/questions/" + props.questionId + "?formId=" + props.formId, "MembershipApi").then((data: QuestionInterface) => reset(data));
    } else {
      reset({ formId: props.formId, fieldType: "Textbox", title: "", placeholder: "", required: false, description: "", choices: null });
    }
  }

  const getChoices = (ft: string) => {
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

  const onValid = (values: AnyRecord) => {
    setIsSubmitting(true);
    ApiHelper.post("/questions/", [values], "MembershipApi")
      .then(() => props.updatedFunction())
      .finally(() => { setIsSubmitting(false); });
  };

  async function handleDelete() {
    if (await confirm(Locale.label("forms.formQuestionEdit.confirmMsg"))) {
      ApiHelper.delete("/questions/" + watchedQuestion.id + "/?formId=" + props.formId, "MembershipApi").then(props.updatedFunction);
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
      {fieldType !== "Payment" && (
        <Controller name="required" control={control} render={({ field }) => (
          <FormControlLabel control={<Checkbox checked={!!field.value} onChange={(ev) => field.onChange(ev.target.checked)} data-testid="question-required-checkbox" aria-label={Locale.label("forms.formQuestionEdit.questionRequiredAria")} />} label={Locale.label("forms.formQuestionEdit.ansReq")} />
        )} />
      )}
    </FormCard>
  );
}
