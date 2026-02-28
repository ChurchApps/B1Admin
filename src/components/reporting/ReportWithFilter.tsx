"use client";

import React from "react";
import { ApiHelper, UserHelper } from "../../helpers";
import { Grid } from "@mui/material";
import { ReportOutput } from "./ReportOutput";
import { ReportFilter } from "./ReportFilter";

import { type ReportInterface, type ReportPermissionInterface } from "@churchapps/helpers";
import { Loading, useMountedState } from "@churchapps/apphelper";

interface Props {
  keyName: string;
  autoRun: boolean;
}

export const ReportWithFilter = (props: Props) => {
  const [report, setReport] = React.useState<ReportInterface>(null);
  const [reportToRun, setReportToRun] = React.useState<ReportInterface>(null);
  const isMounted = useMountedState();

  const loadData = () => {
    setReportToRun(null);
    setReport(null);
    setHasAutoRun(false);
    ApiHelper.get("/reports/" + props.keyName, "ReportingApi").then((data) => {
      if (isMounted()) {
        setReport(data);
      }
    });
  };

  const [hasAutoRun, setHasAutoRun] = React.useState(false);

  const handleAutoRun = () => {
    if (props.autoRun && report && !hasAutoRun) {
      setReportToRun(report);
      setHasAutoRun(true);
    }
  };

  React.useEffect(loadData, [props.keyName, isMounted]);
  React.useEffect(handleAutoRun, [report, props.autoRun, hasAutoRun]);

  const handleRun = () => {
    setReportToRun(report);
  };

  const handleChange = (r: ReportInterface) => setReport(r);

  const checkAccess = () => {
    let result = true;
    report.permissions.forEach((rpg) => {
      const groupResult = checkGroup(rpg.requireOne);
      if (!groupResult) result = false; //between groups use AND
    });
    return result;
  };

  //Within groups use OR
  const checkGroup = (pa: ReportPermissionInterface[]) => {
    let result = false;
    pa.forEach((p) => {
      if (UserHelper.checkAccess(p)) result = true;
    });
    return result;
  };

  if (!report) return <Loading />;
  if (!checkAccess()) return <></>;
  else {
    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <ReportOutput keyName={props.keyName} report={reportToRun} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <ReportFilter report={report} onChange={handleChange} onRun={handleRun} />
        </Grid>
      </Grid>
    );
  }
};
