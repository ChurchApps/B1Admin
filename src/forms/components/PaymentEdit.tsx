import React from "react";
import { FormControl, InputAdornment, InputLabel, MenuItem, Select, TextField, type SelectChangeEvent } from "@mui/material";
import { CurrencyHelper, type QuestionInterface } from "@churchapps/helpers";
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
  const [currency, setCurrency] = React.useState<string>("usd");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    e.preventDefault();
    switch (e.target.name) {
      case "fundId": setFundId(e.target.value); break;
      case "amount": setAmount(Number(e.target.value)); break;
    }
    const newFundId = e.target.name === "fundId" ? e.target.value : fundId;
    const newAmount = e.target.name === "amount" ? e.target.value.toString() : String(amount);
    props.updatedFunction({ ...props.question, choices: [{ value: newFundId, text: "FundId" }, { value: newAmount, text: "Amount" }] });
  };

  React.useEffect(() => {
    ApiHelper.get("/funds", "GivingApi").then((data: any) => {
      setFunds(data);
      if (fundId === "" && data.length > 0) {
        setFundId(data[0].id);
        props.updatedFunction({ ...props.question, choices: [{ value: data[0].id, text: "FundId" }, { value: String(amount), text: "Amount" }] });
      }
    });
  }, []);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

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
        slotProps={{ input: { startAdornment: <InputAdornment position="start">{CurrencyHelper.getCurrencySymbol(currency)}</InputAdornment> } }}
      />
    </>
  );
};
