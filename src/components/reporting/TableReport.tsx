"use client";

import React from "react";
import type { ReportOutputInterface, ReportResultInterface } from "@churchapps/helpers";
import { Table, TableBody, TableRow, TableCell, TableHead } from "@mui/material";
import { ReportHelper } from "./ReportHelper";

interface Props {
  reportResult: ReportResultInterface;
  output: ReportOutputInterface;
}

export const TableReport = (props: Props) => {
  const getHeaders = () => {
    const result: React.ReactElement[] = [];
    props.output.columns.forEach((c, i) => {
      result.push(
        <TableCell key={i} style={{ fontWeight: "bold" }}>
          {c.header}
        </TableCell>
      );
    });
    return result;
  };

  const getRows = () => {
    const result: React.ReactElement[] = [];
    props.reportResult.table.forEach((d, rowIdx) => {
      const row: React.ReactElement[] = [];
      props.output.columns.forEach((c, colIdx) => {
        row.push(<TableCell key={c.value || colIdx}>{ReportHelper.getField(c, d)}</TableCell>);
      });
      result.push(<TableRow key={rowIdx}>{row}</TableRow>);
    });
    return result;
  };

  return (
    <Table>
      <TableHead>
        <TableRow>{getHeaders()}</TableRow>
      </TableHead>
      <TableBody>{getRows()}</TableBody>
    </Table>
  );
};
