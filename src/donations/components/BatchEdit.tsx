import React, { memo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { ApiHelper, DateHelper, UniqueIdHelper, Locale } from "@churchapps/apphelper";
import { type DonationBatchInterface } from "@churchapps/helpers";
import { TextField } from "@mui/material";
import { FormCard } from "../../components/ui";

interface Props {
  batchId: string;
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

export const BatchEdit = memo((props: Props) => {
  const { register, handleSubmit, reset } = useForm<AnyRecord>({ defaultValues: { name: "", date: DateHelper.formatHtml5Date(new Date()) } });

  const handleCancel = useCallback(() => { props.updatedFunction(); }, [props.updatedFunction]);

  const handleDelete = useCallback(() => {
    if (window.confirm(Locale.label("donations.batchEdit.confirmMsg"))) {
      ApiHelper.get("/donationbatches/" + props.batchId, "GivingApi").then((data: DonationBatchInterface) => {
        ApiHelper.delete("/donationbatches/" + data.id, "GivingApi").then(() => props.updatedFunction());
      });
    }
  }, [props.batchId, props.updatedFunction]);

  const getDeleteFunction = useCallback(() => (!UniqueIdHelper.isMissing(props.batchId) ? handleDelete : undefined), [props.batchId, handleDelete]);

  const onValid = useCallback((values: AnyRecord) => {
    const batchToSave: DonationBatchInterface = { name: values.name, batchDate: values.date ? DateHelper.formatHtml5Date(values.date) : null };
    if (!UniqueIdHelper.isMissing(props.batchId)) batchToSave.id = props.batchId;
    return ApiHelper.post("/donationbatches", [batchToSave], "GivingApi").then(() => props.updatedFunction());
  }, [props.batchId, props.updatedFunction]);

  const loadData = useCallback(() => {
    if (UniqueIdHelper.isMissing(props.batchId)) {
      reset({ name: "", date: DateHelper.formatHtml5Date(new Date()) });
    } else {
      ApiHelper.get("/donationbatches/" + props.batchId, "GivingApi").then((data: DonationBatchInterface) => {
        reset({ name: data.name, date: data.batchDate ? DateHelper.formatHtml5Date(data.batchDate) : "" });
      });
    }
  }, [props.batchId, reset]);

  React.useEffect(loadData, [loadData]);

  return (
    <FormCard
      id="batchBox"
      icon="volunteer_activism"
      title={Locale.label("common.edit")}
      onCancel={handleCancel}
      onDelete={getDeleteFunction()}
      onSave={handleSubmit(onValid)}
      help="docs/b1-admin/donations/recording-donations">
      <TextField fullWidth data-cy="batch-name" label={Locale.label("donations.batchEdit.opName")} placeholder={Locale.label("placeholders.batch.name")} {...register("name")} name="name" />
      <TextField fullWidth type="date" data-cy="batch-date" InputLabelProps={{ shrink: true }} label={Locale.label("donations.batchEdit.date")} {...register("date")} name="date" />
    </FormCard>
  );
});
