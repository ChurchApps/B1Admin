import { Chart } from "react-google-charts";
import { Card, CardContent, Typography, useTheme } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { CHART_PALETTE, getChartTheme } from "./chartTheme";

interface Props {
  title: string;
  data: { name: string; count: number }[];
  onSelect?: (name: string) => void;
}

export const DonutChart = ({ title, data, onSelect }: Props) => {
  const theme = useTheme();
  const chartTheme = getChartTheme(theme.palette.mode === "dark");
  const total = data.reduce((sum, d) => sum + d.count, 0);

  const chartData: any[] = [["Type", "Count"]];
  data.forEach((d) => chartData.push([d.name, d.count]));

  const options = {
    pieHole: 0.6,
    legend: { position: "bottom", textStyle: chartTheme.textStyle },
    backgroundColor: chartTheme.backgroundColor,
    colors: CHART_PALETTE,
    chartArea: { width: "90%", height: "80%" },
    pieSliceText: "none"
  };

  const chartEvents = onSelect
    ? [{
      eventName: "select" as const,
      callback: ({ chartWrapper }: any) => {
        const chart = chartWrapper.getChart();
        const selection = chart.getSelection();
        if (selection.length > 0 && selection[0].row != null) {
          const item = data[selection[0].row];
          if (item) onSelect(item.name);
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
          <>
            <Chart chartType="PieChart" data={chartData} width="100%" height="320px" options={options} chartEvents={chartEvents} />
            <Typography variant="subtitle1" align="center">{Locale.label("people.demographics.total")}: {total.toLocaleString()}</Typography>
          </>
        ) : (
          <Typography color="text.secondary">{Locale.label("people.demographics.noData")}</Typography>
        )}
      </CardContent>
    </Card>
  );
};
