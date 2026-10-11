import React from "react";
import type { SxProps, Theme } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { PillTabs, type PillOption } from "./PillTabs";

interface Props {
  years: number[];
  /** null = the "All" pill (only rendered when allLabel is set). */
  value: number | null;
  onChange: (year: number | null) => void;
  allLabel?: string;
  tabs?: boolean;
  "aria-label"?: string;
  "data-testid"?: string;
  sx?: SxProps<Theme>;
}

const ALL = "all";

export const YearPills: React.FC<Props> = ({ years, value, onChange, allLabel, tabs, sx, ...rest }) => {
  const options: PillOption[] = years.map((y) => ({ value: String(y), label: y, "data-testid": `year-pill-${y}` }));
  if (allLabel) options.unshift({ value: ALL, label: allLabel, "data-testid": "year-pill-all" });
  return (
    <PillTabs
      options={options}
      value={value === null ? ALL : String(value)}
      onChange={(v) => onChange(v === ALL ? null : Number(v))}
      tabs={tabs}
      aria-label={rest["aria-label"] || Locale.label("common.years", "Years")}
      data-testid={rest["data-testid"]}
      sx={sx}
    />
  );
};
