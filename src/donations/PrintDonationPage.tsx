import { ArrayHelper, CurrencyHelper, Locale, SmallButton } from "@churchapps/apphelper";
import { type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Box } from "@mui/material";
import UserContext from "../UserContext";
import { type PledgeProgressRowInterface } from "../helpers";
import { GivingStatementDocument, parseStatementSettings } from "./components/GivingStatementDocument";

export const PrintDonationPage = () => {
  const [currency, setCurrency] = useState<string>("usd");
  const params = useParams();
  const [searchParams] = useSearchParams();
  const yearParam = searchParams.get("year");
  const currYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  const context = useContext(UserContext);

  const person = useQuery<PersonInterface>({
    queryKey: ["/people/" + params.personId, "MembershipApi"],
    placeholderData: undefined
  });

  const funds = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi"],
    placeholderData: []
  });

  const allDonations = useQuery<DonationInterface[]>({
    queryKey: ["/donations?personId=" + params.personId, "GivingApi"],
    placeholderData: []
  });

  const allFundDonations = useQuery<FundDonationInterface[]>({
    queryKey: ["/fundDonations?personId=" + params.personId, "GivingApi"],
    placeholderData: []
  });

  const churchSettings = useQuery<Record<string, string>>({
    queryKey: ["/settings/public/" + context?.userChurch?.church?.id, "MembershipApi"],
    placeholderData: {},
    enabled: !!context?.userChurch?.church?.id
  });

  const allPledgeProgress = useQuery<PledgeProgressRowInterface[]>({
    queryKey: ["/campaigns/progress/people", "GivingApi"],
    placeholderData: []
  });

  const pledgeRows = useMemo(() => allPledgeProgress.data?.filter((row) => row.personId === params.personId) || [], [allPledgeProgress.data, params.personId]);

  const autoprint = searchParams.get("autoprint") === "1";
  const hasPrinted = useRef(false);

  const donations = useMemo(() => {
    return (
      allDonations.data?.filter((don) => {
        if (!don.donationDate) return false;
        const donationDate = new Date(don.donationDate.split("T")[0] + "T00:00:00");
        return donationDate.getFullYear() === currYear;
      }) || []
    );
  }, [allDonations.data, currYear]);

  const fundDonations = useMemo(() => {
    return allFundDonations.data?.filter((fundDonation) => donations.some((donation) => donation.id === fundDonation.donationId)) || [];
  }, [allFundDonations.data, donations]);

  const dataLoaded = !!person.data && !!funds.data;

  useEffect(() => {
    if (autoprint && dataLoaded && !hasPrinted.current) {
      hasPrinted.current = true;
      window.print();
    }
  }, [autoprint, dataLoaded]);

  useEffect(() => {
    const handleAfterPrint = () => window.history.back();
    window.addEventListener("afterprint", handleAfterPrint);
    return () => window.removeEventListener("afterprint", handleAfterPrint);
  }, []);

  useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  const totalContributions = useMemo(() => {
    let result = 0;
    fundDonations.forEach((d) => {
      const donation = ArrayHelper.getOne(donations, "id", d.donationId);
      if (donation) result += d.amount || 0;
    });
    return result;
  }, [fundDonations, donations]);

  const fundTotals = useMemo(() => {
    const result: { fund: string | undefined; total: number }[] = [];
    fundDonations.forEach((fd) => {
      const donation = ArrayHelper.getOne(donations, "id", fd.donationId);
      if (donation) {
        const fund = ArrayHelper.getOne(funds.data || [], "id", fd.fundId);
        const existing = ArrayHelper.getOne(result, "fund", fund?.name);
        if (existing) existing.total += fd.amount || 0;
        else result.push({ fund: fund?.name, total: fd.amount || 0 });
      }
    });
    return result;
  }, [fundDonations, donations, funds.data]);

  const contributions = useMemo(() => {
    const result: { date: string; method: string | undefined; fund: string | undefined; amount: number; taxDeductible?: boolean }[] = [];
    fundDonations.forEach((fd) => {
      const donation = ArrayHelper.getOne(donations, "id", fd.donationId);
      const fund = ArrayHelper.getOne(funds.data || [], "id", fd.fundId);
      if (donation) result.push({ date: donation.donationDate, method: donation.method, fund: fund?.name, amount: fd.amount || 0, taxDeductible: fund?.taxDeductible !== false });
    });
    return result;
  }, [fundDonations, donations, funds.data]);

  return (
    <>
      <style>{"@media print { .print-toolbar { display: none !important; } }"}</style>
      <Box className="print-toolbar" sx={{ display: "flex", justifyContent: "flex-end", gap: 1, p: 2 }}>
        <SmallButton icon="print" ariaLabel={Locale.label("common.print")} text={Locale.label("common.print")} onClick={() => window.print()} />
        <SmallButton icon="close" ariaLabel={Locale.label("common.close")} text={Locale.label("common.close")} onClick={() => window.history.back()} />
      </Box>
      <GivingStatementDocument
        labelPrefix="donations.printDonationPage"
        person={person.data}
        church={context?.userChurch?.church}
        year={currYear}
        currency={currency}
        totalContributions={totalContributions}
        fundTotals={fundTotals}
        contributions={contributions}
        pledgeRows={pledgeRows}
        showPageBreak={false}
        statementSettings={parseStatementSettings(churchSettings.data)}
      />
    </>
  );
};
