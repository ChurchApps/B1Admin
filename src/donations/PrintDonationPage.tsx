import { ArrayHelper, CurrencyHelper } from "@churchapps/apphelper";
import { type DonationInterface, type FundDonationInterface, type FundInterface, type PersonInterface } from "@churchapps/helpers";
import { useContext, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import UserContext from "../UserContext";
import { type PledgeProgressRowInterface } from "../helpers";
import { GivingStatementDocument } from "./components/GivingStatementDocument";

export const PrintDonationPage = () => {
  const [currency, setCurrency] = useState<string>("usd");
  const navigate = useNavigate();
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

  const allPledgeProgress = useQuery<PledgeProgressRowInterface[]>({
    queryKey: ["/campaigns/progress/people", "GivingApi"],
    placeholderData: []
  });

  const pledgeRows = useMemo(() => allPledgeProgress.data?.filter((row) => row.personId === params.personId) || [], [allPledgeProgress.data, params.personId]);

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

  useEffect(() => {
    if (person.data && funds.data && donations.length >= 0 && fundDonations.length >= 0) {
      setTimeout(() => {
        window.print();
        navigate(-1);
      }, 1500);
    }
  }, [person.data, funds.data, donations, fundDonations, navigate]);

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
    const result: { date: string; method: string | undefined; fund: string | undefined; amount: number }[] = [];
    fundDonations.forEach((fd) => {
      const donation = ArrayHelper.getOne(donations, "id", fd.donationId);
      const fund = ArrayHelper.getOne(funds.data || [], "id", fd.fundId);
      if (donation) result.push({ date: donation.donationDate, method: donation.method, fund: fund?.name, amount: fd.amount || 0 });
    });
    return result;
  }, [fundDonations, donations, funds.data]);

  return (
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
    />
  );
};
