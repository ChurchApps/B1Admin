import React from "react";
import { Box } from "@mui/material";
import { ExportLink } from "@churchapps/apphelper";

interface Props {
  data: any[];
  filename?: string;
  text: string;
  customHeaders?: { label: string; key: string }[];
}

/* ExportLink renders its own text Button and ignores wrapper children, so the
   outlined toolbar style is applied to it from outside. */
export const ExportButton: React.FC<Props> = (props) => (
  <Box
    sx={{
      "& a": { textDecoration: "none" },
      "& .MuiButton-root": {
        border: "1px solid",
        borderColor: "primary.main",
        color: "primary.main",
        borderRadius: "6px",
        fontWeight: 500,
        fontSize: "0.8125rem",
        padding: "3px 12px",
        minWidth: 0
      },
      "& .MuiIcon-root": { fontSize: 18 }
    }}>
    <ExportLink data={props.data} filename={props.filename} customHeaders={props.customHeaders} text={props.text} icon="file_download" />
  </Box>
);
