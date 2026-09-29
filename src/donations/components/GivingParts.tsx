import React from "react";
import { Box, Link, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material";
import { ExportLink } from "@churchapps/apphelper";

// One quiet line in place of a stat header.
export const Lede: React.FC<{ children: React.ReactNode; sx?: SxProps<Theme>; "data-testid"?: string }> = ({ children, sx, ...rest }) => (
  <Typography variant="body2" color="text.secondary" data-testid={rest["data-testid"]} sx={[{ fontVariantNumeric: "tabular-nums" }, ...(Array.isArray(sx) ? sx : [sx])]}>
    {children}
  </Typography>
);

interface CsvProps {
  data: any[];
  filename: string;
  text: string;
  customHeaders?: { label: string; key: string }[];
}

// ExportLink (lazy react-csv <a><button>) restyled as a text-link verb. Render only when data is non-empty.
export const CsvVerb: React.FC<CsvProps> = (props) => (
  <Box
    component="span"
    sx={{
      display: "inline-flex",
      "& a": { textDecoration: "none" },
      "& .MuiButton-root": { p: 0, minWidth: 0, minHeight: 0, lineHeight: "inherit", textTransform: "none", font: "inherit", fontWeight: 600, color: "primary.main", verticalAlign: "baseline", "&:hover": { bgcolor: "transparent", textDecoration: "underline" } },
      "& .MuiIcon-root": { display: "none" }
    }}>
    <ExportLink data={props.data} filename={props.filename} customHeaders={props.customHeaders} text={props.text} />
  </Box>
);

interface TabVerb {
  value: string;
  label: string;
  "data-testid"?: string;
}

// Text-link verbs that switch the view; role=tab keeps specs and screen readers working.
export const VerbTabs: React.FC<{ options: TabVerb[]; value: string; onChange: (value: string) => void; "aria-label": string }> = ({ options, value, onChange, ...rest }) => (
  <Stack direction="row" role="tablist" aria-label={rest["aria-label"]} spacing={1} alignItems="baseline" sx={{ typography: "body2", color: "text.secondary" }}>
    {options.map((o, i) => (
      <React.Fragment key={o.value}>
        {i > 0 && <span aria-hidden>·</span>}
        <Link
          component="button"
          type="button"
          role="tab"
          aria-selected={value === o.value}
          underline="hover"
          onClick={() => onChange(o.value)}
          data-testid={o["data-testid"]}
          sx={{ typography: "body1", fontWeight: value === o.value ? 700 : 600, color: value === o.value ? "text.primary" : "primary.main", border: 0, p: 0, bgcolor: "transparent", cursor: "pointer" }}>
          {o.label}
        </Link>
      </React.Fragment>
    ))}
  </Stack>
);
