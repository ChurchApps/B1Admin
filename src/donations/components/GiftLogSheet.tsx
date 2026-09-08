import React from "react";
import { Box } from "@mui/material";
import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { type DonationBatchInterface, type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { overlaySx, sheetSx, mutedSx, verbSx, MOBILE } from "./plate";

interface Props {
  person?: PersonInterface | null;
  funds: FundInterface[];
  onClose: () => void;
  onSaved: () => void;
}

export const GiftLogSheet: React.FC<Props> = ({ person, funds, onClose, onSaved }) => {
  const [date, setDate] = React.useState(DateHelper.formatHtml5Date(new Date()) || "");
  const [amount, setAmount] = React.useState("");
  const [fundId, setFundId] = React.useState(funds[0]?.id || "");
  const [method, setMethod] = React.useState("Check");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!fundId && funds[0]?.id) setFundId(funds[0].id);
  }, [funds, fundId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (!date || !parsed || parsed <= 0) {
      setError(Locale.label("donations.pledgeEdit.errAmount") || "Enter an amount.");
      return;
    }
    if (!fundId) {
      setError(Locale.label("donations.donations.errMsg"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const batches: DonationBatchInterface[] = await ApiHelper.get("/donationbatches", "GivingApi");
      let batch = (batches || []).find((b) => (b.batchDate || "").toString().split("T")[0] === date);
      if (!batch) {
        const created: DonationBatchInterface[] = await ApiHelper.post("/donationbatches", [{ name: DateHelper.prettyDate(new Date(date + "T00:00:00")), batchDate: date }], "GivingApi");
        batch = created[0];
      }
      const donation: DonationInterface = {
        batchId: batch?.id,
        personId: person?.id || "",
        amount: parsed,
        donationDate: date,
        method,
        notes: note || undefined
      };
      const saved: DonationInterface[] = await ApiHelper.post("/donations", [donation], "GivingApi");
      const fundDonation: FundDonationInterface = { donationId: saved[0].id, fundId, amount: parsed };
      await ApiHelper.post("/funddonations", [fundDonation], "GivingApi");
      onSaved();
    } catch (err: any) {
      setError(err?.message || Locale.label("donations.donationEdit.refundFailed"));
    }
    setSaving(false);
  };

  return (
    <Box sx={overlaySx} role="dialog" aria-modal="true" aria-label="Log a gift" onClick={onClose}>
      <Box component="form" sx={sheetSx} onClick={(e) => e.stopPropagation()} onSubmit={handleSave} id="logForm">
        <h2>Log a gift</h2>
        <Box sx={{ ...mutedSx, mb: 2.5 } as object}>{person?.name?.display || Locale.label("donations.donationEdit.anon")}</Box>
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, [`@media (max-width: ${MOBILE}px)`]: { gridTemplateColumns: "1fr" } }}>
          <div>
            <label htmlFor="gdate">{Locale.label("donations.donationEdit.date")}</label>
            <input id="gdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="gamt">{Locale.label("donation.page.amount")}</label>
            <input id="gamt" type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
        </Box>
        <label htmlFor="gfund">{Locale.label("donation.page.fund")}</label>
        <select id="gfund" value={fundId} onChange={(e) => setFundId(e.target.value)}>
          {funds.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <label htmlFor="gmethod">{Locale.label("donations.donationEdit.method")}</label>
        <select id="gmethod" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="Check">{Locale.label("donations.donationEdit.check")}</option>
          <option value="Cash">{Locale.label("donations.donationEdit.cash")}</option>
          <option value="Card">{Locale.label("donations.donationEdit.card")}</option>
        </select>
        <label htmlFor="gnote">{Locale.label("common.notes")}</label>
        <input id="gnote" type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder={Locale.label("placeholders.donation.notes") || "Optional"} />
        {error && <Box sx={{ color: "warning.main", fontSize: "0.88rem", mt: 1.5 }}>{error}</Box>}
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "center", mt: 3 }}>
          <Box
            component="button"
            type="submit"
            disabled={saving}
            sx={{
              background: "var(--c1)",
              color: "#fff",
              border: 0,
              font: "inherit",
              fontWeight: 700,
              py: "10px",
              px: "18px",
              borderRadius: "999px",
              cursor: "pointer"
            }}>
            {Locale.label("common.save") || "Save"}
          </Box>
          <Box component="button" type="button" onClick={onClose} sx={{ ...verbSx, fontWeight: 400, color: "var(--text-muted)" } as object}>
            {Locale.label("common.cancel") || "Cancel"}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
