"use client";

import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { DisplayBox, ExportLink, Loading } from "@churchapps/apphelper";
import { DonationForm, MultiGatewayDonationForm, RecurringDonations, PaymentMethods, StripePaymentMethod as AppHelperStripePaymentMethod, DonationHelper } from "@churchapps/apphelper-donations";
import type { PaymentGateway } from "@churchapps/apphelper-donations";
import { ApiHelper, DateHelper, UniqueIdHelper, CurrencyHelper, Locale } from "../helpers";
import type { DonationInterface, PersonInterface, StripePaymentMethod, ChurchInterface } from "@churchapps/helpers";
// import { Link } from "react-router-dom"
import { Table, TableBody, TableRow, TableCell, TableHead, Alert, Button, Icon, Link, Menu, MenuItem } from "@mui/material";

interface Props {
  personId: string;
  appName?: string;
  church?: ChurchInterface;
  churchLogo?: string;
}

export const DonationPage: React.FC<Props> = (props) => {
  const [donations, setDonations] = React.useState<DonationInterface[]>(null);
  const [stripePromise, setStripe] = React.useState<Promise<Stripe>>(null);
  const [paymentMethods, setPaymentMethods] = React.useState<StripePaymentMethod[]>(null);
  const [appHelperPaymentMethods, setAppHelperPaymentMethods] = React.useState<AppHelperStripePaymentMethod[]>(null);
  const [paymentGateways, setPaymentGateways] = React.useState<PaymentGateway[]>([]);
  const [customerId, setCustomerId] = React.useState(null);
  const [person, setPerson] = React.useState<PersonInterface>(null);
  const [message, setMessage] = React.useState<string>(null);
  const [appName, setAppName] = React.useState<string>("");
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [currency, setCurrency] = React.useState<string>("usd");
  const open = Boolean(anchorEl);
  const hasKF = paymentGateways.some(g => DonationHelper.isProvider(g.provider, "kingdomfunding"));

  const handleClose = () => {
    setAnchorEl(null);
  };

  const loadPaymentMethods = async () => {
    try {
      const data = await ApiHelper.get("/paymentmethods/personid/" + props.personId, "GivingApi");
      if (!data.length) {
        setPaymentMethods([]);
        setAppHelperPaymentMethods([]);
        return;
      }

      // Handle both old nested format and new flat array format
      if (data[0]?.cards?.data || data[0]?.banks?.data) {
        const cards = data[0]?.cards?.data?.map((card: any) => new StripePaymentMethod(card)) || [];
        const banks = data[0]?.banks?.data?.map((bank: any) => new StripePaymentMethod(bank)) || [];
        setCustomerId(data[0]?.customer?.id);
        setPaymentMethods(cards.concat(banks));
        setAppHelperPaymentMethods(cards.concat(banks).map((pm: any) => new AppHelperStripePaymentMethod(pm)));
      } else {
        const methods: StripePaymentMethod[] = [];
        const appHelperMethods: AppHelperStripePaymentMethod[] = [];
        for (const pm of data) {
          if (pm.provider === "stripe" || pm.provider === "kingdomfunding") {
            methods.push(new StripePaymentMethod(pm));
            appHelperMethods.push(new AppHelperStripePaymentMethod(pm));
          }
          if (pm.customerId && !customerId) setCustomerId(pm.customerId);
        }
        setPaymentMethods(methods);
        setAppHelperPaymentMethods(appHelperMethods);
      }
    } catch (error) {
      console.error("Error loading payment methods:", error);
      setPaymentMethods([]);
      setAppHelperPaymentMethods([]);
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

  const loadStripeData = async (gatewayData: any) => {
    if (!gatewayData.length) {
      setPaymentMethods([]);
      setAppHelperPaymentMethods([]);
      return;
    }

    setPaymentGateways(gatewayData);
    const stripeGateway = DonationHelper.findGatewayByProvider(gatewayData, "stripe");
    if (stripeGateway?.publicKey) {
      setStripe(loadStripe(stripeGateway.publicKey));
    }
    await loadPaymentMethods();
  };

  const loadData = async () => {
    if (props?.appName) setAppName(props.appName);
    if (UniqueIdHelper.isMissing(props.personId)) return;

    try {
      const [donationsData, gatewaysData] = await Promise.all([ApiHelper.get("/donations?personId=" + props.personId, "GivingApi"), ApiHelper.get("/gateways", "GivingApi")]);

      setDonations(donationsData);
      await loadPersonData(); //moved this outside of loadStripeData to fix issue with person data not loading when there's no gateway data
      await loadStripeData(gatewaysData);
    } catch (error) {
      console.error("Error loading donation data:", error);
      setDonations([]);
      setPaymentMethods([]);
    }
  };

  const handleDataUpdate = (message?: string) => {
    setMessage(message);
    setPaymentMethods(null);
    loadData();
  };

  const getEditContent = () => {
    const result: React.ReactElement[] = [];
    const date = new Date();
    const currentY = date.getFullYear();
    const lastY = date.getFullYear() - 1;

    const current_year = donations.length > 0 ? donations.filter((d) => new Date((d.donationDate || "2000-01-01").split("T")[0] + "T00:00:00").getFullYear() === currentY) : [];
    const last_year = donations.length > 0 ? donations.filter((d) => new Date((d.donationDate || "2000-01-01").split("T")[0] + "T00:00:00").getFullYear() === lastY) : [];
    const customHeaders = [
      { label: "amount", key: "amount" },
      { label: "donationDate", key: "donationDate" },
      { label: "fundName", key: "fund.name" },
      { label: "method", key: "method" },
      { label: "methodDetails", key: "methodDetails" }
    ];

    if (current_year.length > 0 || last_year.length > 0) {
      result.push(
        <>
          <Button
            id="download-button"
            aria-controls={open ? "download-menu" : undefined}
            aria-haspopup="true"
            aria-expanded={open ? "true" : undefined}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
              setAnchorEl(e.currentTarget);
            }}>
            <Icon>download</Icon>
          </Button>
          <Menu id="download-menu" anchorEl={anchorEl} open={open} onClose={handleClose} MenuListProps={{ "aria-labelledby": "download-button" }}>
            {current_year.length > 0 && (
              <MenuItem onClick={handleClose} dense>
                <ExportLink data={current_year} filename="current_year_donations" customHeaders={customHeaders} text={Locale.label("donation.page.currentYearCsv")} icon="table_chart" />
              </MenuItem>
            )}
            {current_year.length > 0 && (
              <MenuItem onClick={handleClose} dense>
                <Link href={"/donations/print/" + person?.id + "?year=" + currentY}>
                  <Button>
                    <Icon>print</Icon> &nbsp; {Locale.label("donation.page.currentYearPrint")}
                  </Button>
                </Link>
              </MenuItem>
            )}
            {last_year.length > 0 && (
              <MenuItem onClick={handleClose} dense>
                <ExportLink data={last_year} filename="last_year_donations" customHeaders={customHeaders} text={Locale.label("donation.page.lastYearCsv")} icon="table_chart" />
              </MenuItem>
            )}
            {last_year.length > 0 && (
              <MenuItem onClick={handleClose} dense>
                <Link href={"/donations/print/" + person?.id + "?year=" + lastY}>
                  <Button>
                    <Icon>print</Icon> &nbsp; {Locale.label("donation.page.lastYearPrint")}
                  </Button>
                </Link>
              </MenuItem>
            )}
          </Menu>
        </>
      );
    }

    return result;
  };

  const getRows = () => {
    const rows: React.ReactElement[] = [];

    if (donations.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell>{Locale.label("donation.page.willAppear")}</TableCell>
        </TableRow>
      );
      return rows;
    }

    for (let i = 0; i < donations.length; i++) {
      const d = donations[i];
      rows.push(
        <TableRow key={i}>
          {appName !== "B1App" && (
            <TableCell>
              {d.batchId ? <Link href={"/donations/" + d.batchId}>{d.batchId}</Link> : ""}
            </TableCell>
          )}
          <TableCell>{d.donationDate ? DateHelper.prettyDate(new Date(d.donationDate.split("T")[0] + "T00:00:00")) : ""}</TableCell>
          <TableCell>
            {d.method} - {d.methodDetails}
          </TableCell>
          <TableCell>{d.fund.name}</TableCell>
          <TableCell>{CurrencyHelper.formatCurrencyWithLocale(d.fund.amount, currency)}</TableCell>
        </TableRow>
      );
    }
    return rows;
  };

  const getTableHeader = () => {
    const rows: React.ReactElement[] = [];

    if (donations.length > 0) {
      rows.push(
        <TableRow key="header" sx={{ textAlign: "left" }}>
          {appName !== "B1App" && <th>{Locale.label("donation.page.batch")}</th>}
          <th>{Locale.label("donation.page.date")}</th>
          <th>{Locale.label("donation.page.method")}</th>
          <th>{Locale.label("donation.page.fund")}</th>
          <th>{Locale.label("donation.page.amount")}</th>
        </TableRow>
      );
    }

    return rows;
  };

  React.useEffect(() => {
    loadData();
  }, [props.personId]);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  const getTable = () => {
    if (!donations) return <Loading />;
    else {
      return (
        <Table>
          <TableHead>{getTableHeader()}</TableHead>
          <TableBody>{getRows()}</TableBody>
        </Table>
      );
    }
  };

  const getPaymentMethodComponents = () => {
    if (!paymentMethods || !donations) return <Loading />;
    else {
      return (
        <>
          {hasKF ? (
            <MultiGatewayDonationForm
              person={person}
              customerId={customerId}
              paymentMethods={appHelperPaymentMethods || []}
              paymentGateways={paymentGateways}
              stripePromise={stripePromise}
              donationSuccess={handleDataUpdate}
              church={props?.church}
              churchLogo={props?.churchLogo}
            />
          ) : (
            <Elements stripe={stripePromise}>
              <DonationForm
                person={person}
                customerId={customerId}
                paymentMethods={paymentMethods}
                stripePromise={stripePromise}
                donationSuccess={handleDataUpdate}
                church={props?.church}
                churchLogo={props?.churchLogo}
              />
            </Elements>
          )}
          <DisplayBox headerIcon="payments" headerText={Locale.label("donation.donationPage.donations")} editContent={getEditContent()}>
            {getTable()}
          </DisplayBox>
          <RecurringDonations customerId={customerId} paymentMethods={appHelperPaymentMethods || paymentMethods || []} appName={appName} dataUpdate={handleDataUpdate} />
          <PaymentMethods person={person} customerId={customerId} paymentMethods={appHelperPaymentMethods || paymentMethods || []} appName={appName} stripePromise={stripePromise} dataUpdate={handleDataUpdate} />
        </>
      );
    }
  };

  return (
    <>
      {paymentMethods && message && <Alert severity="success">{message}</Alert>}
      {getPaymentMethodComponents()}
    </>
  );
};
