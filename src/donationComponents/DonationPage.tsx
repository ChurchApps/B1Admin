"use client";

import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { Loading } from "@churchapps/apphelper";
import { MultiGatewayDonationForm, RecurringDonations, PaymentMethods, SavedPaymentMethod, getPaymentProvider } from "@churchapps/apphelper/donations";
import type { PaymentGateway } from "@churchapps/apphelper/donations";
import { ApiHelper, DateHelper, UniqueIdHelper, CurrencyHelper, Locale } from "../helpers";
import type { DonationInterface, PersonInterface, ChurchInterface } from "@churchapps/helpers";
import { Box, Table, TableBody, TableRow, TableCell, TableHead, Alert, Link } from "@mui/material";
import { BackVerb, RecordHeading, TextAction, VerbRow, YearLedger, numericCellSx, pickDefaultYear, tableScrollSx, withCurrentYear, yearOf, yearsFromDates } from "../components/ui";
import { CsvVerb } from "../donations/components/GivingParts";

interface Props {
  personId: string;
  appName?: string;
  church?: ChurchInterface;
  churchLogo?: string;
}

type Slice = "" | "give" | "recurring" | "methods";

const csvHeaders = [
  { label: "amount", key: "amount" },
  { label: "donationDate", key: "donationDate" },
  { label: "fundName", key: "fund.name" },
  { label: "method", key: "method" },
  { label: "methodDetails", key: "methodDetails" },
  { label: "notes", key: "notes" }
];

// A person's gifts come back one row per fund split, so the fund amount is the row's amount.
const giftAmount = (d: DonationInterface) => d.fund?.amount ?? d.amount ?? 0;

export const DonationPage: React.FC<Props> = (props) => {
  const [donations, setDonations] = React.useState<DonationInterface[] | null>(null);
  const [paymentMethods, setPaymentMethods] = React.useState<SavedPaymentMethod[] | null>(null);
  const [paymentGateways, setPaymentGateways] = React.useState<PaymentGateway[]>([]);
  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [person, setPerson] = React.useState<PersonInterface | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [appName, setAppName] = React.useState<string>("");
  const [currency, setCurrency] = React.useState<string>("usd");
  const [slice, setSlice] = React.useState<Slice>("");
  // undefined = not chosen yet (defaults to this year, or the newest year with gifts); null = all years.
  const [year, setYear] = React.useState<number | null | undefined>(undefined);

  const loadPaymentMethods = async () => {
    try {
      const data = await ApiHelper.get("/paymentmethods/personid/" + props.personId, "GivingApi");
      if (!data.length) {
        setPaymentMethods([]);
        return;
      }

      // Handle both old nested format and new flat array format
      if (data[0]?.cards?.data || data[0]?.banks?.data) {
        // Old format with nested cards/banks structure
        const cards = data[0]?.cards?.data?.map((card: any) => new SavedPaymentMethod(card)) || [];
        const banks = data[0]?.banks?.data?.map((bank: any) => new SavedPaymentMethod(bank)) || [];
        setCustomerId(data[0]?.customer?.id);
        setPaymentMethods(cards.concat(banks));
      } else {
        // New flat array format from normalized API response
        const methods = data
          .filter((pm: any) => getPaymentProvider(pm.provider).capabilities.savedCard)
          .map((pm: any) => new SavedPaymentMethod(pm));
        // Get customerId from first payment method if available
        const firstMethod = data.find((pm: any) => pm.customerId);
        if (firstMethod?.customerId) {
          setCustomerId(firstMethod.customerId);
        }
        setPaymentMethods(methods);
      }
    } catch (error) {
      console.error("Error loading payment methods:", error);
      setPaymentMethods([]);
    }
  };

  const loadPersonData = async () => {
    try {
      const data = await ApiHelper.get("/people/" + props.personId, "MembershipApi");
      setPerson(data);
    } catch (error) {
      console.error("Error loading person data:", error);
    }
  };

  const loadGatewayData = async (gatewayData: any) => {
    if (!gatewayData.length) {
      setPaymentMethods([]);
      return;
    }

    setPaymentGateways(gatewayData);
    await loadPaymentMethods();
  };

  const loadData = async () => {
    if (props?.appName) setAppName(props.appName);
    if (UniqueIdHelper.isMissing(props.personId)) return;

    try {
      const [donationsData, gatewaysData] = await Promise.all([ApiHelper.get("/donations?personId=" + props.personId, "GivingApi"), ApiHelper.get("/gateways", "GivingApi")]);

      setDonations(donationsData);
      await loadPersonData(); //loaded before gateway data to fix issue with person data not loading when there's no gateway data
      await loadGatewayData(gatewaysData);
    } catch (error) {
      console.error("Error loading donation data:", error);
      setDonations([]);
      setPaymentMethods([]);
    }
  };

  const handleDataUpdate = (message?: string) => {
    setMessage(message || null);
    setPaymentMethods(null);
    loadData();
  };

  React.useEffect(() => {
    loadData();
  }, [props.personId]);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  const isStaff = appName !== "B1App";
  const money = (n: number) => CurrencyHelper.formatCurrencyWithLocale(n || 0, currency);
  const all = donations || [];
  const dataYears = yearsFromDates(all.map((d) => d.donationDate));
  const years = withCurrentYear(dataYears);
  const selectedYear = year === undefined ? pickDefaultYear(dataYears) : year;
  const yearGifts = selectedYear === null ? all : all.filter((d) => yearOf(d.donationDate) === selectedYear);
  const yearTotal = yearGifts.reduce((sum, d) => sum + giftAmount(d), 0);
  const lifetime = all.reduce((sum, d) => sum + giftAmount(d), 0);
  const firstYear = dataYears[dataYears.length - 1];

  const summary = () => {
    if (all.length === 0) return "";
    const since = Locale.label("donation.page.sinceYear", "{amount} since {year}").replace("{amount}", money(lifetime)).replace("{year}", String(firstYear));
    if (selectedYear === null) return Locale.label("donation.page.giftCount", "{count} gifts").replace("{count}", String(all.length)) + " · " + since;
    return Locale.label("donation.page.giftsInYear", "{count} gifts in {year}").replace("{count}", String(yearGifts.length)).replace("{year}", String(selectedYear)) + " · " + since;
  };

  const getRows = () => {
    if (all.length === 0 || yearGifts.length === 0) {
      const text = all.length === 0 ? Locale.label("donation.page.willAppear") : Locale.label("donation.page.noGiftsInYear", "No gifts in {year}.").replace("{year}", String(selectedYear));
      return (
        <TableRow>
          <TableCell colSpan={isStaff ? 6 : 5} sx={{ color: "text.secondary" }}>{text}</TableCell>
        </TableRow>
      );
    }
    return yearGifts.map((d, i) => (
      <TableRow key={(d.id || "") + i}>
        {isStaff && (
          <TableCell>
            {d.batchId ? <Link component={RouterLink} to={"/donations/batches/" + d.batchId} underline="hover">{Locale.label("donation.page.viewBatch")}</Link> : ""}
          </TableCell>
        )}
        <TableCell>{d.donationDate ? DateHelper.prettyDate(new Date(d.donationDate.split("T")[0] + "T00:00:00")) : ""}</TableCell>
        <TableCell>{[d.method, d.methodDetails].filter(Boolean).join(" - ")}</TableCell>
        <TableCell>{d.fund?.name}</TableCell>
        <TableCell>
          <Box component="span" title={d.notes || ""} sx={{ display: "inline-block", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "bottom" }}>
            {d.notes || ""}
          </Box>
        </TableCell>
        <TableCell align="right" sx={{ ...numericCellSx, fontWeight: 600 }}>{money(giftAmount(d))}</TableCell>
      </TableRow>
    ));
  };

  const ledger = () => {
    if (!donations) return <Loading />;
    return (
      <YearLedger
        title={Locale.label("donation.page.giving", "Giving")}
        headline={all.length > 0 ? money(yearTotal) : undefined}
        summary={summary()}
        years={all.length > 0 ? years : []}
        year={selectedYear}
        onYearChange={setYear}
        allLabel={Locale.label("donation.page.allYears", "All years")}
        actions={(
          <VerbRow>
            {selectedYear !== null && yearGifts.length > 0 && person?.id && (
              <TextAction to={"/donations/print/" + person.id + "?year=" + selectedYear} component={RouterLink} data-testid="giving-statement">{Locale.label("donation.page.statement", "Statement")}</TextAction>
            )}
            {yearGifts.length > 0 && <CsvVerb data={yearGifts} filename={(selectedYear ?? "all") + "_donations"} customHeaders={csvHeaders} text={Locale.label("donation.page.csv", "CSV")} />}
            {paymentGateways.length > 0 && <TextAction onClick={() => setSlice("give")} data-testid="giving-give">{Locale.label("donation.page.give", "Give")}</TextAction>}
            <TextAction onClick={() => setSlice("recurring")} data-testid="giving-recurring">{Locale.label("donation.page.recurring", "Recurring")}</TextAction>
            <TextAction onClick={() => setSlice("methods")} data-testid="giving-payment-methods">{Locale.label("donation.page.paymentMethods", "Payment methods")}</TextAction>
          </VerbRow>
        )}>
        <Box sx={tableScrollSx} role="region" aria-label={Locale.label("donation.donationPage.donations")} tabIndex={0}>
          <Table>
            {all.length > 0 && (
              <TableHead>
                <TableRow>
                  {isStaff && <TableCell>{Locale.label("donation.page.batch")}</TableCell>}
                  <TableCell>{Locale.label("donation.page.date")}</TableCell>
                  <TableCell>{Locale.label("donation.page.method")}</TableCell>
                  <TableCell>{Locale.label("donation.page.fund")}</TableCell>
                  <TableCell>{Locale.label("donation.page.notes")}</TableCell>
                  <TableCell align="right" sx={numericCellSx}>{Locale.label("donation.page.amount")}</TableCell>
                </TableRow>
              </TableHead>
            )}
            <TableBody>{getRows()}</TableBody>
          </Table>
        </Box>
      </YearLedger>
    );
  };

  const sliceShell = (title: string, body: () => React.ReactNode) => (
    <Box>
      <Box sx={{ mb: 2 }}>
        <BackVerb name={Locale.label("donation.page.giving", "Giving")} onClick={() => setSlice("")} data-testid="giving-back" />
      </Box>
      <RecordHeading label={title} />
      {!paymentMethods || !donations || !person ? <Loading /> : body()}
    </Box>
  );

  const content = () => {
    switch (slice) {
      case "give":
        return sliceShell(Locale.label("donation.page.give", "Give"), () => (
          <MultiGatewayDonationForm
            person={person!}
            customerId={customerId || ""}
            paymentMethods={paymentMethods || []}
            paymentGateways={paymentGateways}
            donationSuccess={handleDataUpdate}
            church={props?.church}
            churchLogo={props?.churchLogo}
          />
        ));
      case "recurring":
        return sliceShell(Locale.label("donation.page.recurring", "Recurring"), () => (
          <RecurringDonations customerId={customerId || ""} paymentMethods={paymentMethods || []} appName={appName} dataUpdate={handleDataUpdate} />
        ));
      case "methods":
        return sliceShell(Locale.label("donation.page.paymentMethods", "Payment methods"), () => (
          <PaymentMethods person={person!} customerId={customerId || ""} paymentMethods={paymentMethods || []} appName={appName} dataUpdate={handleDataUpdate} />
        ));
      default:
        return ledger();
    }
  };

  return (
    <>
      {paymentMethods && message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {content()}
    </>
  );
};
