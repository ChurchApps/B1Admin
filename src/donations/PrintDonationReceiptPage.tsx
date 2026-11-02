import { ArrayHelper, CurrencyHelper, DateHelper, Locale, Permissions, SmallButton } from "@churchapps/apphelper";
import { type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box } from "@mui/material";
import UserContext from "../UserContext";
import { GivingStatementDocument, parseStatementSettings } from "./components/GivingStatementDocument";
import { usePrintLogo } from "../components/PrintChurchHeader";
import { useRequirePermission } from "../hooks";

// One gift printed in the giving statement's style, for a cheque, event payment or visiting organization's donation.
export const PrintDonationReceiptPage = () => {
  const [currency, setCurrency] = useState<string>("usd");
  const params = useParams();
  const [searchParams] = useSearchParams();
  const context = useContext(UserContext);
  const denied = useRequirePermission(Permissions.givingApi.donations.view);

  const donation = useQuery<DonationInterface>({
    queryKey: ["/donations/" + params.donationId, "GivingApi"],
    placeholderData: undefined
  });

  const fundDonations = useQuery<FundDonationInterface[]>({
    queryKey: ["/fundDonations?donationId=" + params.donationId, "GivingApi"],
    placeholderData: []
  });

  const funds = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi"],
    placeholderData: []
  });

  const personId = donation.data?.personId;
  const person = useQuery<PersonInterface>({
    queryKey: ["/people/" + personId, "MembershipApi"],
    placeholderData: undefined,
    enabled: !!personId
  });

  const churchSettings = useQuery<Record<string, string>>({
    queryKey: ["/settings/public/" + context?.userChurch?.church?.id, "MembershipApi"],
    placeholderData: {},
    enabled: !!context?.userChurch?.church?.id
  });

  const autoprint = searchParams.get("autoprint") === "1";
  const hasPrinted = useRef(false);
  const printLogo = usePrintLogo(context?.userChurch?.church?.id);

  const donationDate = useMemo(() => {
    const raw = donation.data?.donationDate;
    return raw ? new Date(raw.split("T")[0] + "T00:00:00") : new Date();
  }, [donation.data?.donationDate]);

  const dataLoaded = !!donation.data && !fundDonations.isPlaceholderData && !funds.isPlaceholderData && (!personId || !!person.data);

  useEffect(() => {
    if (autoprint && dataLoaded && printLogo.ready && !hasPrinted.current) {
      hasPrinted.current = true;
      window.print();
    }
  }, [autoprint, dataLoaded, printLogo.ready]);

  useEffect(() => {
    const handleAfterPrint = () => window.history.back();
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  useEffect(() => {
    if (donation.data?.currency) setCurrency(donation.data.currency);
    else CurrencyHelper.loadCurrency().then((result) => setCurrency(result));
  }, [donation.data?.currency]);

  const contributions = useMemo(() => {
    const d = donation.data;
    if (!d) return [];
    const method = [d.method, d.methodDetails].filter(Boolean).join(" - ");
    return (fundDonations.data || []).map((fd) => {
      const fund = ArrayHelper.getOne(funds.data || [], "id", fd.fundId);
      return { date: d.donationDate || "", method, fund: fund?.name, amount: fd.amount || 0, taxDeductible: fund?.taxDeductible !== false };
    });
  }, [donation.data, fundDonations.data, funds.data]);

  const fundTotals = useMemo(() => contributions.map((c) => ({ fund: c.fund, total: c.amount })), [contributions]);
  const totalContributions = useMemo(() => contributions.reduce((sum, c) => sum + c.amount, 0), [contributions]);

  if (denied) return denied;

  return (
    <>
      <style>{"@media print { .print-toolbar { display: none !important; } }"}</style>
      <Box className="print-toolbar" sx={{ display: "flex", justifyContent: "flex-end", gap: 1, p: 2 }}>
        <SmallButton icon="print" ariaLabel={Locale.label("common.print")} text={Locale.label("common.print")} onClick={() => window.print()} />
        <SmallButton icon="close" ariaLabel={Locale.label("common.close")} text={Locale.label("common.close")} onClick={() => window.history.back()} />
      </Box>
      {dataLoaded && (
        <GivingStatementDocument
          labelPrefix="donations.receiptPage"
          variant="receipt"
          receiptNumber={donation.data?.id}
          receiptDate={DateHelper.prettyDate(donationDate).toString()}
          person={personId ? person.data : undefined}
          church={context?.userChurch?.church}
          year={donationDate.getFullYear()}
          currency={currency}
          totalContributions={totalContributions}
          fundTotals={fundTotals}
          contributions={contributions}
          pledgeRows={[]}
          showPageBreak={false}
          statementSettings={parseStatementSettings(churchSettings.data)}
          logoUrl={printLogo.logoUrl}
        />
      )}
    </>
  );
};
