import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Box, Container, Card, CardContent, Typography, Button, FormControl,
  InputLabel, Select, MenuItem, Alert, CircularProgress, Stack, Divider
} from "@mui/material";
import {
  DownloadOutlined as DownloadIcon,
  PrintOutlined as PrintIcon,
  Receipt as ReceiptIcon,
  SettingsOutlined as SettingsIcon
} from "@mui/icons-material";
import { PageHeader, Locale, CurrencyHelper, UserHelper, Permissions, ArrayHelper } from "@churchapps/apphelper";
import { type DonationInterface, type FundDonationInterface, type PersonInterface, type FundInterface } from "@churchapps/helpers";
import JSZip from "jszip";
import { EmptyState } from "../components/ui/EmptyState";
import { HeaderSecondaryButton } from "../components/ui";

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
      if (donation.personId) {
        ids.add(donation.personId);
      }
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
    const url = `/donations/print-all?year=${selectedYear}`;
    window.location.href = url;
  };

  const handleDownloadZip = async () => {
    const zip = new JSZip();

    personIds.forEach((personId) => {
      const person = people.data?.find((p) => p.id === personId);
      const personDonations = yearDonations.filter((d) => d.personId === personId);

      const csvRows: string[] = [];
      csvRows.push("amount,donationDate,fundName,method,methodDetails"); // Header

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

      const csvContent = csvRows.join("\n");
      const lastName = person?.name?.last || "Unknown";
      const firstName = person?.name?.first || "Unknown";
      const filename = `${lastName}_${firstName}_${selectedYear}_donations.csv`.replace(/[^a-zA-Z0-9_.-]/g, "_");

      zip.file(filename, csvContent);
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
    yearFundDonations.forEach((fd) => {
      total += fd.amount || 0;
    });
    return total;
  }, [yearFundDonations]);

  const totalDonations = yearDonations.length;

  const isLoading = allDonations.isLoading || allFundDonations.isLoading || (personIds.length > 0 && people.isLoading);

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      setCurrency(result);
    });
  }, []);

  if (!UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary)) return <></>;

  return (
    <>
      <PageHeader
        icon={<ReceiptIcon />}
        title={Locale.label("donations.batchStatements.title")}
        subtitle={Locale.label("donations.batchStatements.subtitle")}
      >
        <HeaderSecondaryButton
          startIcon={<SettingsIcon />}
          onClick={() => navigate("/settings#giving")}
          data-testid="statement-format-settings-link">
          {Locale.label("donations.batchStatements.statementFormat")}
        </HeaderSecondaryButton>
      </PageHeader>

      <Container maxWidth="lg">
        <Box sx={{ py: 3 }}>
          <Card elevation={2} sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {Locale.label("donations.batchStatements.selectYear")}
              </Typography>
              <FormControl fullWidth sx={{ mt: 2 }}>
                <InputLabel>{Locale.label("donations.batchStatements.year")}</InputLabel>
                <Select
                  value={selectedYear}
                  label={Locale.label("donations.batchStatements.year")}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {yearOptions.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </CardContent>
          </Card>

          {isLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <>
              <Card elevation={2} sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {Locale.label("donations.batchStatements.summary")}
                  </Typography>
                  <Divider sx={{ my: 2 }} />
                  <Stack spacing={2}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body1" color="text.secondary">
                        {Locale.label("donations.batchStatements.totalDonors")}
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {totalDonors}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body1" color="text.secondary">
                        {Locale.label("donations.batchStatements.totalDonations")}
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {totalDonations}
                      </Typography>
                    </Box>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body1" color="text.secondary">
                        {Locale.label("donations.batchStatements.totalAmount")}
                      </Typography>
                      <Typography variant="body1" fontWeight="bold" color="primary">
                        {CurrencyHelper.formatCurrencyWithLocale(totalAmount, currency)}
                      </Typography>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>

              {totalDonors > 0 ? (
                <Card elevation={2}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {Locale.label("donations.batchStatements.downloadOptions")}
                    </Typography>
                    <Divider sx={{ my: 2 }} />

                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle1" gutterBottom>
                          {Locale.label("donations.batchStatements.csvDownload")}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {Locale.label("donations.batchStatements.csvDescription")}
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<DownloadIcon />}
                          onClick={handleDownloadZip}
                          fullWidth
                        >
                          {Locale.label("donations.batchStatements.downloadZip").replace("{count}", totalDonors.toString())}
                        </Button>
                        <Alert severity="info" sx={{ mt: 2 }}>
                          {Locale.label("donations.batchStatements.zipInfo").replace("{count}", totalDonors.toString())}
                        </Alert>
                      </Box>

                      <Divider />

                      <Box>
                        <Typography variant="subtitle1" gutterBottom>
                          {Locale.label("donations.batchStatements.printStatements")}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {Locale.label("donations.batchStatements.printDescription")}
                        </Typography>
                        <Button
                          variant="outlined"
                          startIcon={<PrintIcon />}
                          onClick={handlePrintAll}
                          fullWidth
                        >
                          {Locale.label("donations.batchStatements.printAllStatements").replace("{count}", totalDonors.toString())}
                        </Button>
                        <Alert severity="info" sx={{ mt: 2 }}>
                          {Locale.label("donations.batchStatements.printAllInfo").replace("{count}", totalDonors.toString())}
                        </Alert>
                      </Box>
                    </Stack>
                  </CardContent>
                </Card>
              ) : (
                <EmptyState
                  icon={<ReceiptIcon />}
                  title={Locale.label("donations.batchStatements.noDonations").replace("{year}", selectedYear.toString())}
                />
              )}
            </>
          )}
        </Box>
      </Container>
    </>
  );
};
