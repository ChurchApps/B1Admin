import { ApiHelper, ArrayHelper, CurrencyHelper, DateHelper, Locale, Permissions, SmallButton } from "@churchapps/apphelper";
import { type DonationBatchInterface, type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import UserContext from "../UserContext";
import { Box, CircularProgress, TextField, Typography } from "@mui/material";
import { BatchPrintDocument } from "./components/BatchPrintDocument";
import { useRequirePermission } from "../hooks";

const defaultStart = () => {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return DateHelper.formatHtml5Date(d);
};

// Prints every batch dated within [start, end] (inclusive), one batch per page.
export const PrintAllBatchesPage = () => {
  const denied = useRequirePermission(Permissions.givingApi.donations.view);
  const [searchParams] = useSearchParams();
  const [start, setStart] = useState(searchParams.get("start") || defaultStart());
  const [end, setEnd] = useState(searchParams.get("end") || DateHelper.formatHtml5Date(new Date()));
  const context = useContext(UserContext);
  const [currency, setCurrency] = useState<string>("usd");

  const batches = useQuery<DonationBatchInterface[]>({ queryKey: ["/donationbatches", "GivingApi"], placeholderData: [] });
  const funds = useQuery<FundInterface[]>({ queryKey: ["/funds", "GivingApi"], placeholderData: [] });
  const fundDonations = useQuery<FundDonationInterface[]>({ queryKey: ["/fundDonations", "GivingApi"], placeholderData: [] });
  const rates = useQuery<Record<string, number>>({
    queryKey: ["batchPrintRates"],
    queryFn: async () => (await ApiHelper.get("/donations/exchange-rates", "GivingApi").catch((): null => null))?.rates || {},
    placeholderData: {}
  });

  const batchesInRange = useMemo(() => (batches.data || [])
    .filter((b) => {
      const date = b.batchDate ? b.batchDate.toString().split("T")[0] : "";
      return date && date >= start && date <= end;
    })
    .sort((a, b) => (a.batchDate || "").toString().localeCompare((b.batchDate || "").toString())), [batches.data, start, end]);

  const batchIds = useMemo(() => batchesInRange.map((b) => b.id || ""), [batchesInRange]);

  const donationsByBatch = useQuery<Record<string, DonationInterface[]>>({
    queryKey: ["batchPrintDonations", batchIds],
    queryFn: async () => {
      const results: DonationInterface[][] = await Promise.all(batchIds.map((id) => ApiHelper.get("/donations?batchId=" + id, "GivingApi")));
      const all = results.flat();
      const personIds = ArrayHelper.getIds(all, "personId");
      const chunks: string[][] = [];
      for (let i = 0; i < personIds.length; i += 200) chunks.push(personIds.slice(i, i + 200));
      const people: PersonInterface[] = (await Promise.all(chunks.map((ids) => ApiHelper.get("/people/ids?ids=" + ids.join(","), "MembershipApi")))).flat();
      all.forEach((d) => { if (d.personId) d.person = ArrayHelper.getOne(people, "id", d.personId); });
      const result: Record<string, DonationInterface[]> = {};
      batchIds.forEach((id, i) => { result[id] = results[i] || []; });
      return result;
    },
    enabled: !batches.isPlaceholderData
  });

  const isLoading = batches.isPlaceholderData || funds.isPlaceholderData || fundDonations.isPlaceholderData || rates.isPlaceholderData || !donationsByBatch.data;
  const printable = batchesInRange.filter((b) => (donationsByBatch.data?.[b.id || ""] || []).length > 0);

  const autoprint = searchParams.get("autoprint") === "1";
  const hasPrinted = useRef(false);

  useEffect(() => {
    if (autoprint && !isLoading && printable.length > 0 && !hasPrinted.current) {
      hasPrinted.current = true;
      window.print();
    }
  }, [autoprint, isLoading, printable.length]);

  useEffect(() => {
    const handleAfterPrint = () => { if (autoprint) window.history.back(); };
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, [autoprint]);

  useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => setCurrency(result));
  }, []);

  if (denied) return denied;

  return (
    <>
      <style>{"@media print { .print-toolbar { display: none !important; } }"}</style>
      <Box className="print-toolbar" sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, p: 2 }}>
        <Typography variant="h6" sx={{ mr: 2 }}>{Locale.label("donations.printAllBatches.title")}</Typography>
        <TextField type="date" size="small" label={Locale.label("donations.printAllBatches.startDate")} value={start} onChange={(e) => { if (e.target.value) setStart(e.target.value); }} InputLabelProps={{ shrink: true }} data-testid="print-batches-start" />
        <TextField type="date" size="small" label={Locale.label("donations.printAllBatches.endDate")} value={end} onChange={(e) => { if (e.target.value) setEnd(e.target.value); }} InputLabelProps={{ shrink: true }} data-testid="print-batches-end" />
        <Box sx={{ flexGrow: 1 }} />
        <SmallButton icon="print" ariaLabel={Locale.label("common.print")} text={Locale.label("common.print")} onClick={() => window.print()} />
        <SmallButton icon="close" ariaLabel={Locale.label("common.close")} text={Locale.label("common.close")} onClick={() => window.history.back()} />
      </Box>
      {isLoading && (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      )}
      {!isLoading && printable.length === 0 && (
        <Typography sx={{ p: 2 }} data-testid="print-batches-empty">{Locale.label("donations.printAllBatches.noBatches")}</Typography>
      )}
      {!isLoading && printable.map((batch, index) => (
        <Box key={batch.id} sx={{ p: 2, ...(index < printable.length - 1 ? { pageBreakAfter: "always", breakAfter: "page" } : {}) }}>
          <BatchPrintDocument
            churchName={context?.userChurch?.church?.name}
            batch={batch}
            donations={donationsByBatch.data?.[batch.id || ""] || []}
            fundDonations={fundDonations.data || []}
            funds={funds.data || []}
            currency={currency}
            rates={rates.data || {}}
          />
        </Box>
      ))}
    </>
  );
};
