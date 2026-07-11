"use client";

import React, { useRef } from "react";
import { ArrayHelper, type PersonInterface, type ReportInterface, type ReportResultInterface } from "@churchapps/helpers";
import { DisplayBox, ExportLink, Loading } from "../";
import { CurrencyHelper } from "@churchapps/apphelper";
import { ApiHelper, Locale } from "../../helpers";
import { useReactToPrint } from "react-to-print";
import { TableReport } from "./TableReport";
import { ChartReport } from "./ChartReport";
import { TreeReport } from "./TreeReport";
import { GivingKpiCards, type GivingKpis } from "./GivingKpiCards";
import { Button, Menu, MenuItem } from "@mui/material";
import { Download as DownloadIcon, Print as PrintIcon, Description as DescriptionIcon } from "@mui/icons-material";
import { useMountedState } from "@churchapps/apphelper";
import { AppIconButton } from "../ui/AppIconButton";

interface Props {
  keyName: string;
  report: ReportInterface | null;
}

export const ReportOutput = (props: Props) => {
  const [reportResult, setReportResult] = React.useState<ReportResultInterface | null>(null);
  const [detailedPersonSummary, setDetailedPersonSummary] = React.useState<any[] | null>(null);
  const [customHeaders, setCustomHeaders] = React.useState<{ label: string; key: string }[]>([]);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [downloadData, setDownloadData] = React.useState<ReportResultInterface | null>(null);
  const [kpis, setKpis] = React.useState<GivingKpis | null>(null);
  const [currency, setCurrency] = React.useState<string>("usd");

  const open = Boolean(anchorEl);
  const contentRef = useRef<HTMLDivElement>(null);
  const isMounted = useMountedState();
  // Hoisted: the compiler merges optional member deps (reportResult?.table) into a
  // non-optional guard read that crashes while reportResult is still null.
  const reportTable = reportResult ? reportResult.table : null;

  React.useEffect(() => {
    CurrencyHelper.loadCurrency().then((result) => {
      if (result && isMounted()) setCurrency(result);
    });
  }, [isMounted]);

  const handlePrint = useReactToPrint({ contentRef });

  const populatePeople = async (data: any[]) => {
    const result: any[] = [];
    const headers: { label: string; key: string }[] = [];
    const peopleIds = ArrayHelper.getIds(data, "personId");
    if (peopleIds.length > 0) {
      const people = await ApiHelper.get("/people/ids?ids=" + peopleIds.join(","), "MembershipApi");
      const filteredData = data.filter((d) => d.personId !== null);
      filteredData.forEach((d) => {
        const person: PersonInterface = ArrayHelper.getOne(people, "id", d.personId);
        if (!person) return;
        const funds = Object.assign({}, ...d.funds);
        const obj = {
          firstName: person?.name?.first || "",
          lastName: person?.name?.last || "",
          email: person?.contactInfo?.email || "",
          address: (person?.contactInfo?.address1 || "") + (person?.contactInfo?.address2 ? `, ${person.contactInfo.address2}` : ""),
          city: person?.contactInfo?.city || "",
          state: person?.contactInfo?.state || "",
          zip: person?.contactInfo?.zip || "",
          totalDonation: d.totalAmount,
          ...funds
        };
        result.push(obj);
      });
    }

    //for anonymous donations
    const anonDonations = ArrayHelper.getOne(data, "personId", null);
    if (anonDonations) {
      const funds = Object.assign({}, ...anonDonations.funds);
      const obj = {
        firstName: "Anonymous",
        totalDonation: anonDonations.totalAmount,
        ...funds
      };
      result.push(obj);
    }

    // Collect all unique keys across all objects
    const allKeys = new Set<string>();
    result.forEach((obj) => {
      if (obj) Object.keys(obj).forEach((key) => allKeys.add(key));
    });

    // Create headers for all unique keys
    allKeys.forEach((key) => headers.push({ label: key, key: key }));

    setCustomHeaders(headers);
    setDetailedPersonSummary(result);
  };

  const runReport = () => {
    if (props.report) {
      setDetailedPersonSummary(null);
      const queryParams: string[] = [];
      props.report.parameters.forEach((p) => {
        if (p.value && p.value.trim() !== "") queryParams.push(p.keyName + "=" + encodeURIComponent(p.value));
      });
      let url = "/reports/" + props.report.keyName + "/run";
      if (queryParams.length > 0) url += "?" + queryParams.join("&");

      ApiHelper.get(url, "ReportingApi").then((data: ReportResultInterface) => {
        if (isMounted()) {
          setReportResult(data);
        }
      });

      const donationUrl = "/donations/summary?type=person&" + queryParams.join("&");
      ApiHelper.get(donationUrl, "GivingApi").then((data: any) => {
        populatePeople(data);
      });

      if (props.keyName === "groupAttendance") {
        let url = "/reports/groupAttendanceDownload/run";
        if (queryParams) url += "?" + queryParams.join("&");
        ApiHelper.get(url, "ReportingApi").then((data: ReportResultInterface) => {
          setDownloadData(data);
        });
      }

      if (props.keyName.startsWith("donationDashboard")) {
        const kpiParams = queryParams.filter((p) => !p.startsWith("churchId="));
        const kpiUrl = "/donations/kpis?" + kpiParams.join("&");
        ApiHelper.get(kpiUrl, "GivingApi").then((data: GivingKpis) => {
          if (isMounted()) setKpis(data);
        });
      }
    }
  };

  const getExportMenu = () => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };
    return (
      <React.Fragment key="export-menu">
        <Button size="small" variant="outlined" startIcon={<DownloadIcon />} title={Locale.label("reporting.downloadOptions")} onClick={handleClick}>
          {Locale.label("reporting.downloadOptions")}
        </Button>
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          {(reportTable?.length || 0) > 0 && (
            <MenuItem sx={{ padding: "5px" }} onClick={handleClose}>
              <ExportLink
                data={(props.keyName === "groupAttendance" ? downloadData?.table : reportTable) || []}
                filename={(props.report?.displayName || "").replace(" ", "_") + ".csv"}
                text={Locale.label("reporting.summary")}
                icon={props.keyName === "attendanceTrend" ? "calendar_month" : "volunteer_activism"}
              />
            </MenuItem>
          )}
          {props.keyName === "donationSummary" && (detailedPersonSummary?.length || 0) > 0 && (
            <MenuItem sx={{ padding: "5px" }} onClick={handleClose}>
              <ExportLink
                data={detailedPersonSummary || []}
                filename="Detailed_Donation_Summary.csv"
                text={Locale.label("reporting.detailed")}
                icon="person"
                customHeaders={customHeaders}
                spaceAfter={true}
              />
            </MenuItem>
          )}
          {props.keyName === "donationSummary" && (detailedPersonSummary?.length || 0) > 0 && (
            <MenuItem sx={{ padding: "5px" }} onClick={handleClose}>
              <Button
                startIcon={<DescriptionIcon />}
                onClick={() => {
                  window.open("/downloads/DonationTemplate.docx");
                }}>
                {Locale.label("reporting.sampleTemplate")}
              </Button>
            </MenuItem>
          )}
        </Menu>
      </React.Fragment>
    );
  };

  React.useEffect(runReport, [props.report, isMounted]);

  const getEditContent = () => {
    const result: React.ReactElement[] = [];

    if (reportResult) {
      result.push(
        <AppIconButton key="print" label={Locale.label("common.print")} icon={<PrintIcon />} tone="card" onClick={handlePrint} />
      );
    }
    if ((reportTable?.length || 0) > 0 || (detailedPersonSummary?.length || 0) > 0) {
      result.push(getExportMenu());
    }
    return result;
  };

  const getOutputs = () => {
    const result: React.ReactElement[] = [];
    if (!reportResult) return result;
    reportResult.outputs.forEach((o) => {
      if (o.outputType === "table") result.push(<TableReport key={o.outputType} reportResult={reportResult} output={o} />);
      else if (o.outputType === "tree") result.push(<TreeReport key={o.outputType} reportResult={reportResult} output={o} />);
      else if (o.outputType === "barChart" || o.outputType === "lineChart") result.push(<ChartReport key={o.outputType} reportResult={reportResult} output={o} />);
    });

    return result;
  };

  const getResults = () => {
    if (!props.report) {
      return (
        <DisplayBox ref={contentRef} id="reportsBox" headerIcon="summarize" headerText={Locale.label("reporting.runReport")} editContent={getEditContent()}>
          <p>{Locale.label("reporting.useFilter")}</p>
        </DisplayBox>
      );
    } else if (!reportResult) return <Loading />;
    else {
      return (
        <>
          <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
              @page {
                size: portrait;
                margin: 20mm 15mm 20mm 15mm;
              }
              body {
                margin: 0 !important;
                padding: 0 !important;
              }
              #display-box-actions {
                display: none !important;
              }
              #reportsBox {
                padding-left: 24px !important;
                padding-right: 24px !important;
                margin: 0 auto !important;
                width: auto !important;
                box-shadow: none !important;
                border: none !important;
                background: transparent !important;
              }
              .report-chart-container {
                display: block !important;
                margin: 0 auto 30px auto !important;
                width: 800px !important;
                transform: scale(0.85) !important;
                transform-origin: left top !important;
                margin-left: calc((100% - 680px) / 2) !important;
                page-break-inside: avoid !important;
              }
              .MuiTable-root {
                width: 100% !important;
                margin-top: 20px !important;
              }
              .MuiTableCell-root {
                padding: 12px 16px !important;
                font-size: 14px !important;
                border-bottom: 1px solid #ddd !important;
              }
              .MuiTableRow-root {
                page-break-inside: avoid !important;
              }
            }
          `
          }} />
          {kpis && <GivingKpiCards kpis={kpis} currency={currency} />}
          <DisplayBox ref={contentRef} id="reportsBox" headerIcon="summarize" headerText={props.report.displayName} editContent={getEditContent()}>
            {getOutputs()}
          </DisplayBox>
        </>
      );
    }
  };

  return <>{getResults()}</>;
};
