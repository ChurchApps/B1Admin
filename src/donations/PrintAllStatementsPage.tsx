import { CurrencyHelper, Locale } from "@churchapps/apphelper";
import { type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import UserContext from "../UserContext";
import { Box, CircularProgress, Typography } from "@mui/material";
import { type PledgeProgressRowInterface } from "../helpers";
import { GivingStatementDocument } from "./components/GivingStatementDocument";

export const PrintAllStatementsPage = () => {
  const navigate = useNavigate();
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
    queryKey: ["/people/ids?ids=" + personIds.join(","), "MembershipApi"],
    placeholderData: [],
    enabled: personIds.length > 0
  });

  const yearFundDonations = useMemo(() => {
    return allFundDonations.data?.filter((fundDonation) =>
      yearDonations.some((donation) => donation.id === fundDonation.donationId)) || [];
  }, [allFundDonations.data, yearDonations]);

  const isLoading = allDonations.isLoading || allFundDonations.isLoading || funds.isLoading || (personIds.length > 0 && people.isLoading);

  useEffect(() => {
    if (!isLoading && people.data && people.data.length > 0) {
      setTimeout(() => {
        window.print();
        navigate(-1);
      }, 1500);
    }
  }, [isLoading, people.data, navigate]);

  useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  const getTotalContributions = (personId: string) => {
    let result = 0;
    yearFundDonations.forEach((fd) => {
      const donation = yearDonations.find((d) => d.id === fd.donationId && d.personId === personId);
      if (donation) {
        result += fd.amount || 0;
      }
    });
    return result;
  };

  const getFundTotals = (personId: string) => {
    const result: any[] = [];
    const personDonations = yearDonations.filter((d) => d.personId === personId);

    yearFundDonations.forEach((fd) => {
      const donation = personDonations.find((d) => d.id === fd.donationId);
      if (donation) {
        const fund = funds.data?.find((f) => f.id === fd.fundId);
        const existing = result.find((r) => r.fund === fund?.name);
        if (existing) {
          existing.total += fd.amount || 0;
        } else {
          result.push({ fund: fund?.name, total: fd.amount || 0 });
        }
      }
    });

    return result;
  };

  const getPledgeRows = (personId: string) => pledgeProgress.data?.filter((row) => row.personId === personId) || [];

  const getDonationDetails = (personId: string) => {
    const result: any[] = [];
    const personDonations = yearDonations.filter((d) => d.personId === personId);

    yearFundDonations.forEach((fd) => {
      const donation = personDonations.find((d) => d.id === fd.donationId);
      if (donation) {
        const fund = funds.data?.find((f) => f.id === fd.fundId);
        result.push({
          date: donation.donationDate,
          method: donation.method,
          fund: fund?.name,
          amount: fd.amount || 0
        });
      }
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
      {people.data?.map((person, index) => (
        <GivingStatementDocument
          key={person.id}
          labelPrefix="donations.printAllStatementsPage"
          person={person}
          church={context.userChurch?.church}
          year={currYear}
          currency={currency}
          totalContributions={getTotalContributions(person.id!)}
          fundTotals={getFundTotals(person.id!)}
          contributions={getDonationDetails(person.id!)}
          pledgeRows={getPledgeRows(person.id!)}
          showPageBreak={index < people.data!.length - 1}
          showStyles={index === 0}
        />
      ))}
    </>
  );
};
