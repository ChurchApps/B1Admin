"use client";

import React from "react";
import type { ReportOutputInterface, ReportResultInterface } from "@churchapps/helpers";
import { Table, TableBody, TableRow, TableCell, TableHead } from "@mui/material";
import { ReportHelper } from "./ReportHelper";

interface Props {
  reportResult: ReportResultInterface;
  output: ReportOutputInterface;
}

export const TreeReport = (props: Props) => {
  const groupings = props.output.groupings || [];

  const getPreviousGroupingCount = (depth: number) => {
    let result = 0;
    for (let i = 0; i < depth; i++) result += groupings[i];
    return result;
  };

  const totalGroupings = getPreviousGroupingCount(groupings.length);

  const getHeaders = () => {
    const result: React.ReactElement[] = [];
    const columns = props.output.columns;
    for (let i = totalGroupings; i < columns.length; i++) {
      const c = columns[i];
      if (i === totalGroupings) result.push(<th key={i}>{c.header}</th>);
      else result.push(<th key={i}>{c.header}</th>);
    }
    return result;
  };

  const getRows = () => {
    const result: React.ReactElement[] = [];
    const columns = props.output.columns;
    let previousData = {};
    props.reportResult.table.forEach((d) => {
      const row: React.ReactElement[] = [];
      const groupingRows: React.ReactElement[] = getGroupingRows(previousData, d);
      groupingRows.forEach((gr) => result.push(gr));
      for (let i = totalGroupings; i < columns.length; i++) {
        const c = columns[i];
        if (i === totalGroupings) row.push(<TableCell style={{ paddingLeft: 30 * totalGroupings }}>{ReportHelper.getField(c, d)}</TableCell>);
        else row.push(<TableCell>{ReportHelper.getField(c, d)}</TableCell>);
      }
      result.push(<TableRow>{row}</TableRow>);
      previousData = d;
    });
    return result;
  };

  const getGroupingRows = (previousData: any, data: any) => {
    const result: React.ReactElement[] = [];
    const firstGroupModified = getFirstGroupModified(previousData, data);
    for (let i = firstGroupModified; i <= groupings.length; i++) {
      result.push(getGroupingRow(data, i));
    }
    return result;
  };

  const getGroupingRow = (row: any, groupNumber: number) => {
    const g = groupings[groupNumber];
    const prevCols = getPreviousGroupingCount(groupNumber);
    const outputRow: React.ReactElement[] = [];
    for (let i = prevCols; i < prevCols + g; i++) {
      const c = props.output.columns[i];
      const className = "heading" + (groupNumber + 1);
      if (i === prevCols && i > 0) {
        outputRow.push(
          <TableCell className={className} style={{ paddingLeft: 30 * groupNumber }}>
            {ReportHelper.getField(c, row)}
          </TableCell>
        );
      } else outputRow.push(<TableCell className={className}>{ReportHelper.getField(c, row)}</TableCell>);
    }
    return <TableRow>{outputRow}</TableRow>;
  };

  const getFirstGroupModified = (previousRow: any, row: any) => {
    let firstColumnModified = props.output.columns.length - 1;
    for (let i = props.output.columns.length - 1; i >= 0; i--) {
      const colName = props.output.columns[i].value;
      if (row[colName] !== previousRow[colName]) {
        firstColumnModified = i;
      }
    }

    let firstGroupModified = groupings.length;
    for (let i = groupings.length - 1; i >= 0; i--) {
      const totalColumns = getPreviousGroupingCount(i);
      if (totalColumns >= firstColumnModified) firstGroupModified = i;
    }

    return firstGroupModified;
  };

  return (
    <Table className="table table-sm report">
      <TableHead className="thead-dark">
        <TableRow>{getHeaders()}</TableRow>
      </TableHead>
      <TableBody>{getRows()}</TableBody>
    </Table>
  );
};
