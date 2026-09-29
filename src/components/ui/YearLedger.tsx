import React from "react";
import { Box, Stack, Typography } from "@mui/material";
import { eyebrowSx } from "./RecordParts";
import { YearPills } from "./YearPills";

interface Props {
  title: string;
  /** Big number for the selected year, e.g. the total. */
  headline?: React.ReactNode;
  /** One quiet line, e.g. "12 gifts in 2026 · $4,200 since 2019". */
  summary?: React.ReactNode;
  years: number[];
  year: number | null;
  onYearChange: (year: number | null) => void;
  allLabel?: string;
  tabs?: boolean;
  /** Text-link verbs (VerbRow of TextAction) beside the headline: Statement, Export, Log a gift. */
  actions?: React.ReactNode;
  /** A BackVerb above the ledger. */
  back?: React.ReactNode;
  /** The table for the selected year. */
  children: React.ReactNode;
  "data-testid"?: string;
}

export const YearLedger: React.FC<Props> = ({ title, headline, summary, years, year, onYearChange, allLabel, tabs, actions, back, children, ...rest }) => (
  <Box data-testid={rest["data-testid"]}>
    {back && <Box sx={{ mb: 2 }}>{back}</Box>}
    <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 1, sm: 3 }} sx={{ justifyContent: "space-between", alignItems: { sm: "flex-end" }, mb: 2 }}>
      <Box sx={{ minWidth: 0 }}>
        <Typography component="h2" sx={eyebrowSx}>{title}</Typography>
        {headline !== undefined && headline !== null && headline !== "" && (
          <Typography variant="h1" component="p" sx={{ fontVariantNumeric: "tabular-nums", mt: 0.5 }}>{headline}</Typography>
        )}
        {summary && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{summary}</Typography>}
      </Box>
      {actions}
    </Stack>
    {years.length > 0 && <YearPills years={years} value={year} onChange={onYearChange} allLabel={allLabel} tabs={tabs} sx={{ mb: 2 }} />}
    {children}
  </Box>
);
