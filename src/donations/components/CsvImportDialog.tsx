import React from "react";
import { type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, CurrencyHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { Box, Button, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { UploadFile as UploadIcon } from "@mui/icons-material";
import { Sheet } from "../../components/ui";
import { parseCsv } from "../../helpers/parseCsv";

interface Props {
  open: boolean;
  batchId: string;
  batchDate: Date;
  funds: FundInterface[];
  currency: string;
  onClose: () => void;
  onImported: () => void;
}

interface Row {
  line: number;
  donor: string;
  person?: PersonInterface;
  fund?: FundInterface;
  donation: DonationInterface;
  error?: string;
}

const METHODS = ["Check", "Cash", "Card", "In-Kind"];
const COLUMNS: Record<string, string[]> = {
  date: ["date", "donationdate"],
  amount: ["amount", "total"],
  fund: ["fund", "fundname"],
  method: ["method", "type"],
  methodDetails: ["checknumber", "checknum", "check", "methoddetails", "details"],
  notes: ["notes", "note", "memo"],
  email: ["email", "emailaddress"],
  name: ["name", "donor", "fullname", "donorname"],
  first: ["firstname", "first"],
  last: ["lastname", "last"]
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
const normName = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
// "Smith, John" → "John Smith"
const flipName = (s: string) => s.includes(",") ? s.split(",").map((p) => p.trim()).reverse().join(" ") : s;

const parseDate = (raw: string, fallback: Date) => {
  if (!raw) return DateHelper.formatHtml5Date(fallback);
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : DateHelper.formatHtml5Date(d);
};

const findPerson = async (email: string, name: string): Promise<PersonInterface | undefined> => {
  if (email) {
    const byEmail: PersonInterface[] = await ApiHelper.post("/people/search", { email }, "MembershipApi").catch(() => []);
    if (byEmail?.length === 1) return byEmail[0];
  }
  if (!name) return undefined;
  const target = normName(name);
  const byName: PersonInterface[] = await ApiHelper.post("/people/search", { term: name }, "MembershipApi").catch(() => []);
  const exact = (byName || []).filter((p) => normName(p.name?.display || "") === target || normName((p.name?.first || "") + " " + (p.name?.last || "")) === target);
  return exact.length === 1 ? exact[0] : undefined;
};

export const CsvImportDialog: React.FC<Props> = ({ open, batchId, batchDate, funds, currency, onClose, onImported }) => {
  const [rows, setRows] = React.useState<Row[] | null>(null);
  const [fileError, setFileError] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => { if (open) { setRows(null); setFileError(""); } }, [open]);

  const handleFile = async (file: File) => {
    setFileError("");
    setRows(null);
    const [header, ...data] = parseCsv(await file.text());
    const cols = (header || []).map(norm);
    const idx: Record<string, number> = {};
    Object.entries(COLUMNS).forEach(([key, names]) => { idx[key] = cols.findIndex((c) => names.includes(c)); });
    if (idx.amount < 0 || !data.length) { setFileError(Locale.label("donations.csvImport.noAmount", "The file needs a header row with an Amount column and at least one donation.")); return; }

    setLoading(true);
    const cell = (r: string[], key: string) => (idx[key] >= 0 ? r[idx[key]] || "" : "").trim();
    // ponytail: one or two /people/search calls per unique donor, all in flight at once — fine for weekly batches; add a server-side match endpoint if files run to thousands of donors.
    const lookups = new Map<string, Promise<PersonInterface | undefined>>();
    const parsed = data.map((r, i) => {
      const email = cell(r, "email").toLowerCase();
      const name = flipName(cell(r, "name")) || [cell(r, "first"), cell(r, "last")].filter(Boolean).join(" ");
      const key = email + "|" + normName(name);
      if ((email || name) && !lookups.has(key)) lookups.set(key, findPerson(email, name));
      return { r, line: i + 2, email, name, key };
    });

    const result: Row[] = [];
    for (const { r, line, email, name, key } of parsed) {
      const person = (email || name) ? await lookups.get(key) : undefined;
      const amount = parseFloat(cell(r, "amount").replace(/[^0-9.-]/g, ""));
      const fundName = cell(r, "fund");
      const fund = fundName ? funds.find((f) => normName(f.name || "") === normName(fundName)) : funds[0];
      const methodRaw = cell(r, "method");
      const method = methodRaw ? METHODS.find((m) => norm(m) === norm(methodRaw)) : "Check";
      const date = parseDate(cell(r, "date"), batchDate);
      const unmatchedNote = (email || name) && !person ? Locale.label("donations.csvImport.importedAs", "Imported as: {name}").replace("{name}", name || email) : "";
      const notes = [cell(r, "notes"), unmatchedNote].filter(Boolean).join(" — ");

      let error = "";
      if (!(amount > 0)) error = Locale.label("donations.csvImport.badAmount", "Invalid amount");
      else if (!fund) error = Locale.label("donations.csvImport.badFund", "Unknown fund: {fund}").replace("{fund}", fundName);
      else if (!method) error = Locale.label("donations.csvImport.badMethod", "Unknown method: {method}").replace("{method}", methodRaw);
      else if (!date) error = Locale.label("donations.csvImport.badDate", "Invalid date");

      result.push({
        line,
        donor: name || email,
        person,
        fund,
        error,
        donation: { batchId, personId: person?.id || "", amount, donationDate: date || undefined, method, methodDetails: cell(r, "methodDetails") || undefined, notes: notes || undefined }
      });
    }
    setRows(result);
    setLoading(false);
  };

  const valid = (rows || []).filter((r) => !r.error);

  // Same write path as BulkDonationEntry, batched: /donations, then /funddonations, rolling back the donations if the fund rows fail.
  const handleImport = async () => {
    const saved: DonationInterface[] = await ApiHelper.post("/donations", valid.map((r) => r.donation), "GivingApi");
    const fundDonations: FundDonationInterface[] = valid.map((r, i) => ({ donationId: saved[i].id, fundId: r.fund!.id, amount: r.donation.amount }));
    try {
      await ApiHelper.post("/funddonations", fundDonations, "GivingApi");
    } catch (e) {
      await Promise.all(saved.map((d) => ApiHelper.delete("/donations/" + d.id, "GivingApi").catch(() => {})));
      throw e;
    }
    onImported();
  };

  const statusFor = (r: Row) => {
    if (r.error) return <Typography variant="body2" color="error">{r.error}</Typography>;
    if (r.person) return <Typography variant="body2">{r.person.name?.display}</Typography>;
    if (r.donor) return <Typography variant="body2" color="warning.main">{Locale.label("donations.csvImport.notFound", "Not found — anonymous")}</Typography>;
    return <Typography variant="body2" color="text.secondary">{Locale.label("donations.donationEdit.anon")}</Typography>;
  };

  return (
    <Sheet
      open={open}
      title={Locale.label("donations.csvImport.title", "Import Donations from CSV")}
      onClose={onClose}
      onSubmit={handleImport}
      saveDisabled={!valid.length || loading}
      saveLabel={Locale.label("donations.csvImport.importCount", "Import {count}").replace("{count}", valid.length.toString())}
      error={fileError}
      maxWidth="md"
      data-testid="csv-import-form"
      saveTestId="csv-import-save">
      <Typography variant="body2" color="text.secondary">
        {Locale.label("donations.csvImport.help", "Columns: Amount (required), Date, Fund, Method (Check, Cash, Card, In-Kind), Check Number, Notes, and Email or Name (or First Name + Last Name) to match the donor. Blank date uses the batch date; blank fund uses the first fund. Unmatched donors are imported as anonymous with their name in the notes.")}
      </Typography>
      <Box>
        <Button component="label" variant="outlined" startIcon={<UploadIcon />} disabled={loading} data-testid="csv-import-file">
          {loading ? Locale.label("common.loading", "Loading...") : Locale.label("donations.csvImport.chooseFile", "Choose CSV File")}
          <input hidden type="file" accept=".csv,text/csv" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) handleFile(f); }} />
        </Button>
      </Box>
      {rows && (
        <Box sx={{ maxHeight: 360, overflow: "auto" }}>
          <Table size="small" stickyHeader data-testid="csv-import-preview">
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("donations.csvImport.row", "Row")}</TableCell>
                <TableCell>{Locale.label("donations.csvImport.donor", "Donor in file")}</TableCell>
                <TableCell>{Locale.label("donations.csvImport.match", "Match")}</TableCell>
                <TableCell>{Locale.label("donations.donationEdit.fund")}</TableCell>
                <TableCell align="right">{Locale.label("common.amount")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.line}>
                  <TableCell>{r.line}</TableCell>
                  <TableCell>{r.donor}</TableCell>
                  <TableCell>{statusFor(r)}</TableCell>
                  <TableCell>{r.fund?.name}</TableCell>
                  <TableCell align="right">{r.error ? "" : CurrencyHelper.formatCurrencyWithLocale(r.donation.amount || 0, currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Sheet>
  );
};
