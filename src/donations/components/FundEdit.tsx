import React from "react";
import { useForm, Controller } from "react-hook-form";
import { Alert, Checkbox, FormControlLabel, TextField, Typography } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { FormCard } from "../../components/ui";

interface Props {
  fund: FundInterface;
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

export const FundEdit: React.FC<Props> = (props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const { control, register, handleSubmit, reset, watch, formState } = useForm<AnyRecord>({ defaultValues: { fundName: "", taxDeductible: true, visible: true } });
  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.fundName?.message) summaryErrors.push(e.fundName.message);

  const taxDeductible = watch("taxDeductible");

  React.useEffect(() => {
    reset({ fundName: props.fund?.name ?? "", taxDeductible: props.fund?.taxDeductible ?? true, visible: props.fund?.visible ?? true });
  }, [props.fund, reset]);

  const onValid = (values: AnyRecord) => {
    const fund = { ...props.fund, name: values.fundName.trim(), taxDeductible: values.taxDeductible, visible: values.visible };
    ApiHelper.post("/funds", [fund], "GivingApi").then(() => props.updatedFunction());
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("donations.fundEdit.confirmMsg"))) {
      ApiHelper.delete("/funds/" + props.fund.id, "GivingApi").then(() => props.updatedFunction());
    }
  };

  return (
    <FormCard
      id="fundsBox"
      icon="volunteer_activism"
      title={Locale.label("common.edit")}
      onCancel={props.updatedFunction}
      onSave={handleSubmit(onValid)}
      onDelete={props.fund?.id === "" ? undefined : handleDelete}
      help="docs/b1-admin/donations/">
      {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
      <TextField fullWidth label={Locale.label("common.name")} placeholder={Locale.label("placeholders.fund.name")} data-testid="fund-name-input" aria-label={Locale.label("donations.fundEdit.ariaFundName")} error={!!e.fundName} helperText={e.fundName?.message} {...register("fundName", { required: Locale.label("donations.fundEdit.errBlank") })} />
      <FormControlLabel
        control={
          <Controller name="taxDeductible" control={control} render={({ field }) => (
            <Checkbox {...field} checked={!!field.value} sx={{ marginLeft: "5px" }} data-testid="tax-deductible-checkbox" aria-label={Locale.label("donations.fundEdit.ariaTaxDeductible")} name="taxDeductible" />
          )} />
        }
        label={Locale.label("donations.fundEdit.taxDeductible")}
      />
      <Typography sx={{ fontStyle: "italic", fontSize: "12px", marginLeft: "5px" }}>
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
  );
};
