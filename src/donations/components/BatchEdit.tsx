import React, { memo, useCallback } from "react";
import { useForm } from "react-hook-form";
import { ApiHelper, DateHelper, UniqueIdHelper, Locale } from "@churchapps/apphelper";
import { type DonationBatchInterface } from "@churchapps/helpers";
import { Grid, TextField } from "@mui/material";
import { FormCard } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";

interface Props {
  batch: DonationBatchInterface;
  updatedFunction: () => void;
}

type AnyRecord = Record<string, any>;

export const BatchEdit = memo((props: Props) => {
  "use no memo";
  const batchId = props.batch?.id || "";
  const { register, handleSubmit } = useForm<AnyRecord>({
    defaultValues: {
      name: props.batch?.name || "",
      date: props.batch?.batchDate ? DateHelper.formatHtml5Date(props.batch.batchDate) : DateHelper.formatHtml5Date(new Date())
    }
  });

  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const handleCancel = useCallback(() => { props.updatedFunction(); }, [props.updatedFunction]);

  const handleDelete = useCallback(async () => {
    if (await confirm(Locale.label("donations.batchEdit.confirmMsg"))) {
      ApiHelper.delete("/donationbatches/" + batchId, "GivingApi").then(() => props.updatedFunction());
    }
  }, [batchId, props.updatedFunction, confirm]);

  const getDeleteFunction = useCallback(() => (!UniqueIdHelper.isMissing(batchId) ? handleDelete : undefined), [batchId, handleDelete]);

  const onValid = useCallback((values: AnyRecord) => {
    const batchToSave: DonationBatchInterface = { name: values.name, batchDate: values.date ? DateHelper.formatHtml5Date(values.date) : undefined };
    if (!UniqueIdHelper.isMissing(batchId)) batchToSave.id = batchId;
    return ApiHelper.post("/donationbatches", [batchToSave], "GivingApi").then(() => props.updatedFunction());
  }, [batchId, props.updatedFunction]);

  return (
    <>
      {ConfirmDialogElement}
      <FormCard
        id="batchBox"
        icon="volunteer_activism"
        title={Locale.label("common.edit")}
        onCancel={handleCancel}
        onDelete={getDeleteFunction()}
        onSave={handleSubmit(onValid)}
        help="docs/b1-admin/donations/recording-donations">
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth data-cy="batch-name" label={Locale.label("donations.batchEdit.opName")} placeholder={Locale.label("placeholders.batch.name")} {...register("name")} name="name" />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth type="date" data-cy="batch-date" label={Locale.label("donations.batchEdit.date")} {...register("date")} name="date" />
          </Grid>
        </Grid>
      </FormCard>
    </>
  );
}, (prev, next) => prev.batch?.id === next.batch?.id && prev.batch?.name === next.batch?.name && prev.batch?.batchDate === next.batch?.batchDate && prev.updatedFunction === next.updatedFunction);
