import { ApiHelper, DateHelper, DisplayBox, Locale } from "@churchapps/apphelper";
import { Button, Grid, Paper, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material";
import React from "react";
import ManageSearchIcon from "@mui/icons-material/ManageSearch";

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
      case "start": setStartDate(new Date(value)); break;
      case "end": setEndDate(new Date(value)); break;
    }
  };

  const getTableHeader = () => {
    const rows: JSX.Element[] = [];
    rows.push(
      <TableRow sx={{ textAlign: "left" }} key="header">
        <th>{Locale.label("serverAdmin.translation.abbreviations")}</th>
        <th>{Locale.label("serverAdmin.translation.lookups")}</th>
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
          <TableCell>{r.lookups}</TableCell>
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
        <Paper sx={{ width: "100%", overflowX: "auto" }}>
          <Table size="small">
            <TableHead>{getTableHeader()}</TableHead>
            <TableBody sx={{ whiteSpace: "nowrap" }}>{getRows()}</TableBody>
          </Table>
        </Paper>
      );
    }
  };

  return (
    <>
      <DisplayBox headerIcon="summarize" headerText={Locale.label("serverAdmin.translation.title")}>
        <div>
          <div style={{ fontSize: 18, marginBottom: 15 }}>
            <Grid container alignItems="center">
              <Grid size={{ md: 1 }}>
                <p>{Locale.label("serverAdmin.translation.startDate")}</p>
              </Grid>
              <Grid size={{ md: 3 }}>
                <TextField
                  id="start"
                  name="start"
                  value={DateHelper.formatHtml5Date(startDate)}
                  type="date"
                  onChange={handleChange}
                  data-testid="translation-start-date-input"
                  aria-label="Start date"
                />
              </Grid>
              <Grid size={{ md: 1 }}>
                <p>{Locale.label("serverAdmin.translation.endDate")}</p>
              </Grid>
              <Grid size={{ md: 3 }}>
                <TextField id="end" name="end" value={DateHelper.formatHtml5Date(endDate)} type="date" onChange={handleChange} data-testid="translation-end-date-input" aria-label="End date" />
              </Grid>
              <Grid size={{ md: 1 }}>
                <Button variant="outlined" style={{ height: 56, width: 200, marginTop: 8 }} onClick={loadData} data-testid="search-translation-stats-button" aria-label="Search translation statistics">
                  <ManageSearchIcon fontSize="small" />
                  &nbsp;{Locale.label("serverAdmin.translation.search")}
                </Button>
              </Grid>
            </Grid>
          </div>
          {getTable()}
        </div>
      </DisplayBox>
    </>
  );
};
