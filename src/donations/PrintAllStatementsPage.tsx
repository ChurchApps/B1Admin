import { ApiHelper, CurrencyHelper, Locale, SmallButton } from "@churchapps/apphelper";
import { type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import UserContext from "../UserContext";
import { Box, CircularProgress, Typography } from "@mui/material";
import { type PledgeProgressRowInterface } from "../helpers";
import { GivingStatementDocument, parseStatementSettings } from "./components/GivingStatementDocument";

export const PrintAllStatementsPage = () => {
  const [searchParams] = useSearchParams();
  const yearParam = searchParams.get("year");
  const currYear = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
  const context = useContext(UserContext);
  const [currency, setCurrency] = useState<string>("usd");

  const allDonations = useQuery<DonationInterface[]>({
    queryKey: ["/donations", "GivingApi"],
    placeholderData: []
  });

  const allFundDonations = useQuery<FundDonationInterface[]>({
    queryKey: ["/fundDonations", "GivingApi"],
    placeholderData: []
  });

  const funds = useQuery<FundInterface[]>({
    queryKey: ["/funds", "GivingApi"],
    placeholderData: []
  });

  const churchSettings = useQuery<Record<string, string>>({
    queryKey: ["/settings/public/" + context?.userChurch?.church?.id, "MembershipApi"],
    placeholderData: {},
    enabled: !!context?.userChurch?.church?.id
  });

  const pledgeProgress = useQuery<PledgeProgressRowInterface[]>({
    queryKey: ["/campaigns/progress/people", "GivingApi"],
    placeholderData: []
  });

  const yearDonations = useMemo(() => {
    return (
      allDonations.data?.filter((don) => {
        if (!don.donationDate) return false;
        const donationDate = new Date(don.donationDate.toString().split("T")[0] + "T00:00:00");
        return donationDate.getFullYear() === currYear;
      }) || []
    );
  }, [allDonations.data, currYear]);

  const personIds = useMemo(() => {
    const ids = new Set<string>();
    yearDonations.forEach((donation) => {
      if (donation.personId) {
        ids.add(donation.personId);
      }
    });
    return Array.from(ids).sort();
  }, [yearDonations]);

  const people = useQuery<PersonInterface[]>({
    queryKey: ["statementPeople", personIds],
    queryFn: async () => {
      const chunks: string[][] = [];
      for (let i = 0; i < personIds.length; i += 200) chunks.push(personIds.slice(i, i + 200));
      const results = await Promise.all(chunks.map((ids) => ApiHelper.get("/people/ids?ids=" + ids.join(","), "MembershipApi")));
      return results.flat();
    },
    placeholderData: [],
    enabled: personIds.length > 0
  });

  const fundDonationsByPerson = useMemo(() => {
    const donationsById = new Map(yearDonations.map((d) => [d.id, d]));
    const result = new Map<string, { fd: FundDonationInterface; donation: DonationInterface }[]>();
    allFundDonations.data?.forEach((fd) => {
      const donation = donationsById.get(fd.donationId);
      if (!donation?.personId) return;
      const list = result.get(donation.personId) || [];
      list.push({ fd, donation });
      result.set(donation.personId, list);
    });
    return result;
  }, [allFundDonations.data, yearDonations]);

  const isLoading = allDonations.isPlaceholderData || allFundDonations.isPlaceholderData || funds.isPlaceholderData || (personIds.length > 0 && people.isPlaceholderData);

  const autoprint = searchParams.get("autoprint") === "1";
  const hasPrinted = useRef(false);

  useEffect(() => {
    if (autoprint && !isLoading && people.data && people.data.length > 0 && !hasPrinted.current) {
      hasPrinted.current = true;
      window.print();
    }
  }, [autoprint, isLoading, people.data]);

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

  const getTotalContributions = (personId: string) => {
    let result = 0;
    fundDonationsByPerson.get(personId)?.forEach(({ fd }) => { result += fd.amount || 0; });
    return result;
  };

  const getFundTotals = (personId: string) => {
    const result: any[] = [];
    fundDonationsByPerson.get(personId)?.forEach(({ fd }) => {
      const fund = funds.data?.find((f) => f.id === fd.fundId);
      const existing = result.find((r) => r.fund === fund?.name);
      if (existing) {
        existing.total += fd.amount || 0;
      } else {
        result.push({ fund: fund?.name, total: fd.amount || 0 });
      }
    });

    return result;
  };

  const getPledgeRows = (personId: string) => pledgeProgress.data?.filter((row) => row.personId === personId) || [];

  const getDonationDetails = (personId: string) => {
    const result: any[] = [];
    fundDonationsByPerson.get(personId)?.forEach(({ fd, donation }) => {
      const fund = funds.data?.find((f) => f.id === fd.fundId);
      result.push({
        date: donation.donationDate,
        method: donation.method,
        fund: fund?.name,
        amount: fd.amount || 0,
        taxDeductible: fund?.taxDeductible !== false
      });
    });

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" flexDirection="column" gap={2}>
        <CircularProgress />
        <Typography>{Locale.label("donations.printAllStatementsPage.loadingStatements")}</Typography>
      </Box>
    );
  }

  return (
    <>
      <style>{"@media print { .print-toolbar { display: none !important; } }"}</style>
      <Box className="print-toolbar" sx={{ display: "flex", justifyContent: "flex-end", gap: 1, p: 2 }}>
        <SmallButton icon="print" ariaLabel={Locale.label("common.print")} text={Locale.label("common.print")} onClick={() => window.print()} />
        <SmallButton icon="close" ariaLabel={Locale.label("common.close")} text={Locale.label("common.close")} onClick={() => window.history.back()} />
      </Box>
      {people.data?.map((person, index) => (
        <GivingStatementDocument
          key={person.id}
          labelPrefix="donations.printAllStatementsPage"
          person={person}
          church={context?.userChurch?.church}
          year={currYear}
          currency={currency}
          totalContributions={getTotalContributions(person.id!)}
          fundTotals={getFundTotals(person.id!)}
          contributions={getDonationDetails(person.id!)}
          pledgeRows={getPledgeRows(person.id!)}
          showPageBreak={index < people.data!.length - 1}
          showStyles={index === 0}
          statementSettings={parseStatementSettings(churchSettings.data)}
        />
      ))}
    </>
  );
};
