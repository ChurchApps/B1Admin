import React from "react";
import { ApiHelper, DateHelper, UserHelper, Permissions, UniqueIdHelper, ArrayHelper, Loading, CurrencyHelper, Locale, PageHeader } from "@churchapps/apphelper";
import { type DonationBatchInterface, type FundDonationInterface, type PersonInterface } from "@churchapps/helpers";
import { useParams, Link } from "react-router-dom";
import { Table, TableBody, TableRow, TableCell, TableHead, TextField, Box, Typography, Stack, Button } from "@mui/material";
import {
  VolunteerActivism as FundIcon,
  FilterAlt as FilterIcon,
  CalendarMonth as DateIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  AccountBalance as AccountBalanceIcon
} from "@mui/icons-material";
import { CardWithHeader, ExportButton, PageHeaderStats, hoverRowSx } from "../components/ui";

export const FundPage = () => {
  const params = useParams();
  const initialDate = new Date();
  initialDate.setDate(initialDate.getDate() - 7);

  const [fund, setFund] = React.useState<DonationBatchInterface>({});
  const [fundDonations, setFundDonations] = React.useState<FundDonationInterface[]>(null);
  const [startDate, setStartDate] = React.useState<Date>(initialDate);
  const [endDate, setEndDate] = React.useState<Date>(new Date());
  const [people, setPeople] = React.useState<{ [key: string]: string }>({});
  const [stats, setStats] = React.useState({
    totalDonations: 0,
    totalAmount: 0,
    uniqueDonors: 0
  });
  const [currency, setCurrency] = React.useState<string>("usd");
  // Hoisted to avoid compiler emitting non-optional guard reads on null fundDonations
  const donationList = fundDonations || [];

  const loadData = () => {
    ApiHelper.get("/funds/" + params.id, "GivingApi").then((data: any) => {
      setFund(data);
    });
    loadDonations();
  };

  const loadDonations = () => {
    ApiHelper.get("/funddonations?fundId=" + params.id + "&startDate=" + DateHelper.formatHtml5Date(startDate) + "&endDate=" + DateHelper.formatHtml5Date(endDate), "GivingApi").then(
      (d: FundDonationInterface[]) => {
        const peopleIds = ArrayHelper.getUniqueValues(d, "donation.personId").filter((f) => f !== null);
        if (peopleIds.length > 0) {
          ApiHelper.get("/people/ids?ids=" + peopleIds.join(","), "MembershipApi").then((people: PersonInterface[]) => {
            const data: any = {};
            people.forEach((p) => {
              data[p.id] = p.name?.display;
            });

            setPeople(data);
          });
        }
        setFundDonations(d);

        const totalDonations = d.length;
        const totalAmount = d.reduce((sum, fd) => sum + (fd.amount || 0), 0);
        const uniqueDonors = new Set(d.map((fd) => fd.donation?.personId).filter((id) => id)).size;

        setStats({
          totalDonations,
          totalAmount,
          uniqueDonors
        });
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    switch (e.target.name) {
      case "startDate": setStartDate(new Date(e.target.value)); break;
      case "endDate": setEndDate(new Date(e.target.value)); break;
    }
  };

  const getRows = () => {
    const result: JSX.Element[] = [];

    if (donationList.length === 0) {
      result.push(
        <TableRow key="0">
          <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
            <Stack spacing={2} alignItems="center">
              <FundIcon sx={{ fontSize: 48, color: "text.secondary" }} />
              <Typography variant="body1" color="text.secondary">
                {Locale.label("donations.fundsPage.noDon")}
              </Typography>
            </Stack>
          </TableCell>
        </TableRow>
      );
      return result;
    }

    for (let i = 0; i < donationList.length; i++) {
      const fd = donationList[i];
      const isAnonymous = UniqueIdHelper.isMissing(fd.donation?.personId);

      const personCol = isAnonymous ? (
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon sx={{ color: "text.secondary", fontSize: 18 }} />
            <Typography variant="body2" color="text.secondary">
              {Locale.label("donations.fundsPage.anon")}
            </Typography>
          </Stack>
        </TableCell>
      ) : (
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <PersonIcon sx={{ color: "text.secondary", fontSize: 18 }} />
            <Typography component={Link} to={"/people/" + fd.donation?.personId} variant="body2" sx={{ textDecoration: "none", color: "var(--link)", fontWeight: 500 }}>
              {people[fd.donation.personId] || Locale.label("donations.fundsPage.anon")}
            </Typography>
          </Stack>
        </TableCell>
      );

      result.push(
        <TableRow key={i} sx={hoverRowSx}>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <DateIcon sx={{ color: "text.secondary", fontSize: 18 }} />
              <Typography variant="body2">{DateHelper.formatHtml5Date(fd.donation.donationDate)}</Typography>
            </Stack>
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <ReceiptIcon sx={{ color: "text.secondary", fontSize: 18 }} />
              <Typography component={Link} data-cy={`batchId-${fd.donation.batchId}-${i}`} to={"/donations/" + fd.donation.batchId} variant="body2" sx={{ textDecoration: "none", color: "var(--link)", fontWeight: 500 }}>
                {fd.donation.batchId}
              </Typography>
            </Stack>
          </TableCell>
          {personCol}
          <TableCell align="right">
            <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
              {CurrencyHelper.formatCurrencyWithLocale(fd.amount, currency)}
            </Typography>
          </TableCell>
        </TableRow>
      );
    }
    return result;
  };

  const getTableHeader = () => {
    const rows: JSX.Element[] = [];

    if (donationList.length === 0) {
      return rows;
    }

    rows.push(
      <TableRow key="header">
        <TableCell>{Locale.label("donations.fundsPage.date")}</TableCell>
        <TableCell>{Locale.label("donations.fundsPage.batch")}</TableCell>
        <TableCell>{Locale.label("donations.fundsPage.donor")}</TableCell>
        <TableCell align="right">{Locale.label("donations.fundsPage.amt")}</TableCell>
      </TableRow>
    );
    return rows;
  };

  React.useEffect(loadData, [params.id]);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  const getTable = () => {
    if (!fundDonations) return <Loading />;
    return (
      <Table sx={{ minWidth: 650 }}>
        <TableHead>{getTableHeader()}</TableHead>
        <TableBody>{getRows()}</TableBody>
      </Table>
    );
  };

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.view)) return <></>;

  return (
    <>
      <PageHeader
        icon={<AccountBalanceIcon />}
        title={`${fund.name} ${Locale.label("donations.fundsPage.don")}`}
        subtitle={Locale.label("donations.fundPage.subtitle")}
      >
        {stats.totalDonations > 0 && (
          <PageHeaderStats
            spread
            items={[
              { icon: <ReceiptIcon sx={{ color: "#FFF", fontSize: 24 }} />, value: stats.totalDonations, label: "Donations", minWidth: 80 },
              { icon: <PersonIcon sx={{ color: "#FFF", fontSize: 24 }} />, value: stats.uniqueDonors, label: Locale.label("donations.fundPage.donors"), minWidth: 80 },
              { value: CurrencyHelper.formatCurrencyWithLocale(stats.totalAmount, currency, 0), label: Locale.label("donations.fundPage.totalAmount") }
            ]}
          />
        )}
      </PageHeader>

      <Box sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <CardWithHeader
            icon={<FilterIcon sx={{ color: "primary.main", fontSize: 20 }} />}
            title={Locale.label("donations.fundsPage.donFilt")}
          >
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
              <TextField
                label={Locale.label("donations.fundsPage.dateStart")}
                name="startDate"
                type="date"
                data-cy="start-date"
                value={DateHelper.formatHtml5Date(startDate)}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 200 }}
              />
              <TextField
                label={Locale.label("donations.fundsPage.dateEnd")}
                name="endDate"
                type="date"
                data-cy="end-date"
                value={DateHelper.formatHtml5Date(endDate)}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 200 }}
              />
              <Button variant="contained" onClick={loadDonations} startIcon={<FilterIcon />} sx={{ minWidth: 120 }}>
                {Locale.label("donations.fundPage.filter")}
              </Button>
            </Stack>
          </CardWithHeader>
        </Box>

        <CardWithHeader
          icon={<FundIcon sx={{ color: "primary.main", fontSize: 20 }} />}
          title={Locale.label("donations.fundsPage.don")}
          count={fundDonations?.length}
          actions={fundDonations && <ExportButton data={fundDonations} filename="funddonations.csv" text={Locale.label("donations.fundsPage.export")} />}
        >
          {getTable()}
        </CardWithHeader>
      </Box>
    </>
  );
};
