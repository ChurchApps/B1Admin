import React from "react";
import { Checkbox, FormControl, FormControlLabel, InputAdornment, InputLabel, MenuItem, Select, TextField, type SelectChangeEvent } from "@mui/material";
import { CurrencyHelper } from "@churchapps/helpers";
import { type QuestionInterface } from "../../helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type FundInterface } from "@churchapps/helpers";
import type { WithId } from "../../helpers/Interfaces";

interface Props {
  question: QuestionInterface;
  updatedFunction: (question: QuestionInterface) => void;
}

export const PaymentEdit: React.FC<Props> = (props) => {
  const [funds, setFunds] = React.useState<FundInterface[]>([]);
  const [fundId, setFundId] = React.useState(props.question.choices?.find((c) => c.text === "FundId")?.value || "");
  const [amount, setAmount] = React.useState<string | number>(props.question.choices?.find((c) => c.text === "Amount")?.value || 0);
  const [customAmount, setCustomAmount] = React.useState(props.question.choices?.find((c) => c.text === "CustomAmount")?.value === "true");
  const [currency, setCurrency] = React.useState<string>("usd");

  // CustomAmount is only stored when on, so existing fixed-amount questions keep their two entries.
  const buildChoices = (newFundId: string, newAmount: string, newCustomAmount: boolean) => {
    const choices = [{ value: newFundId, text: "FundId" }, { value: newAmount, text: "Amount" }];
    if (newCustomAmount) choices.push({ value: "true", text: "CustomAmount" });
    return choices;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    e.preventDefault();
    switch (e.target.name) {
      case "fundId": setFundId(e.target.value); break;
      case "amount": setAmount(Number(e.target.value)); break;
    }
    const newFundId = e.target.name === "fundId" ? e.target.value : fundId;
    const newAmount = e.target.name === "amount" ? e.target.value.toString() : String(amount);
    props.updatedFunction({ ...props.question, choices: buildChoices(newFundId, newAmount, customAmount) });
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomAmount(e.target.checked);
    props.updatedFunction({ ...props.question, choices: buildChoices(fundId, String(amount), e.target.checked) });
  };

  React.useEffect(() => {
    ApiHelper.get("/funds", "GivingApi").then((data: WithId<FundInterface>[]) => {
      setFunds(data);
      if (fundId === "" && data.length > 0) {
        setFundId(data[0].id);
        props.updatedFunction({ ...props.question, choices: buildChoices(data[0].id, String(amount), customAmount) });
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
        label={Locale.label(customAmount ? "forms.formQuestionEdit.suggestedAmt" : "forms.formQuestionEdit.amt")}
        type="number"
        value={amount}
        onChange={handleChange}
        slotProps={{ input: { startAdornment: <InputAdornment position="start">{CurrencyHelper.getCurrencySymbol(currency)}</InputAdornment> } }}
      />
      <FormControlLabel
        control={<Checkbox name="customAmount" checked={customAmount} onChange={handleCustomAmountChange} data-testid="question-custom-amount-checkbox" />}
        label={Locale.label("forms.formQuestionEdit.customAmount")}
      />
    </>
  );
};
