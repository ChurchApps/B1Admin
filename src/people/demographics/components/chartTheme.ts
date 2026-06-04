// Shared palette + theme options so all demographic charts (react-google-charts) stay consistent.
export const CHART_PALETTE = ["#4FA8E0", "#F5B82E", "#43C6AC", "#E879B9", "#5BBF5A", "#B07CE0", "#E8743B", "#7B8CDE"];

export const getChartTheme = (isDark: boolean) => ({
  textStyle: { color: isDark ? "#e0e0e0" : "#333" },
  gridColor: isDark ? "#444" : "#eee",
  baselineColor: isDark ? "#e0e0e0" : "#333",
  backgroundColor: "transparent"
});
