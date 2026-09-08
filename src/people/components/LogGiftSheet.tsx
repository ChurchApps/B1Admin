import React from "react";
import { type DonationBatchInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";

interface Props {
  open: boolean;
  person: PersonInterface;
  householdName?: string;
  onClose: () => void;
  onSaved: () => void;
}

export const LogGiftSheet = (props: Props) => {
  const [funds, setFunds] = React.useState<FundInterface[]>([]);
  const [date, setDate] = React.useState(DateHelper.formatHtml5Date(new Date()));
  const [amount, setAmount] = React.useState("");
  const [fundId, setFundId] = React.useState("");
  const [method, setMethod] = React.useState("Check");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!props.open) return;
    ApiHelper.get("/funds", "GivingApi").then((data: FundInterface[]) => {
      setFunds(data || []);
      if (data?.[0]?.id) setFundId(data[0].id as string);
    }).catch(() => setFunds([]));
    setDate(DateHelper.formatHtml5Date(new Date()));
    setAmount("");
    setMethod("Check");
    setNote("");
  }, [props.open]);

  const resolveBatch = async () => {
    const today = DateHelper.formatHtml5Date(new Date());
    const batches: DonationBatchInterface[] = await ApiHelper.get("/donationbatches", "GivingApi").catch(() => []);
    const existing = (batches || []).find((b) => DateHelper.formatHtml5Date(b.batchDate) === today);
    if (existing?.id) return existing.id;
    const created: DonationBatchInterface[] = await ApiHelper.post("/donationbatches", [{ name: today, batchDate: today }], "GivingApi");
    return created[0]?.id;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return;
    setSaving(true);
    try {
      const batchId = await resolveBatch();
      const donation = {
        personId: props.person.id,
        batchId,
        amount: amt,
        donationDate: date,
        method,
        notes: note || undefined
      };
      const saved = await ApiHelper.post("/donations", [donation], "GivingApi");
      await ApiHelper.post("/funddonations", [{ donationId: saved[0].id, fundId, amount: amt }], "GivingApi");
      props.onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`overlay${props.open ? " open" : ""}`} role="dialog" aria-modal="true" aria-label="Log a gift" onClick={(e) => { if (e.target === e.currentTarget) props.onClose(); }}>
      <form className="sheet" onSubmit={handleSave}>
        <h2>Log a gift</h2>
        <p className="muted">{[props.householdName, props.person.name?.display].filter(Boolean).join(" · ")}</p>
        <div className="row2">
          <div>
            <label htmlFor="gdate">Date</label>
            <input id="gdate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="gamt">Amount</label>
            <input id="gamt" type="text" value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" required />
          </div>
        </div>
        <label htmlFor="gfund">Fund</label>
        <select id="gfund" value={fundId} onChange={(e) => setFundId(e.target.value)}>
          {funds.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <label htmlFor="gmethod">Method</label>
        <select id="gmethod" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="Check">Check</option>
          <option value="Cash">Cash</option>
          <option value="Online">Online</option>
        </select>
        <label htmlFor="gnote">Note</label>
        <input id="gnote" type="text" placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
        <div className="actions">
          <button className="save" type="submit" disabled={saving}>{Locale.label("common.save")}</button>
          <button className="cancel" type="button" onClick={props.onClose}>{Locale.label("common.cancel")}</button>
        </div>
      </form>
    </div>
  );
};
