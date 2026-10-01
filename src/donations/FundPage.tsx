import React from "react";
import { ApiHelper, DateHelper, Permissions, UniqueIdHelper, ArrayHelper, Loading, CurrencyHelper, Locale } from "@churchapps/apphelper";
import { type DonationBatchInterface, type FundDonationInterface, type PersonInterface } from "@churchapps/helpers";
import { useParams, Link } from "react-router-dom";
import { Table, TableBody, TableRow, TableCell, TableHead, Box, Button, Typography, Stack } from "@mui/material";
import { PageHeader, PageContainer, Breadcrumbs, type BreadcrumbItem, RecordHeading, Surface, VerbRow, YearPills, hoverRowSx, numericCellSx, recentYears, tableScrollSx } from "../components/ui";
import { CsvVerb } from "./components/GivingParts";
import { AppDatePicker } from "../components";
import { useRequirePermission } from "../hooks";

export const FundPage = () => {
  const params = useParams();
  const thisYear = new Date().getFullYear();

  const [fund, setFund] = React.useState<DonationBatchInterface>({});
  const [fundDonations, setFundDonations] = React.useState<FundDonationInterface[] | null>(null);
  const [year, setYear] = React.useState<number | null>(thisYear);
  const [startDate, setStartDate] = React.useState<Date>(new Date(thisYear, 0, 1));
  const [endDate, setEndDate] = React.useState<Date>(new Date(thisYear, 11, 31));
  const [people, setPeople] = React.useState<{ [key: string]: string }>({});
  const [stats, setStats] = React.useState({
    totalDonations: 0,
    totalAmount: 0,
    uniqueDonors: 0
  });
  const [isConverted, setIsConverted] = React.useState(false);
  const [period, setPeriod] = React.useState("");
  const [currency, setCurrency] = React.useState<string>("usd");
  // Hoisted to avoid compiler emitting non-optional guard reads on null fundDonations
  const donationList = fundDonations || [];

  const loadData = () => {
    ApiHelper.get("/funds/" + params.id, "GivingApi").then((data: any) => {
      setFund(data);
    });
    loadDonations();
  };

  const loadDonations = (start: Date = startDate, end: Date = endDate) => {
    const dateFilter = "&startDate=" + DateHelper.formatHtml5Date(start) + "&endDate=" + DateHelper.formatHtml5Date(end);
    setPeriod(DateHelper.formatHtml5Date(start) + " - " + DateHelper.formatHtml5Date(end));
    // Gifts can be in different currencies, so the Api totals them in the church currency with its own exchange rates.
    ApiHelper.get("/funddonations/totals?fundId=" + params.id + dateFilter, "GivingApi").then((totals: { totalAmount: number; isConverted: boolean }) => {
      setStats((prev) => ({ ...prev, totalAmount: totals?.totalAmount || 0 }));
      setIsConverted(!!totals?.isConverted);
    });
    ApiHelper.get("/funddonations?fundId=" + params.id + dateFilter, "GivingApi").then(
      (d: FundDonationInterface[]) => {
        const peopleIds = ArrayHelper.getUniqueValues(d, "donation.personId").filter((f) => f !== null);
        if (peopleIds.length > 0) {
          ApiHelper.get("/people/ids?ids=" + peopleIds.join(","), "MembershipApi").then((people: PersonInterface[]) => {
            const data: any = {};
            people.forEach((p) => {
              if (p.id) data[p.id] = p.name?.display;
            });

            setPeople(data);
          });
        }
        setFundDonations(d);

        const totalDonations = d.length;
        const uniqueDonors = new Set(d.map((fd) => fd.donation?.personId).filter((id) => id)).size;

        setStats((prev) => ({ ...prev, totalDonations, uniqueDonors }));
      }
    );
  };

  const handleYear = (y: number | null) => {
    if (y === null) return;
    const start = new Date(y, 0, 1);
    const end = new Date(y, 11, 31);
    setYear(y);
    setStartDate(start);
    setEndDate(end);
    loadDonations(start, end);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setYear(null);
    switch (e.target.name) {
      case "startDate": setStartDate(new Date(e.target.value + "T00:00:00")); break;
      case "endDate": setEndDate(new Date(e.target.value + "T00:00:00")); break;
    }
  };

  const getRows = () => {
    const result: JSX.Element[] = [];

    if (donationList.length === 0) {
      result.push(
        <TableRow key="0">
          <TableCell colSpan={4} sx={{ borderBottom: 0, px: 0 }}>
            <Typography variant="body1" color="text.secondary">
              {Locale.label("donations.fundsPage.noDon")}
            </Typography>
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
          <Typography variant="body2" color="text.secondary">
            {Locale.label("donations.fundsPage.anon")}
          </Typography>
        </TableCell>
      ) : (
        <TableCell>
          <Typography component={Link} to={"/people/" + fd.donation?.personId} variant="body2" sx={{ textDecoration: "none", color: "primary.main", fontWeight: 600 }}>
            {people[fd.donation?.personId || ""] || Locale.label("donations.fundsPage.anon")}
          </Typography>
        </TableCell>
      );

      result.push(
        <TableRow key={i} sx={hoverRowSx}>
          <TableCell>
            <Typography variant="body2">{DateHelper.formatHtml5Date(fd.donation?.donationDate)}</Typography>
          </TableCell>
          <TableCell>
            <Typography component={Link} data-cy={`batchId-${fd.donation?.batchId}-${i}`} to={"/donations/batches/" + fd.donation?.batchId} variant="body2" sx={{ textDecoration: "none", color: "primary.main", fontWeight: 600 }}>
              {Locale.label("donations.fundsPage.viewBatch")}
            </Typography>
          </TableCell>
          {personCol}
          <TableCell align="right" sx={numericCellSx}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {CurrencyHelper.formatCurrencyWithLocale(fd.amount || 0, fd.donation?.currency || currency)}
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
        <TableCell align="right" sx={numericCellSx}>{Locale.label("donations.fundsPage.amt")}</TableCell>
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
      <Box sx={tableScrollSx} role="region" aria-label={Locale.label("donations.fundsPage.don")} tabIndex={0}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>{getTableHeader()}</TableHead>
          <TableBody>{getRows()}</TableBody>
        </Table>
      </Box>
    );
  };

  const denied = useRequirePermission(Permissions.givingApi.donations.view);
  if (denied) return denied;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: Locale.label("components.wrapper.don"), path: "/donations" },
    { label: Locale.label("donations.donations.funds"), path: "/donations/funds" },
    { label: fund.name || "" }
  ];

  const lede = stats.totalDonations > 0 ? (
    <>
      {Locale.label("donations.fundPage.giftCount", "{count} gifts").replace("{count}", stats.totalDonations.toString())}
      {" · "}
      {Locale.label("donations.fundPage.donorCount", "{count} donors").replace("{count}", stats.uniqueDonors.toString())}
      {" · "}
      <span data-testid="fund-total-amount">{CurrencyHelper.formatCurrencyWithLocale(stats.totalAmount, currency, 0)}</span>
      {" (" + period + ")"}
      {isConverted && " · " + Locale.label("donations.donations.convertedNote")}
    </>
  ) : Locale.label("donations.fundPage.subtitle");

  return (
    <>
      <PageHeader
        title={`${fund.name || ""} ${Locale.label("donations.fundsPage.don")}`}
        subtitle={lede}
        breadcrumbs={<Breadcrumbs items={breadcrumbItems} showHome={true} />}
      />

      <PageContainer>
        <Surface>
          <Stack spacing={2} sx={{ mb: 3 }}>
            <YearPills years={recentYears(10)} value={year} onChange={handleYear} />
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }}>
              <AppDatePicker
                label={Locale.label("donations.fundsPage.dateStart")}
                name="startDate"
                data-cy="start-date"
                value={DateHelper.formatHtml5Date(startDate)}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 200 }}
              />
              <AppDatePicker
                label={Locale.label("donations.fundsPage.dateEnd")}
                name="endDate"
                data-cy="end-date"
                value={DateHelper.formatHtml5Date(endDate)}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 200 }}
              />
              <Box><Button variant="outlined" onClick={() => loadDonations()}>{Locale.label("donations.fundPage.filter")}</Button></Box>
            </Stack>
          </Stack>

          <RecordHeading label={Locale.label("donations.fundsPage.don") + (fundDonations ? " (" + fundDonations.length + ")" : "")}>
            <VerbRow>
              {donationList.length > 0 && <CsvVerb data={donationList} filename="funddonations.csv" text={Locale.label("donations.fundsPage.export")} />}
            </VerbRow>
          </RecordHeading>
          {getTable()}
        </Surface>
      </PageContainer>
    </>
  );
};
