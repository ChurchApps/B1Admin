import React from "react";
import { ApiHelper, DateHelper, Permissions, UniqueIdHelper, ArrayHelper, Loading, CurrencyHelper, Locale } from "@churchapps/apphelper";
import { type DonationBatchInterface, type FundDonationInterface, type PersonInterface } from "@churchapps/helpers";
import { useParams, Link } from "react-router-dom";
import { Table, TableBody, TableRow, TableCell, TableHead, Box } from "@mui/material";
import { VolunteerActivism as FundIcon } from "@mui/icons-material";
import { EmptyState, ExportButton, hoverRowSx } from "../components/ui";
import { AppDatePicker } from "../components";
import { useRequirePermission } from "../hooks";
import { Verb, VerbRow, SectionTitle, YearPills, plateSx, plainTableSx, mutedSx, recentYears } from "./components/plate";

export const FundPage = () => {
  const params = useParams();
  const thisYear = new Date().getFullYear();
  const [fund, setFund] = React.useState<DonationBatchInterface>({});
  const [fundDonations, setFundDonations] = React.useState<FundDonationInterface[] | null>(null);
  const [startDate, setStartDate] = React.useState<Date>(new Date(thisYear, 0, 1));
  const [endDate, setEndDate] = React.useState<Date>(new Date());
  const [people, setPeople] = React.useState<{ [key: string]: string }>({});
  const [currency, setCurrency] = React.useState<string>("usd");
  const [year, setYear] = React.useState(thisYear);
  const donationList = fundDonations || [];

  const loadData = () => {
    ApiHelper.get("/funds/" + params.id, "GivingApi").then((data: any) => setFund(data));
    loadDonations();
  };

  const loadDonations = (start = startDate, end = endDate) => {
    ApiHelper.get("/funddonations?fundId=" + params.id + "&startDate=" + DateHelper.formatHtml5Date(start) + "&endDate=" + DateHelper.formatHtml5Date(end), "GivingApi").then(
      (d: FundDonationInterface[]) => {
        const peopleIds = ArrayHelper.getUniqueValues(d, "donation.personId").filter((f) => f !== null);
        if (peopleIds.length > 0) {
          ApiHelper.get("/people/ids?ids=" + peopleIds.join(","), "MembershipApi").then((peopleData: PersonInterface[]) => {
            const data: any = {};
            peopleData.forEach((p) => {
              if (p.id) data[p.id] = p.name?.display;
            });
            setPeople(data);
          });
        }
        setFundDonations(d);
      }
    );
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    switch (e.target.name) {
      case "startDate": setStartDate(new Date(e.target.value)); break;
      case "endDate": setEndDate(new Date(e.target.value)); break;
    }
  };

  const selectYear = (y: number) => {
    setYear(y);
    const start = new Date(y, 0, 1);
    const end = y === thisYear ? new Date() : new Date(y, 11, 31);
    setStartDate(start);
    setEndDate(end);
    loadDonations(start, end);
  };

  React.useEffect(loadData, [params.id]);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => setCurrency(result));
  }, []);

  const years = recentYears(10, thisYear);
  const plateYear = year;
  const totalAmount = donationList.reduce((sum, fd) => sum + (fd.amount || 0), 0);
  const uniqueDonors = new Set(donationList.map((fd) => fd.donation?.personId).filter((id) => id)).size;

  const denied = useRequirePermission(Permissions.givingApi.donations.view);
  if (denied) return denied;

  const rows = () => {
    if (donationList.length === 0) {
      return (
        <TableRow key="0">
          <EmptyState variant="table" colSpan={4} icon={<FundIcon />} title={Locale.label("donations.fundsPage.noDon")} />
        </TableRow>
      );
    }
    return donationList.map((fd, i) => {
      const isAnonymous = UniqueIdHelper.isMissing(fd.donation?.personId);
      return (
        <TableRow key={i} sx={hoverRowSx}>
          <TableCell>{DateHelper.formatHtml5Date(fd.donation?.donationDate)}</TableCell>
          <TableCell>
            <Box component={Link} data-cy={`batchId-${fd.donation?.batchId}-${i}`} to={"/donations/" + fd.donation?.batchId} sx={{ textDecoration: "none", color: "var(--c1)", fontWeight: 500 }}>
              {Locale.label("donations.fundsPage.viewBatch")}
            </Box>
          </TableCell>
          <TableCell>
            {isAnonymous
              ? Locale.label("donations.fundsPage.anon")
              : (
                <Box component={Link} to={"/people/" + fd.donation?.personId} sx={{ textDecoration: "none", color: "var(--c1)", fontWeight: 500 }}>
                  {people[fd.donation?.personId || ""] || Locale.label("donations.fundsPage.anon")}
                </Box>
              )}
          </TableCell>
          <TableCell className="amt">{CurrencyHelper.formatCurrencyWithLocale(fd.amount || 0, currency)}</TableCell>
        </TableRow>
      );
    });
  };

  return (
    <Box sx={plateSx}>
      <SectionTitle sx={{ mt: 0 }}>{fund.name || Locale.label("donations.donations.funds")}</SectionTitle>
      <Box sx={mutedSx}>
        {donationList.length} {Locale.label("donations.fundsPage.don")?.toLowerCase() || "gifts"} · {uniqueDonors} {Locale.label("donations.fundPage.donors")?.toLowerCase() || "donors"} · {CurrencyHelper.formatCurrencyWithLocale(totalAmount, currency, 0)}
      </Box>
      <YearPills years={years} value={plateYear} onChange={selectYear} />
      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", mb: 2 }}>
        <AppDatePicker
          label={Locale.label("donations.fundsPage.dateStart")}
          name="startDate"
          data-cy="start-date"
          value={DateHelper.formatHtml5Date(startDate)}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <AppDatePicker
          label={Locale.label("donations.fundsPage.dateEnd")}
          name="endDate"
          data-cy="end-date"
          value={DateHelper.formatHtml5Date(endDate)}
          onChange={handleChange}
          InputLabelProps={{ shrink: true }}
          sx={{ minWidth: 160 }}
        />
        <Verb onClick={() => loadDonations()}>{Locale.label("donations.fundPage.filter")}</Verb>
      </Box>
      {fundDonations && <VerbRow>{<ExportButton data={fundDonations} filename="funddonations.csv" text={Locale.label("donations.fundsPage.export")} />}</VerbRow>}
      {!fundDonations ? <Loading /> : (
        <Table sx={plainTableSx}>
          {donationList.length > 0 && (
            <TableHead>
              <TableRow>
                <TableCell component="th">{Locale.label("donations.fundsPage.date")}</TableCell>
                <TableCell component="th">{Locale.label("donations.fundsPage.batch")}</TableCell>
                <TableCell component="th">{Locale.label("donations.fundsPage.donor")}</TableCell>
                <TableCell component="th">{Locale.label("donations.fundsPage.amt")}</TableCell>
              </TableRow>
            </TableHead>
          )}
          <TableBody>{rows()}</TableBody>
        </Table>
      )}
    </Box>
  );
};
