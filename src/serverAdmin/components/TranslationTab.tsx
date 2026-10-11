import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import React from "react";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";
import { AppDatePicker } from "../../components";
import { numericCellSx, tableScrollSx } from "../../components/ui";
import { AdminPanel } from "./AdminPanel";

export const TranslationTab = () => {
  const [startDate, setStartDate] = React.useState(new Date());
  const [endDate, setEndDate] = React.useState(new Date());
  const [report, setReport] = React.useState([]);

  const loadData = async () => {
    const reportData = await ApiHelper.get("/bibles/stats?startDate=" + DateHelper.formatHtml5Date(startDate) + "&endDate=" + DateHelper.formatHtml5Date(endDate), "ContentApi");
    setReport(reportData);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    switch (e.target.name) {
      case "start": if (value) setStartDate(DateHelper.toDate(value)); break;
      case "end": if (value) setEndDate(DateHelper.toDate(value)); break;
    }
  };

  const getTableHeader = () => {
    const rows: JSX.Element[] = [];
    rows.push(
      <TableRow key="header">
        <TableCell>{Locale.label("serverAdmin.translation.abbreviations")}</TableCell>
        <TableCell sx={numericCellSx}>{Locale.label("serverAdmin.translation.lookups")}</TableCell>
      </TableRow>
    );
    return rows;
  };

  const getRows = () => {
    const rows: JSX.Element[] = [];
    let keyVal = 0;

    report.forEach((r: any) => {
      rows.push(
        <TableRow key={keyVal.toString()}>
          <TableCell>{r.abbreviation}</TableCell>
          <TableCell sx={numericCellSx}>{r.lookups}</TableCell>
        </TableRow>
      );
      keyVal += 1;
    });
    return rows;
  };

  const getTable = () => {
    if (report.length == 0) {
      return;
    } else {
      return (
        <Box sx={tableScrollSx} role="region" aria-label={Locale.label("serverAdmin.translation.title")} tabIndex={0}>
          <Table>
            <TableHead>{getTableHeader()}</TableHead>
            <TableBody sx={{ whiteSpace: "nowrap" }}>{getRows()}</TableBody>
          </Table>
        </Box>
      );
    }
  };

  return (
    <>
      <AdminPanel headerText={Locale.label("serverAdmin.translation.title")} subtitle={Locale.label("serverAdmin.adminPage.translationSubtitle")}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} useFlexGap flexWrap="wrap" sx={{ mb: 3 }}>
          <AppDatePicker
            id="start"
            name="start"
            label={Locale.label("serverAdmin.translation.startDate")}
            value={DateHelper.formatHtml5Date(startDate)}
            onChange={handleChange}
            data-testid="translation-start-date-input"
            aria-label="Start date"
          />
          <AppDatePicker id="end" name="end" label={Locale.label("serverAdmin.translation.endDate")} value={DateHelper.formatHtml5Date(endDate)} onChange={handleChange} data-testid="translation-end-date-input" aria-label="End date" />
          <Button variant="contained" startIcon={<ManageSearchIcon />} onClick={loadData} data-testid="search-translation-stats-button" aria-label={Locale.label("serverAdmin.translationTab.searchTranslationStatsAria")}>
            {Locale.label("serverAdmin.translation.search")}
          </Button>
        </Stack>
        {getTable()}
      </AdminPanel>
    </>
  );
};
