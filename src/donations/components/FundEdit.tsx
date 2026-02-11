import React, { useState } from "react";
import { ApiHelper, InputBox, ErrorMessages, Locale } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import { Checkbox, FormControlLabel, TextField, Typography } from "@mui/material";

interface Props {
  fund: FundInterface;
  updatedFunction: () => void;
}
export const FundEdit: React.FC<Props> = (props) => {
  const [fund, setFund] = useState<FundInterface>({ id: "", name: "", taxDeductible: true });
  const [errors, setErrors] = useState<string[]>([]);

  const handleCancel = () => props.updatedFunction();
  const handleSave = () => {
    const errors: string[] = [];

    if (!fund.name.trim()) errors.push(Locale.label("donations.fundEdit.errBlank"));

    if (errors.length > 0) {
      setErrors(errors);
      setFund({ ...fund, name: "" });
      return;
    }

    setFund({ ...fund, name: fund.name.trim() });
    ApiHelper.post("/funds", [fund], "GivingApi").then(() => props.updatedFunction());
  };
  const handleDelete = () => {
    if (window.confirm(Locale.label("donations.fundEdit.confirmMsg"))) {
      ApiHelper.delete("/funds/" + fund.id, "GivingApi").then(() => props.updatedFunction());
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = { ...fund };
    switch (e.target.name) {
      case "fundName": f.name = e.target.value; break;
      case "taxDeductible": f.taxDeductible = e.target.checked; break;
      default: break;
    }
    setFund(f);
  };

  React.useEffect(() => {
    setFund(props.fund);
  }, [props.fund]);

  return (
    <InputBox
      id="fundsBox"
      headerIcon="volunteer_activism"
      headerText={Locale.label("common.edit")}
      cancelFunction={handleCancel}
      saveFunction={handleSave}
      deleteFunction={fund.id === "" ? undefined : handleDelete}
      help="b1Admin/giving">
      <ErrorMessages errors={errors} />
      <TextField
        fullWidth
        name="fundName"
        label={Locale.label("common.name")}
        value={fund.name}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={Locale.label("placeholders.fund.name")}
        data-testid="fund-name-input"
        aria-label="Fund name"
      />
      <FormControlLabel
        control={<Checkbox sx={{ marginLeft: "5px" }} checked={fund.taxDeductible} onChange={handleChange} name="taxDeductible" data-testid="tax-deductible-checkbox" aria-label="Tax deductible" />}
        label={Locale.label("donations.fundEdit.taxDeductible")}
      />
      <Typography sx={{ fontStyle: "italic", fontSize: "12px", marginLeft: "5px" }}>
        {fund.taxDeductible ? Locale.label("donations.fundEdit.trackDonations") : Locale.label("donations.fundEdit.trackNonDonations")}
      </Typography>
    </InputBox>
  );
};
