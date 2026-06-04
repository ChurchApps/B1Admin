import React from "react";
import { Chart } from "react-google-charts";
import { Card, CardContent, Typography, useTheme } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { CHART_PALETTE, getChartTheme } from "./chartTheme";

interface AgeGroup {
  group: string;
  female: number;
  male: number;
  unassigned: number;
}

interface Props {
  title: string;
  data: AgeGroup[];
}

export const AgeChart = ({ title, data }: Props) => {
  const theme = useTheme();
  const chartTheme = getChartTheme(theme.palette.mode === "dark");
  const hasUnassigned = data.some((d) => d.unassigned > 0);
  const total = data.reduce((sum, d) => sum + d.female + d.male + d.unassigned, 0);

  const header: any[] = [Locale.label("people.demographics.age"), Locale.label("people.demographics.female"), Locale.label("people.demographics.male")];
  if (hasUnassigned) header.push(Locale.label("people.demographics.unassigned"));

  const chartData: any[] = [header];
  data.forEach((d) => {
    const row: any[] = [d.group, d.female, d.male];
    if (hasUnassigned) row.push(d.unassigned);
    chartData.push(row);
  });

  const options = {
    isStacked: true,
    legend: { position: "bottom", textStyle: chartTheme.textStyle },
    backgroundColor: chartTheme.backgroundColor,
    colors: CHART_PALETTE.slice(0, hasUnassigned ? 3 : 2),
    bar: { groupWidth: "70%" },
    chartArea: { width: "85%", height: "75%" },
    hAxis: { textStyle: chartTheme.textStyle },
    vAxis: { textStyle: chartTheme.textStyle, gridlines: { color: chartTheme.gridColor }, baselineColor: chartTheme.baselineColor, minValue: 0 }
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        {total > 0 ? (
          <Chart chartType="ColumnChart" data={chartData} width="100%" height="320px" options={options} />
        ) : (
          <Typography color="text.secondary">{Locale.label("people.demographics.noData")}</Typography>
        )}
      </CardContent>
    </Card>
  );
};
