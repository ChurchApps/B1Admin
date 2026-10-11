import React from "react";
import { type DonationBatchInterface, type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, CurrencyHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { FormControl, InputAdornment, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { Sheet } from "../../components/ui";

interface Props {
  open: boolean;
  person: PersonInterface;
  onClose: () => void;
  onSaved: () => void;
}

// Same write path as BulkDonationEntry: /donations, then /funddonations, rolling the donation back if the fund row fails.
export const LogGiftDialog: React.FC<Props> = ({ open, person, onClose, onSaved }) => {
  const [funds, setFunds] = React.useState<FundInterface[]>([]);
  const [currency, setCurrency] = React.useState("usd");
  const [date, setDate] = React.useState(DateHelper.formatHtml5Date(new Date()));
  const [amount, setAmount] = React.useState("");
  const [fundId, setFundId] = React.useState("");
  const [method, setMethod] = React.useState("Check");
  const [methodDetails, setMethodDetails] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [amountError, setAmountError] = React.useState("");
  const [saveError, setSaveError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setDate(DateHelper.formatHtml5Date(new Date()));
    setAmount("");
    setMethod("Check");
    setMethodDetails("");
    setNotes("");
    setAmountError("");
    setSaveError("");
    CurrencyHelper.loadCurrency().then(setCurrency).catch(() => setCurrency("usd"));
    ApiHelper.get("/funds", "GivingApi")
      .then((data: FundInterface[]) => {
        setFunds(data || []);
        setFundId((data || [])[0]?.id || "");
      })
      .catch(() => setFunds([]));
  }, [open]);

  const resolveBatch = async (): Promise<{ id?: string; created: boolean }> => {
    const batches: DonationBatchInterface[] = await ApiHelper.get("/donationbatches", "GivingApi").catch((): DonationBatchInterface[] => []);
    const existing = (batches || []).find((b) => b.batchDate && DateHelper.formatHtml5Date(DateHelper.toDate(b.batchDate)) === date);
    if (existing?.id) return { id: existing.id, created: false };
    const created: DonationBatchInterface[] = await ApiHelper.post("/donationbatches", [{ name: date, batchDate: date }], "GivingApi");
    return { id: created[0]?.id, created: true };
  };

  const handleSave = async () => {
    const amt = Number(amount.replace(/[^0-9.]/g, ""));
    if (!amt || amt <= 0) {
      setAmountError(Locale.label("donations.logGift.amountError", "Enter an amount greater than zero, such as 25.00."));
      return;
    }
    setAmountError("");
    setSaveError("");
    let batch: { id?: string; created: boolean } = { created: false };
    let donationId = "";
    try {
      batch = await resolveBatch();
      const donation: DonationInterface = { personId: person.id, batchId: batch.id, amount: amt, currency, donationDate: date, method, methodDetails: methodDetails || undefined, notes: notes || undefined };
      const saved: DonationInterface[] = await ApiHelper.post("/donations", [donation], "GivingApi");
      donationId = saved[0].id || "";
      const fundDonation: FundDonationInterface = { donationId, fundId, amount: amt, currency };
      await ApiHelper.post("/funddonations", [fundDonation], "GivingApi");
      onSaved();
    } catch {
      if (donationId) await ApiHelper.delete("/donations/" + donationId, "GivingApi").catch(() => { /* best effort */ });
      if (batch.created && batch.id) await ApiHelper.delete("/donationbatches/" + batch.id, "GivingApi").catch(() => { /* best effort */ });
      setSaveError(Locale.label("common.saveError"));
    }
  };

  const detailsLabel = method === "Check" ? Locale.label("donations.donationEdit.checkNum") : method === "Card" ? Locale.label("donations.donationEdit.lastDig") : "";
  const currencyCode = (currency || "usd").toUpperCase();

  return (
    <Sheet
      open={open}
      title={Locale.label("donations.logGift.title", "Log a gift")}
      onClose={onClose}
      onSubmit={handleSave}
      error={saveError}
      saveDisabled={!fundId}
      data-testid="log-gift-form"
      saveTestId="log-gift-save">
      <Typography variant="body2" color="text.secondary">{person.name?.display}</Typography>
      <TextField label={Locale.label("donations.donationEdit.date")} type="date" value={date} onChange={(e) => setDate(e.target.value)} required slotProps={{ inputLabel: { shrink: true } }} />
      <TextField
        label={Locale.label("donation.page.amount")}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
        autoFocus
        error={!!amountError}
        helperText={amountError || undefined}
        slotProps={{
          htmlInput: { inputMode: "decimal", "data-testid": "log-gift-amount" },
          input: { endAdornment: <InputAdornment position="end">{currencyCode}</InputAdornment> }
        }}
      />
      <FormControl fullWidth>
        <InputLabel id="log-gift-fund-label">{Locale.label("donations.donationEdit.fund")}</InputLabel>
        <Select labelId="log-gift-fund-label" label={Locale.label("donations.donationEdit.fund")} value={fundId} onChange={(e) => setFundId(e.target.value)}>
          {funds.map((f) => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel id="log-gift-method-label">{Locale.label("donations.donationEdit.method")}</InputLabel>
        <Select labelId="log-gift-method-label" label={Locale.label("donations.donationEdit.method")} value={method} onChange={(e) => setMethod(e.target.value)}>
          <MenuItem value="Check">{Locale.label("donations.donationEdit.check")}</MenuItem>
          <MenuItem value="Cash">{Locale.label("donations.donationEdit.cash")}</MenuItem>
          <MenuItem value="Card">{Locale.label("donations.donationEdit.card")}</MenuItem>
          <MenuItem value="In-Kind">{Locale.label("donations.donationEdit.inKind")}</MenuItem>
        </Select>
      </FormControl>
      {detailsLabel && <TextField label={detailsLabel} value={methodDetails} onChange={(e) => setMethodDetails(e.target.value)} />}
      <TextField
        label={Locale.label("donation.page.notes")}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        helperText={Locale.label("donations.logGift.batchHint", "Saved to the batch for this date; one is created if needed.")}
      />
    </Sheet>
  );
};
