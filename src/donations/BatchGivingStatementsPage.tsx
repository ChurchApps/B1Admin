import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Box, FormControl, InputLabel, Select, MenuItem, CircularProgress, Button } from "@mui/material";
import { Locale, CurrencyHelper, UserHelper, Permissions, ArrayHelper } from "@churchapps/apphelper";
import { type DonationInterface, type FundDonationInterface, type PersonInterface, type FundInterface } from "@churchapps/helpers";
import JSZip from "jszip";
import { Verb, VerbRow, SectionTitle, plateSx, mutedSx } from "./components/plate";

export const BatchGivingStatementsPage = () => {
  const navigate = useNavigate();
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
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

  const yearDonations = useMemo(() => {
    return (
      allDonations.data?.filter((don) => {
        if (!don.donationDate) return false;
        const donationDate = new Date(don.donationDate.toString().split("T")[0] + "T00:00:00");
        return donationDate.getFullYear() === selectedYear;
      }) || []
    );
  }, [allDonations.data, selectedYear]);

  const personIds = useMemo(() => {
    const ids = new Set<string>();
    yearDonations.forEach((donation) => {
      if (donation.personId) ids.add(donation.personId);
    });
    return Array.from(ids);
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

  const handlePrintAll = () => {
    window.location.href = `/donations/print-all?year=${selectedYear}`;
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();

    personIds.forEach((personId) => {
      const person = people.data?.find((p) => p.id === personId);
      const personDonations = yearDonations.filter((d) => d.personId === personId);

      const csvRows: string[] = [];
      csvRows.push("amount,donationDate,fundName,method,methodDetails");

      personDonations.forEach((donation) => {
        const fundDonationsForThisDonation = yearFundDonations.filter((fd) => fd.donationId === donation.id);

        fundDonationsForThisDonation.forEach((fd) => {
          const fund = ArrayHelper.getOne(funds.data || [], "id", fd.fundId);
          const amount = fd.amount || 0;
          const donationDate = donation.donationDate || "";
          const fundName = fund?.name || "";
          const method = donation.method || "";
          const methodDetails = donation.methodDetails || "";

          const escapeCsv = (value: any) => {
            const str = String(value);
            if (str.includes(",") || str.includes('"') || str.includes("\n")) {
              return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
          };

          csvRows.push(
            `${escapeCsv(amount)},${escapeCsv(donationDate)},${escapeCsv(fundName)},${escapeCsv(method)},${escapeCsv(methodDetails)}`
          );
        });
      });

      const lastName = person?.name?.last || "Unknown";
      const firstName = person?.name?.first || "Unknown";
      const filename = `${lastName}_${firstName}_${selectedYear}_donations.csv`.replace(/[^a-zA-Z0-9_.-]/g, "_");
      zip.file(filename, csvRows.join("\n"));
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `giving_statements_${selectedYear}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalDonors = personIds.length;
  const totalAmount = useMemo(() => {
    let total = 0;
    yearFundDonations.forEach((fd) => { total += fd.amount || 0; });
    return total;
  }, [yearFundDonations]);

  const totalDonations = yearDonations.length;
  const isLoading = allDonations.isLoading || allFundDonations.isLoading || (personIds.length > 0 && people.isLoading);
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => setCurrency(result));
  }, []);

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  return (
    <Box sx={plateSx}>
      <SectionTitle sx={{ mt: 0 }}>{Locale.label("donations.batchStatements.title")}</SectionTitle>
      <VerbRow>
        <Verb onClick={() => navigate("/settings#giving")} data-testid="statement-format-settings-link">{Locale.label("donations.batchStatements.statementFormat")}</Verb>
      </VerbRow>

      <SectionTitle>{Locale.label("donations.batchStatements.selectYear")}</SectionTitle>
      <FormControl sx={{ minWidth: 160, mt: 1 }}>
        <InputLabel>{Locale.label("donations.batchStatements.year")}</InputLabel>
        <Select
          value={selectedYear}
          label={Locale.label("donations.batchStatements.year")}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
        >
          {yearOptions.map((year) => (
            <MenuItem key={year} value={year}>{year}</MenuItem>
          ))}
        </Select>
      </FormControl>

      {isLoading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      ) : (
        <>
          <SectionTitle>{Locale.label("donations.batchStatements.summary")}</SectionTitle>
          <Box sx={mutedSx}>{Locale.label("donations.batchStatements.totalDonors")} {totalDonors}</Box>
          <Box sx={mutedSx}>{Locale.label("donations.batchStatements.totalDonations")} {totalDonations}</Box>
          <Box sx={mutedSx}>{Locale.label("donations.batchStatements.totalAmount")} {CurrencyHelper.formatCurrencyWithLocale(totalAmount, currency)}</Box>

          {totalDonors > 0 ? (
            <>
              <SectionTitle>{Locale.label("donations.batchStatements.downloadOptions")}</SectionTitle>
              <Box sx={{ ...mutedSx, mb: 1 } as object}>{Locale.label("donations.batchStatements.csvDescription")}</Box>
              <Button variant="contained" onClick={handleDownloadZip} sx={{ mb: 2 }}>
                {Locale.label("donations.batchStatements.downloadZip").replace("{count}", totalDonors.toString())}
              </Button>
              <Box sx={{ ...mutedSx, mb: 1 } as object}>{Locale.label("donations.batchStatements.printDescription")}</Box>
              <Button variant="outlined" onClick={handlePrintAll}>
                {Locale.label("donations.batchStatements.printAllStatements").replace("{count}", totalDonors.toString())}
              </Button>
            </>
          ) : (
            <Box sx={{ ...mutedSx, mt: 2 } as object}>{Locale.label("donations.batchStatements.noDonations").replace("{year}", selectedYear.toString())}</Box>
          )}
        </>
      )}
    </Box>
  );
};
