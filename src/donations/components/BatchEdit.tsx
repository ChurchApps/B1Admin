import React, { memo, useCallback } from "react";
import { ApiHelper, InputBox, DateHelper, UniqueIdHelper, Locale } from "@churchapps/apphelper";
import { type DonationBatchInterface } from "@churchapps/helpers";
import { TextField } from "@mui/material";

interface Props {
  batchId: string;
  updatedFunction: () => void;
}

export const BatchEdit = memo((props: Props) => {
  const [batch, setBatch] = React.useState<DonationBatchInterface>({ batchDate: DateHelper.formatHtml5Date(new Date()), name: "" });

  const handleCancel = useCallback(() => {
    props.updatedFunction();
  }, [props.updatedFunction]);

  const handleSave = useCallback(() => {
    const batchToSave = {
      ...batch,
      batchDate: batch.batchDate ? DateHelper.formatHtml5Date(batch.batchDate) : null,
    };
    
    if (batch.id) batchToSave.id = batch.id;
    return ApiHelper.post("/donationbatches", [batchToSave], "GivingApi").then(() => props.updatedFunction());
  }, [batch, props.updatedFunction]);

  const handleDelete = useCallback(() => {
    if (window.confirm(Locale.label("donations.batchEdit.confirmMsg"))) {
      ApiHelper.delete("/donationbatches/" + batch.id, "GivingApi").then(() => props.updatedFunction());
    }
  }, [batch.id, props.updatedFunction]);

  const getDeleteFunction = useCallback(() => (!UniqueIdHelper.isMissing(props.batchId) ? handleDelete : undefined), [props.batchId, handleDelete]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<any>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSave();
      }
    },
    [handleSave]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const b = { ...batch } as DonationBatchInterface;
      switch (e.currentTarget.name) {
        case "name":
          b.name = e.currentTarget.value;
          break;
        case "date":
          b.batchDate = e.currentTarget.value || null;  // Keep as YYYY-MM-DD string
          break;
      }
      setBatch(b);
    },
    [batch]
  );

  const loadData = useCallback(() => {
    if (UniqueIdHelper.isMissing(props.batchId)) setBatch({ batchDate: DateHelper.formatHtml5Date(new Date()), name: "" });
    else {
      ApiHelper.get("/donationbatches/" + props.batchId, "GivingApi").then((data) => {
        // batchDate is now a YYYY-MM-DD string - normalize with formatHtml5Date
        if (data.batchDate) data.batchDate = DateHelper.formatHtml5Date(data.batchDate);
        setBatch(data);
      });
    }
  }, [props.batchId]);

  React.useEffect(loadData, [loadData]);

  return (
    <InputBox
      id="batchBox"
      headerIcon="volunteer_activism"
      headerText={Locale.label("common.edit")}
      cancelFunction={handleCancel}
      deleteFunction={getDeleteFunction()}
      saveFunction={handleSave}
      help="b1Admin/manual-input">
      <TextField fullWidth name="name" data-cy="batch-name" label={Locale.label("donations.batchEdit.opName")} value={batch.name} onChange={handleChange} onKeyDown={handleKeyDown} placeholder={Locale.label("placeholders.batch.name")} />
      <TextField
        fullWidth
        type="date"
        data-cy="batch-date"
        name="date"
        InputLabelProps={{ shrink: true }}
        label={Locale.label("donations.batchEdit.date")}
        value={DateHelper.formatHtml5Date(batch.batchDate)}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
    </InputBox>
  );
});
