import React from "react";
import { useForm, Controller } from "react-hook-form";
import { Alert, Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { type CampaignInterface } from "../../helpers";
import { FormCard } from "../../components/ui";

interface Props {
  campaign: CampaignInterface;
  funds: FundInterface[];
  updatedFunction: () => void;
}

export const CampaignEdit: React.FC<Props> = (props) => {
  const { control, register, handleSubmit, reset, formState } = useForm<Record<string, any>>({ defaultValues: { name: "", fundId: "", goalAmount: "", startDate: "", endDate: "", description: "", showPublic: false, allowSelfPledge: false } });
  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.name?.message) summaryErrors.push(e.name.message);
  if (e.fundId?.message) summaryErrors.push(e.fundId.message);
  if (e.startDate?.message) summaryErrors.push(e.startDate.message);

  React.useEffect(() => {
    reset({
      name: props.campaign?.name ?? "",
      fundId: props.campaign?.fundId ?? "",
      goalAmount: props.campaign?.goalAmount ?? "",
      startDate: props.campaign?.startDate?.toString().split("T")[0] ?? "",
      endDate: props.campaign?.endDate?.toString().split("T")[0] ?? "",
      description: props.campaign?.description ?? "",
      showPublic: props.campaign?.showPublic ?? false,
      allowSelfPledge: props.campaign?.allowSelfPledge ?? false
    });
  }, [props.campaign, reset]);

  const onValid = (values: Record<string, any>) => {
    const campaign: CampaignInterface = {
      ...props.campaign,
      name: values.name.trim(),
      fundId: values.fundId,
      goalAmount: values.goalAmount === "" ? null : parseFloat(values.goalAmount),
      startDate: values.startDate,
      endDate: values.endDate === "" ? null : values.endDate,
      description: values.description,
      showPublic: values.showPublic,
      allowSelfPledge: values.allowSelfPledge
    };
    ApiHelper.post("/campaigns", [campaign], "GivingApi").then(() => props.updatedFunction());
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("donations.campaignEdit.confirmMsg"))) {
      ApiHelper.delete("/campaigns/" + props.campaign.id, "GivingApi").then(() => props.updatedFunction());
    }
  };

  return (
    <FormCard
      id="campaignBox"
      icon="flag"
      title={props.campaign?.id ? Locale.label("common.edit") : Locale.label("donations.campaignsPage.addCampaign")}
      onCancel={props.updatedFunction}
      onSave={handleSubmit(onValid)}
      onDelete={props.campaign?.id ? handleDelete : undefined}
      help="docs/b1-admin/donations/">
      {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
      <TextField fullWidth label={Locale.label("common.name")} data-testid="campaign-name-input" error={!!e.name} helperText={e.name?.message} {...register("name", { required: Locale.label("donations.campaignEdit.errBlank") })} />
      <FormControl fullWidth error={!!e.fundId}>
        <InputLabel id="campaign-fund-label">{Locale.label("donations.campaignEdit.fund")}</InputLabel>
        <Controller
          name="fundId"
          control={control}
          rules={{ required: Locale.label("donations.campaignEdit.errFund") }}
          render={({ field }) => (
            <Select {...field} labelId="campaign-fund-label" label={Locale.label("donations.campaignEdit.fund")} data-testid="campaign-fund-select">
              {props.funds.map((f) => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
            </Select>
          )}
        />
      </FormControl>
      <TextField fullWidth type="number" inputProps={{ step: "0.01", min: "0" }} label={Locale.label("donations.campaignEdit.goalAmount")} data-testid="campaign-goal-input" {...register("goalAmount")} />
      <TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label={Locale.label("donations.campaignEdit.startDate")} data-testid="campaign-start-date" error={!!e.startDate} helperText={e.startDate?.message} {...register("startDate", { required: Locale.label("donations.campaignEdit.errStartDate") })} />
      <TextField fullWidth type="date" InputLabelProps={{ shrink: true }} label={Locale.label("donations.campaignEdit.endDate")} data-testid="campaign-end-date" {...register("endDate")} />
      <TextField fullWidth multiline rows={3} label={Locale.label("donations.campaignEdit.description")} data-testid="campaign-description-input" {...register("description")} />
      <FormControlLabel
        control={
          <Controller name="showPublic" control={control} render={({ field }) => (
            <Checkbox {...field} checked={!!field.value} data-testid="campaign-show-public-checkbox" name="showPublic" />
          )} />
        }
        label={Locale.label("donations.campaignEdit.showPublic")}
      />
      <FormControlLabel
        control={
          <Controller name="allowSelfPledge" control={control} render={({ field }) => (
            <Checkbox {...field} checked={!!field.value} data-testid="campaign-self-pledge-checkbox" name="allowSelfPledge" />
          )} />
        }
        label={Locale.label("donations.campaignEdit.allowSelfPledge")}
      />
    </FormCard>
  );
};
