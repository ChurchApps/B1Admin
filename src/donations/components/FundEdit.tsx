import React from "react";
import { useForm, Controller } from "react-hook-form";
import { Checkbox, FormControlLabel, TextField, Typography } from "@mui/material";
import { ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { FormCard } from "../../components/ui";
import { useErrorSummary, useConfirmDelete } from "../../hooks";

// Matches the Api's funds.description column.
const DESCRIPTION_MAX = 500;

interface Props {
  fund: FundInterface;
  updatedFunction: () => void;
}

interface FundFormValues {
  fundName: string;
  description: string;
  taxDeductible: boolean;
  visible: boolean;
}

export const FundEdit: React.FC<Props> = (props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const { control, register, handleSubmit, reset, watch, formState } = useForm<FundFormValues>({ defaultValues: { fundName: "", description: "", taxDeductible: true, visible: true } });
  const e = formState.errors;
  const summaryErrors = useErrorSummary(formState.errors, ["fundName", "description"]);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const taxDeductible = watch("taxDeductible");
  const description = watch("description") ?? "";

  React.useEffect(() => {
    reset({ fundName: props.fund?.name ?? "", description: props.fund?.description ?? "", taxDeductible: props.fund?.taxDeductible ?? true, visible: props.fund?.visible ?? true });
  }, [props.fund, reset]);

  const onValid = (values: FundFormValues) => {
    const fund: FundInterface = { ...props.fund, name: values.fundName.trim(), description: values.description.trim() || null, taxDeductible: values.taxDeductible, visible: values.visible };
    ApiHelper.post("/funds", [fund], "GivingApi").then(() => props.updatedFunction());
  };

  const handleDelete = async () => {
    if (await confirm(Locale.label("donations.fundEdit.confirmMsg"))) {
      ApiHelper.delete("/funds/" + props.fund.id, "GivingApi").then(() => props.updatedFunction());
    }
  };

  return (
    <>
      {ConfirmDialogElement}
      <FormCard
        id="fundsBox"
        icon="volunteer_activism"
        title={Locale.label("common.edit")}
        onCancel={props.updatedFunction}
        onSave={handleSubmit(onValid)}
        onDelete={props.fund?.id === "" ? undefined : handleDelete}
        help="docs/b1-admin/donations/">
        <ErrorMessages errors={summaryErrors} />
        <TextField fullWidth label={Locale.label("common.name")} placeholder={Locale.label("placeholders.fund.name")} data-testid="fund-name-input" aria-label={Locale.label("donations.fundEdit.ariaFundName")} error={!!e.fundName} helperText={e.fundName?.message} {...register("fundName", { required: Locale.label("donations.fundEdit.errBlank") })} />
        <TextField
          fullWidth
          multiline
          minRows={2}
          label={Locale.label("donations.fundEdit.description")}
          data-testid="fund-description-input"
          aria-label={Locale.label("donations.fundEdit.description")}
          inputProps={{ maxLength: DESCRIPTION_MAX }}
          error={!!e.description}
          helperText={e.description?.message || `${Locale.label("donations.fundEdit.descriptionHelp")} (${description.length}/${DESCRIPTION_MAX})`}
          {...register("description", { maxLength: { value: DESCRIPTION_MAX, message: Locale.label("donations.fundEdit.errDescriptionLength") } })} />
        <FormControlLabel
          control={
            <Controller name="taxDeductible" control={control} render={({ field }) => (
              <Checkbox {...field} checked={!!field.value} sx={{ marginLeft: "5px" }} data-testid="tax-deductible-checkbox" aria-label={Locale.label("donations.fundEdit.ariaTaxDeductible")} name="taxDeductible" />
            )} />
          }
          label={Locale.label("donations.fundEdit.taxDeductible")}
        />
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", ml: 0.5 }}>
          {taxDeductible ? Locale.label("donations.fundEdit.trackDonations") : Locale.label("donations.fundEdit.trackNonDonations")}
        </Typography>
        <FormControlLabel
          control={
            <Controller name="visible" control={control} render={({ field }) => (
              <Checkbox {...field} checked={!!field.value} sx={{ marginLeft: "5px" }} data-testid="fund-visible-checkbox" aria-label={Locale.label("donations.fundEdit.ariaVisible")} name="visible" />
            )} />
          }
          label={Locale.label("donations.fundEdit.visible")}
        />
      </FormCard>
    </>
  );
};
