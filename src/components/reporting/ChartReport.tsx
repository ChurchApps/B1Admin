"use client";

import React from "react";
import { Chart } from "react-google-charts";
import type { ReportOutputInterface, ReportResultInterface } from "@churchapps/helpers";
import { ReportHelper } from "./ReportHelper";
import { Locale } from "../../helpers";
import { useTheme } from "@mui/material";

interface Props {
  reportResult: ReportResultInterface;
  output: ReportOutputInterface;
}

export const ChartReport = (props: Props) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  let rows: any = [];

  const getChartData = () => {
    if (props.output.columns.length === 2) return getSingleData();
    else return getMultiData();
  };

  const getHeaders = () => {
    const result: string[] = [];
    const uniqueValues: string[] = [];

    props.reportResult.table.forEach((d) => {
      const val = ReportHelper.getField(props.output.columns[1], d);
      if (uniqueValues.indexOf(val) === -1) uniqueValues.push(val);
    });

    result.push(props.output.columns[0].header);
    uniqueValues.forEach((v) => result.push(v));

    return result;
  };

  const getHeaderIndex = (headers: string[], header: string) => {
    let result = -1;
    let i = 0;
    headers.forEach((h) => {
      if (h === header) result = i;
      i++;
    });
    return result;
  };

  const transformData = (headers: string[]) => {
    const result: any[] = [];
    props.reportResult.table.forEach((d) => {
      const firstVal = ReportHelper.getField(props.output.columns[0], d);
      const secondVal = ReportHelper.getField(props.output.columns[1], d);
      const headerIndex = getHeaderIndex(headers, secondVal);

      let row: any[] = [];
      if (result.length === 0 || firstVal !== result[result.length - 1][0]) {
        row[0] = firstVal;
        for (let i = 1; i < headers.length; i++) row[i] = 0;
        result.push(row);
      } else row = result[result.length - 1];

      row[headerIndex] = parseFloat(d[props.output.columns[2].value]);
    });

    return result;
  };

  const getMultiData = () => {
    const headers = getHeaders();
    rows = [];
    rows.push(headers);
    transformData(headers).forEach((d) => {
      rows.push(d);
    });

    return rows;
  };

  const getSingleData = () => {
    rows = [];
    rows.push([props.output.columns[0].header, props.output.columns[1].header]);
    props.reportResult.table.forEach((d) => {
      rows.push([ReportHelper.getField(props.output.columns[0], d), parseFloat(ReportHelper.getField(props.output.columns[1], d))]);
    });
    return rows;
  };

  const options = {
    height: 400,
    legend: {
      position: "top",
      maxLines: 3,
      textStyle: { color: isDark ? "#e0e0e0" : "#333" }
    },
    bar: { groupWidth: "75%" },
    isStacked: true,
    backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
    hAxis: {
      textStyle: { color: isDark ? "#e0e0e0" : "#333" }
    },
    vAxis: {
      textStyle: { color: isDark ? "#e0e0e0" : "#333" },
      gridlines: { color: isDark ? "#444" : "#ccc" },
      baselineColor: isDark ? "#e0e0e0" : "#333"
    }
  };

  let result = <p>{Locale.label("reporting.noData")}</p>;
  if (props.reportResult.table?.length > 0) {
    result = (
      <Chart
        chartType="ColumnChart"
        data={getChartData()}
        width="100%"
        height="400px"
        options={options}
      />
    );
  }

  return result;
};
