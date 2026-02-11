"use client";

import React from "react";
import { loadStripe } from "@stripe/stripe-js";
import type { Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import { DisplayBox, ExportLink, Loading } from "@churchapps/apphelper";
import { DonationForm, RecurringDonations, PaymentMethods } from "@churchapps/apphelper-donations";
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
  const [customerId, setCustomerId] = React.useState(null);
  const [person, setPerson] = React.useState<PersonInterface>(null);
  const [message, setMessage] = React.useState<string>(null);
  const [appName, setAppName] = React.useState<string>("");
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleClose = () => {
    setAnchorEl(null);
  };

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
        const cards = data[0]?.cards?.data?.map((card: any) => new StripePaymentMethod(card)) || [];
        const banks = data[0]?.banks?.data?.map((bank: any) => new StripePaymentMethod(bank)) || [];
        setCustomerId(data[0]?.customer?.id);
        setPaymentMethods(cards.concat(banks));
      } else {
        // New flat array format from normalized API response
        const methods = data.map((pm: any) => new StripePaymentMethod(pm));
        // Get customerId from first payment method if available
        const firstMethod = data[0];
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

  const loadStripeData = async (gatewayData: any) => {
    if (!gatewayData.length || !gatewayData[0]?.publicKey) {
      setPaymentMethods([]);
      return;
    }

    setStripe(loadStripe(gatewayData[0].publicKey));
    await Promise.all([
      // loadPersonData(),
      loadPaymentMethods()
    ]);
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
          <TableCell>{CurrencyHelper.formatCurrency(d.fund.amount)}</TableCell>
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
          <DisplayBox headerIcon="payments" headerText={Locale.label("donation.donationPage.donations")} editContent={getEditContent()}>
            {getTable()}
          </DisplayBox>
          <RecurringDonations customerId={customerId} paymentMethods={paymentMethods} appName={appName} dataUpdate={handleDataUpdate} />
          <PaymentMethods person={person} customerId={customerId} paymentMethods={paymentMethods} appName={appName} stripePromise={stripePromise} dataUpdate={handleDataUpdate} />
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
