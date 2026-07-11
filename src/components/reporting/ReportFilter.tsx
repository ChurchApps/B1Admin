"use client";

import React from "react";
import { Alert } from "@mui/material";
import type { ReportInterface, ParameterInterface } from "@churchapps/helpers";
import { ArrayHelper, Locale } from "../../helpers";
import { FormCard } from "../ui";
import { ReportFilterField } from "./ReportFilterField";

interface Props {
  report: ReportInterface;
  onChange: (report: ReportInterface) => void;
  onRun: () => void;
}

export const ReportFilter = (props: Props) => {
  const [dateError, setDateError] = React.useState("");

  const handleChange = (parameter: ParameterInterface, permittedChildIds: string[]) => {
    const r = { ...props.report };
    const p: ParameterInterface = ArrayHelper.getOne(r.parameters, "keyName", parameter.keyName);
    p.value = parameter.value;
    updateChildIds(r, p, permittedChildIds);
    props.onChange(r);
  };

  const validateDateRange = (report: ReportInterface): boolean => {
    // Get all date parameters
    const dateParams = report.parameters.filter((p) => p.source === "date");

    // Try different ways to identify from/to parameters
    let fromParam = dateParams.find(
      (p) => p.keyName?.toLowerCase().includes("from") || p.displayName?.toLowerCase().includes("from") || p.keyName?.toLowerCase().includes("start") || p.displayName?.toLowerCase().includes("start")
    );

    let toParam = dateParams.find(
      (p) => p.keyName?.toLowerCase().includes("to") || p.displayName?.toLowerCase().includes("to") || p.keyName?.toLowerCase().includes("end") || p.displayName?.toLowerCase().includes("end")
    );

    // If we have exactly 2 date parameters and couldn't identify them, assume first is from, second is to
    if (!fromParam && !toParam && dateParams.length === 2) {
      fromParam = dateParams[0];
      toParam = dateParams[1];
    }

    // Validate date range if both parameters exist and have values
    if (fromParam && toParam && fromParam.value && toParam.value) {
      const fromDate = new Date(fromParam.value + "T00:00:00");
      const toDate = new Date(toParam.value + "T00:00:00");

      if (toDate < fromDate) {
        setDateError(Locale.label("reporting.toDateBeforeFromDate"));
        return false;
      }
    }

    setDateError("");
    return true;
  };

  const updateChildIds = (report: ReportInterface, parameter: ParameterInterface, permittedChildIds: string[]) => {
    switch (parameter.sourceKey) {
      case "campus": setRequiredParentIds(report, "service", permittedChildIds); break;
      case "service": setRequiredParentIds(report, "serviceTime", permittedChildIds); break;
      case "serviceTime": setRequiredParentIds(report, "group", permittedChildIds); break;
    }
  };

  const setRequiredParentIds = (report: ReportInterface, childSourceKey: string, requiredParentIds: string[]) => {
    const child: ParameterInterface = ArrayHelper.getOne(report.parameters, "sourceKey", childSourceKey);
    if (child) child.requiredParentIds = requiredParentIds;
  };

  const handleRunReport = () => {
    // Validate date ranges before running report
    if (validateDateRange(props.report)) {
      props.onRun();
    }
  };

  const getInputs = () => {
    const result: React.ReactElement[] = [];
    props.report.parameters.forEach((p, i) => {
      if (p.source === "dropdown" || p.source === "date") {
        result.push(<ReportFilterField key={i} parameter={p} report={props.report} onChange={handleChange} />);
      }
    });
    return result;
  };

  const inputs = getInputs();
  if (inputs.length > 0) {
    return (
      <FormCard id="formSubmissionBox" title={Locale.label("common.reportFilter.title")} icon="summarize" onSave={handleRunReport} saveText={Locale.label("reporting.runReport")}>
        {dateError && <Alert severity="error" sx={{ mb: 2 }} data-testid="report-filter-error">{dateError}</Alert>}
        {inputs}
      </FormCard>
    );
  } else return <> </>;
};
