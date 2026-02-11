import React from "react";
import { FormControl, InputAdornment, InputLabel, MenuItem, Select, TextField, type SelectChangeEvent } from "@mui/material";
import { type QuestionInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";

interface Props {
  question: QuestionInterface;
  updatedFunction: (question: QuestionInterface) => void;
}

export const PaymentEdit: React.FC<Props> = (props) => {
  const [funds, setFunds] = React.useState([]);
  const [fundId, setFundId] = React.useState(props.question.choices?.find((c: any) => c.text === "FundId")?.value || "");
  const [amount, setAmount] = React.useState(props.question.choices?.find((c: any) => c.text === "Amount")?.value || 0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    e.preventDefault();
    switch (e.target.name) {
      case "fundId": setFundId(e.target.value); break;
      case "amount": setAmount(Number(e.target.value)); break;
    }
    const q = { ...props.question };
    if (e.target.name === "fundId") {
      const fundIndex = q.choices.findIndex((c: any) => c.text === "FundId");
      q.choices[fundIndex].value = e.target.value;
    } else if (e.target.name === "amount") {
      const amountIndex = q.choices.findIndex((c: any) => c.text === "Amount");
      q.choices[amountIndex].value = e.target.value.toString();
    }
    props.updatedFunction(q);
  };

  React.useEffect(() => {
    ApiHelper.get("/funds", "GivingApi").then((data: any) => {
      setFunds(data);
      if (fundId === "" && data.length > 0) {
        setFundId(data[0].id);
        const q = { ...props.question };
        if (!q.choices) {
          q.choices = [{ value: data[0].id, text: "FundId" }];
          q.choices.push({ value: "0", text: "Amount" });
        }
        props.updatedFunction(q);
      }
    });
  }, [fundId, props.question, props.updatedFunction]);

  const getFundOptions = () =>
    funds.map((fund: FundInterface) => (
      <MenuItem key={fund.id} value={fund.id}>
        {fund.name}
      </MenuItem>
    ));

  return (
    <>
      <FormControl fullWidth>
        <InputLabel id="fund">{Locale.label("forms.formQuestionEdit.fund")}</InputLabel>
        <Select name="fundId" labelId="fund" label={Locale.label("forms.formQuestionEdit.fund")} value={fundId} onChange={handleChange}>
          {getFundOptions()}
        </Select>
      </FormControl>
      <TextField
        fullWidth
        name="amount"
        label={Locale.label("forms.formQuestionEdit.amt")}
        type="number"
        value={amount}
        onChange={handleChange}
        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
      />
    </>
  );
};
