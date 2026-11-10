import React from "react";
import { Box, Button, Icon } from "@mui/material";
import { ExportLink } from "@churchapps/apphelper";

interface Props {
  data: any[];
  filename?: string;
  text: string;
  customHeaders?: { label: string; key: string }[];
  // When set, the button calls this instead of downloading, so the caller can load the rest of the data first.
  onRequestData?: () => void;
}

// ExportLink ignores children; style from wrapper instead of props
export const ExportButton: React.FC<Props> = (props) => (
  <Box
    sx={{
      "& a": { textDecoration: "none" },
      "& .MuiButton-root": {
        border: "1px solid var(--b1-control-border)",
        backgroundColor: "background.paper",
        color: "text.primary",
        borderRadius: "var(--b1-radius-control)",
        fontWeight: 600,
        fontSize: "0.875rem",
        minHeight: 36,
        padding: "6px 14px",
        minWidth: 0,
        "&:hover": { backgroundColor: "var(--b1-hover)" }
      },
      "& .MuiIcon-root": { fontSize: 18 }
    }}>
    {props.onRequestData
      ? <Button onClick={props.onRequestData}><Icon sx={{ marginRight: 1 }}>file_download</Icon>{props.text}</Button>
      : <ExportLink data={props.data} filename={props.filename} customHeaders={props.customHeaders} text={props.text} icon="file_download" />}
  </Box>
);
