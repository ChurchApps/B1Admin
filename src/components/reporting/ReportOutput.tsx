"use client";

import React, { useRef } from "react";
import { ArrayHelper, type PersonInterface, type ReportInterface, type ReportResultInterface } from "@churchapps/helpers";
import { DisplayBox, ExportLink, Loading } from "../";
import { ApiHelper, Locale } from "../../helpers";
import { useReactToPrint } from "react-to-print";
import { TableReport } from "./TableReport";
import { ChartReport } from "./ChartReport";
import { TreeReport } from "./TreeReport";
import { Button, Icon, Menu, MenuItem } from "@mui/material";
import { useMountedState } from "@churchapps/apphelper";

interface Props {
  keyName: string;
  report: ReportInterface;
}

export const ReportOutput = (props: Props) => {
  const [reportResult, setReportResult] = React.useState<ReportResultInterface>(null);
  const [detailedPersonSummary, setDetailedPersonSummary] = React.useState<any[]>(null);
  const [customHeaders, setCustomHeaders] = React.useState([]);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const [downloadData, setDownloadData] = React.useState<ReportResultInterface>(null);
  const open = Boolean(anchorEl);
  const contentRef = useRef<HTMLDivElement>(null);
  const isMounted = useMountedState();

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
          ...funds,
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
        ...funds,
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
        if (p.value) queryParams.push(p.keyName + "=" + p.value);
      });
      let url = "/reports/" + props.report.keyName + "/run";
      if (queryParams) url += "?" + queryParams.join("&");

      ApiHelper.get(url, "ReportingApi").then((data: ReportResultInterface) => {
        if (isMounted()) {
          setReportResult(data);
        }
      });

      const donationUrl = "/donations/summary?type=person&" + queryParams.join("&");
      ApiHelper.get(donationUrl, "GivingApi").then((data) => {
        populatePeople(data);
      });

      if (props.keyName === "groupAttendance") {
        let url = "/reports/groupAttendanceDownload/run";
        if (queryParams) url += "?" + queryParams.join("&");
        ApiHelper.get(url, "ReportingApi").then((data: ReportResultInterface) => {
          setDownloadData(data);
        });
      }
    }
  };

  const getExportMenu = (key: number) => {
    const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
      setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
      setAnchorEl(null);
    };
    return (
      <>
        <Button size="small" title={Locale.label("reporting.downloadOptions")} onClick={handleClick} key={key}>
          <Icon>download</Icon>
        </Button>
        <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
          {reportResult?.table?.length > 0 && (
            <MenuItem sx={{ padding: "5px" }} onClick={handleClose}>
              <ExportLink
                data={props.keyName === "groupAttendance" ? downloadData?.table : reportResult.table}
                filename={props.report.displayName.replace(" ", "_") + ".csv"}
                text={Locale.label("reporting.summary")}
                icon={props.keyName === "attendanceTrend" ? "calendar_month" : "volunteer_activism"}
              />
            </MenuItem>
          )}
          {props.keyName === "donationSummary" && detailedPersonSummary?.length > 0 && (
            <MenuItem sx={{ padding: "5px" }} onClick={handleClose}>
              <ExportLink
                data={detailedPersonSummary}
                filename="Detailed_Donation_Summary.csv"
                text={Locale.label("reporting.detailed")}
                icon="person"
                customHeaders={customHeaders}
                spaceAfter={true}
              />
            </MenuItem>
          )}
          {props.keyName === "donationSummary" && detailedPersonSummary?.length > 0 && (
            <MenuItem sx={{ padding: "5px" }} onClick={handleClose}>
              <Button
                onClick={() => {
                  window.open("/downloads/DonationTemplate.docx");
                }}>
                <Icon sx={{ marginRight: 1 }}>description</Icon>
                {Locale.label("reporting.sampleTemplate")}
              </Button>
            </MenuItem>
          )}
        </Menu>
      </>
    );
  };

  React.useEffect(runReport, [props.report, isMounted]);

  const getEditContent = () => {
    const result: React.ReactElement[] = [];

    if (reportResult) {
      result.push(
        <button type="button" className="no-default-style" key={result.length - 2} onClick={handlePrint} title="print">
          <Icon>print</Icon>
        </button>
      );
    }
    if (reportResult?.table.length > 0 || detailedPersonSummary?.length > 0) {
      result.push(getExportMenu(result.length - 1));
    }
    return result;
  };

  const getOutputs = () => {
    const result: React.ReactElement[] = [];
    reportResult.outputs.forEach((o) => {
      if (o.outputType === "table") result.push(<TableReport key={o.outputType} reportResult={reportResult} output={o} />);
      if (o.outputType === "tree") result.push(<TreeReport key={o.outputType} reportResult={reportResult} output={o} />);
      else if (o.outputType === "barChart") result.push(<ChartReport key={o.outputType} reportResult={reportResult} output={o} />);
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
        <DisplayBox ref={contentRef} id="reportsBox" headerIcon="summarize" headerText={props.report.displayName} editContent={getEditContent()}>
          {getOutputs()}
        </DisplayBox>
      );
    }
  };

  return <>{getResults()}</>;
};
