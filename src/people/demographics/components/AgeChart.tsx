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
  onSelect?: (group: string, series: "female" | "male" | "unassigned") => void;
}

export const AgeChart = ({ title, data, onSelect }: Props) => {
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

  // Column 0 is the age-group domain; series columns follow in the same order as the header.
  const seriesByColumn: ("female" | "male" | "unassigned")[] = hasUnassigned ? ["female", "male", "unassigned"] : ["female", "male"];
  const chartEvents = onSelect
    ? [{
      eventName: "select" as const,
      callback: ({ chartWrapper }: any) => {
        const chart = chartWrapper.getChart();
        const selection = chart.getSelection();
        if (selection.length > 0 && selection[0].row != null && selection[0].column != null) {
          const group = data[selection[0].row]?.group;
          const series = seriesByColumn[selection[0].column - 1];
          if (group && series) onSelect(group, series);
          chart.setSelection([]);
        }
      }
    }]
    : undefined;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>{title}</Typography>
        {total > 0 ? (
          <Chart chartType="ColumnChart" data={chartData} width="100%" height="320px" options={options} chartEvents={chartEvents} />
        ) : (
          <Typography color="text.secondary">{Locale.label("people.demographics.noData")}</Typography>
        )}
      </CardContent>
    </Card>
  );
};
