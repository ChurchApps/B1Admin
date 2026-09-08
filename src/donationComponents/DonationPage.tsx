"use client";

import React from "react";
import { ExportLink, Loading } from "@churchapps/apphelper";
import { MultiGatewayDonationForm, RecurringDonations, PaymentMethods, SavedPaymentMethod, getPaymentProvider } from "@churchapps/apphelper/donations";
import type { PaymentGateway } from "@churchapps/apphelper/donations";
import { ApiHelper, DateHelper, UniqueIdHelper, CurrencyHelper, Locale, UserHelper } from "../helpers";
import { Permissions } from "@churchapps/apphelper";
import type { DonationInterface, PersonInterface, ChurchInterface, FundInterface } from "@churchapps/helpers";
import { Alert, Box, Link, Table, TableBody, TableRow, TableCell, TableHead } from "@mui/material";
import { GiftLogSheet } from "../donations/components/GiftLogSheet";
import { YearLedger, Verb, VerbRow, SectionTitle, mutedSx, plainTableSx, donationYear, donationAmount, yearsFromDates, withCurrentYear } from "../donations/components/plate";

interface Props {
  personId: string;
  appName?: string;
  church?: ChurchInterface;
  churchLogo?: string;
}

type View = "plate" | "gifts" | "give" | "recurring" | "methods";

const csvHeaders = [
  { label: "amount", key: "amount" },
  { label: "donationDate", key: "donationDate" },
  { label: "fundName", key: "fund.name" },
  { label: "method", key: "method" },
  { label: "methodDetails", key: "methodDetails" },
  { label: "notes", key: "notes" }
];

export const DonationPage: React.FC<Props> = (props) => {
  const [donations, setDonations] = React.useState<DonationInterface[] | null>(null);
  const [paymentMethods, setPaymentMethods] = React.useState<SavedPaymentMethod[] | null>(null);
  const [paymentGateways, setPaymentGateways] = React.useState<PaymentGateway[]>([]);
  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [person, setPerson] = React.useState<PersonInterface | null>(null);
  const [funds, setFunds] = React.useState<FundInterface[]>([]);
  const [subscriptions, setSubscriptions] = React.useState<any[]>([]);
  const [message, setMessage] = React.useState<string | null>(null);
  const [appName, setAppName] = React.useState<string>("");
  const [currency, setCurrency] = React.useState<string>("usd");
  const [view, setView] = React.useState<View>("plate");
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [logOpen, setLogOpen] = React.useState(false);

  const currentY = new Date().getFullYear();
  const isStaff = appName !== "B1App";
  const canLog = isStaff && UserHelper.checkAccess(Permissions.givingApi.donations.edit);

  const loadPaymentMethods = async () => {
    try {
      const data = await ApiHelper.get("/paymentmethods/personid/" + props.personId, "GivingApi");
      if (!data.length) {
        setPaymentMethods([]);
        return;
      }

      if (data[0]?.cards?.data || data[0]?.banks?.data) {
        const cards = data[0]?.cards?.data?.map((card: any) => new SavedPaymentMethod(card)) || [];
        const banks = data[0]?.banks?.data?.map((bank: any) => new SavedPaymentMethod(bank)) || [];
        setCustomerId(data[0]?.customer?.id);
        setPaymentMethods(cards.concat(banks));
      } else {
        const methods = data
          .filter((pm: any) => getPaymentProvider(pm.provider).capabilities.savedCard)
          .map((pm: any) => new SavedPaymentMethod(pm));
        const firstMethod = data.find((pm: any) => pm.customerId);
        if (firstMethod?.customerId) setCustomerId(firstMethod.customerId);
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

  const loadSubscriptions = async (id: string | null) => {
    if (!id) {
      setSubscriptions([]);
      return;
    }
    try {
      const subResult = await ApiHelper.get("/customers/" + id + "/subscriptions", "GivingApi");
      const subscriptionData = subResult.data || [];
      if (!subscriptionData.length) {
        setSubscriptions([]);
        return;
      }
      const subs: any[] = [];
      await Promise.all(subscriptionData.map((s: any) =>
        ApiHelper.get("/subscriptionfunds?subscriptionId=" + s.id, "GivingApi")
          .then((subFunds: any) => { s.funds = subFunds; subs.push(s); })
          .catch(() => { s.funds = []; subs.push(s); })));
      setSubscriptions(subs);
    } catch {
      setSubscriptions([]);
    }
  };

  const loadData = async () => {
    if (props?.appName) setAppName(props.appName);
    if (UniqueIdHelper.isMissing(props.personId)) return;

    try {
      const [donationsData, gatewaysData, fundsData] = await Promise.all([
        ApiHelper.get("/donations?personId=" + props.personId, "GivingApi"),
        ApiHelper.get("/gateways", "GivingApi"),
        ApiHelper.get("/funds", "GivingApi")
      ]);

      setDonations(donationsData);
      setFunds(fundsData || []);
      await loadPersonData();
      await loadGatewayData(gatewaysData);
    } catch (error) {
      console.error("Error loading donation data:", error);
      setDonations([]);
      setPaymentMethods([]);
    }
  };

  const handleDataUpdate = (msg?: string) => {
    setMessage(msg || null);
    setPaymentMethods(null);
    setLogOpen(false);
    loadData();
  };

  React.useEffect(() => {
    loadData();
  }, [props.personId]);

  React.useEffect(() => {
    loadSubscriptions(customerId);
  }, [customerId]);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => setCurrency(result));
  }, []);

  const money = (n: number) => CurrencyHelper.formatCurrencyWithLocale(n || 0, currency);

  const years = React.useMemo(() => withCurrentYear(yearsFromDates((donations || []).map((d) => d.donationDate)), currentY), [donations, currentY]);
  const yearDonations = React.useMemo(() => (donations || []).filter((d) => donationYear(d) === year), [donations, year]);
  const plateDonations = React.useMemo(() => (donations || []).filter((d) => donationYear(d) === currentY), [donations, currentY]);
  const yearTotal = yearDonations.reduce((sum, d) => sum + donationAmount(d), 0);
  const plateTotal = plateDonations.reduce((sum, d) => sum + donationAmount(d), 0);
  const lifetime = (donations || []).reduce((sum, d) => sum + donationAmount(d), 0);

  const recurringLine = React.useMemo(() => {
    const sub = subscriptions[0];
    if (!sub) return "no recurring";
    const amount = (sub.plan?.amount || 0) / 100;
    const count = sub.plan?.interval_count || 1;
    const interval = sub.plan?.interval || "month";
    const intervalLabel = count > 1 ? `${count} ${interval}s` : interval;
    const fund = sub.funds?.[0]?.name;
    return `${money(amount)} / ${intervalLabel}${fund ? " · " + fund : ""}`;
  }, [subscriptions, currency]);

  const personName = person?.name?.display || person?.name?.first || "";

  const statementHref = (y: number) => person?.id ? "/donations/print/" + person.id + "?year=" + y : undefined;

  const csvLink = (rows: DonationInterface[], filename: string, text: string) => {
    if (!rows.length) return null;
    return <ExportLink data={rows} filename={filename} customHeaders={csvHeaders} text={text} />;
  };

  const giftRows = (rows: DonationInterface[], cols: "plate" | "ledger") => {
    if (!rows.length) {
      return (
        <TableRow>
          <TableCell colSpan={cols === "plate" ? 3 : isStaff ? 6 : 5}>No gifts in {cols === "plate" ? currentY : year}.</TableCell>
        </TableRow>
      );
    }
    return rows.map((d, i) => (
      <TableRow key={d.id || i}>
        {cols === "ledger" && isStaff && (
          <TableCell>
            {d.batchId ? <Link href={"/donations/" + d.batchId}>{Locale.label("donation.page.viewBatch")}</Link> : ""}
          </TableCell>
        )}
        <TableCell>{d.donationDate ? DateHelper.prettyDate(new Date(d.donationDate.split("T")[0] + "T00:00:00")) : ""}</TableCell>
        <TableCell>{d.fund?.name}</TableCell>
        {cols === "ledger" && <TableCell>{[d.method, d.methodDetails].filter(Boolean).join(" - ")}</TableCell>}
        {cols === "ledger" && <TableCell title={d.notes || ""}>{d.notes || ""}</TableCell>}
        <TableCell className="amt">{money(donationAmount(d))}</TableCell>
      </TableRow>
    ));
  };

  const openLog = () => {
    if (!isStaff && paymentGateways.length) setView("give");
    else setLogOpen(true);
  };

  const back = () => setView("plate");

  const plate = (
    <Box>
      <SectionTitle sx={{ mt: 0 }}>Giving</SectionTitle>
      {(!donations || donations.length === 0) && plateDonations.length === 0 ? (
        <>
          <Box sx={mutedSx}>{Locale.label("donation.page.willAppear") || "No gifts yet."}</Box>
          <VerbRow>
            {canLog && <Verb onClick={openLog}>Log a gift</Verb>}
            {paymentGateways.length > 0 && <Verb onClick={() => setView("give")}>Give</Verb>}
            <Verb onClick={() => setView("recurring")}>Recurring</Verb>
            <Verb onClick={() => setView("methods")}>Payment methods</Verb>
          </VerbRow>
        </>
      ) : (
        <>
          <Box sx={mutedSx}>{money(plateTotal)} this year · {recurringLine}</Box>
          <Table sx={plainTableSx}>
            <TableHead>
              <TableRow>
                <TableCell component="th">{Locale.label("donation.page.date")}</TableCell>
                <TableCell component="th">{Locale.label("donation.page.fund")}</TableCell>
                <TableCell component="th">{Locale.label("donation.page.amount")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{giftRows(plateDonations, "plate")}</TableBody>
          </Table>
          <VerbRow>
            {canLog && <Verb onClick={openLog}>Log a gift</Verb>}
            <Verb onClick={() => { setYear(currentY); setView("gifts"); }}>All years</Verb>
            {statementHref(currentY) && plateDonations.length > 0 && <Verb href={statementHref(currentY)}>Statement</Verb>}
            {paymentGateways.length > 0 && <Verb onClick={() => setView("give")}>Give</Verb>}
            <Verb onClick={() => setView("recurring")}>Recurring</Verb>
            <Verb onClick={() => setView("methods")}>Payment methods</Verb>
          </VerbRow>
        </>
      )}
    </Box>
  );

  const ledger = (
    <YearLedger
      title="Giving"
      big={money(yearTotal)}
      meta={`${yearDonations.length} gifts in ${year} · ${money(lifetime)} since ${years[years.length - 1] || year}`}
      action={canLog ? <Verb onClick={openLog}>Log a gift</Verb> : undefined}
      years={years}
      year={year}
      onYear={setYear}
      onBack={back}
      backLabel={personName || "Back"}>
      <Table sx={plainTableSx}>
        <TableHead>
          <TableRow>
            {isStaff && <TableCell component="th">{Locale.label("donation.page.batch")}</TableCell>}
            <TableCell component="th">{Locale.label("donation.page.date")}</TableCell>
            <TableCell component="th">{Locale.label("donation.page.fund")}</TableCell>
            <TableCell component="th">{Locale.label("donation.page.method")}</TableCell>
            <TableCell component="th">{Locale.label("donation.page.notes")}</TableCell>
            <TableCell component="th">{Locale.label("donation.page.amount")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{giftRows(yearDonations, "ledger")}</TableBody>
      </Table>
      <VerbRow>
        {statementHref(year) && yearDonations.length > 0 && <Verb href={statementHref(year)}>Statement</Verb>}
        {csvLink(yearDonations, `${year}_donations`, "CSV")}
        <Box component="span" sx={mutedSx}>this year</Box>
        <Verb onClick={() => setView("recurring")}>Recurring</Verb>
        <Verb onClick={() => setView("methods")}>Payment methods</Verb>
      </VerbRow>
    </YearLedger>
  );

  const archiveShell = (title: string, body: React.ReactNode) => (
    <Box>
      <Verb onClick={back}>← {personName || "Back"}</Verb>
      <SectionTitle>{title}</SectionTitle>
      {body}
    </Box>
  );

  const content = () => {
    if (!donations || !paymentMethods || !person) return <Loading />;
    switch (view) {
      case "gifts": return ledger;
      case "give": return archiveShell("Give", (
        <MultiGatewayDonationForm
          person={person}
          customerId={customerId || ""}
          paymentMethods={paymentMethods || []}
          paymentGateways={paymentGateways}
          donationSuccess={handleDataUpdate}
          church={props?.church}
          churchLogo={props?.churchLogo}
        />
      ));
      case "recurring": return archiveShell("Recurring", (
        <RecurringDonations customerId={customerId || ""} paymentMethods={paymentMethods} appName={appName} dataUpdate={handleDataUpdate} />
      ));
      case "methods": return archiveShell("Payment methods", (
        <PaymentMethods person={person} customerId={customerId || ""} paymentMethods={paymentMethods} appName={appName} dataUpdate={handleDataUpdate} />
      ));
      default: return plate;
    }
  };

  return (
    <>
      {paymentMethods && message && <Alert severity="success" sx={{ mb: 2 }}>{message}</Alert>}
      {content()}
      {logOpen && (
        <GiftLogSheet
          person={person}
          funds={funds}
          onClose={() => setLogOpen(false)}
          onSaved={() => handleDataUpdate()}
        />
      )}
    </>
  );
};
