import React from "react";
import { Box, Icon } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  sort: number;
  zone: string;
  onAdd: (sort: number, zone: string) => void;
  children: React.ReactNode;
}

export function AddSectionDivider(props: Props) {
  return (
    <Box
      data-testid="add-section-divider"
      sx={{
        position: "relative",
        "&:hover .addSectionLine, &:focus-within .addSectionLine": { opacity: 1 },
        "&:hover .addSectionBtn, &:focus-within .addSectionBtn": { opacity: 1, pointerEvents: "auto" }
      }}
    >
      {props.children}
      <Box
        className="addSectionLine"
        sx={{
          position: "absolute",
          top: "50%",
          left: 24,
          right: 24,
          height: "2px",
          backgroundColor: "var(--c1)",
          opacity: 0,
          transition: "opacity 0.15s ease",
          pointerEvents: "none",
          zIndex: 3
        }}
      />
      <Box
        component="button"
        type="button"
        className="addSectionBtn"
        data-testid="add-section-divider-button"
        aria-label={Locale.label("site.contentEditor.addSectionHere")}
        title={Locale.label("site.contentEditor.addSectionHere")}
        onClick={() => props.onAdd(props.sort, props.zone)}
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 28,
          height: 28,
          borderRadius: "50%",
          border: "none",
          backgroundColor: "var(--c1)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          opacity: 0,
          pointerEvents: "none",
          transition: "opacity 0.15s ease",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
          zIndex: 4
        }}
      >
        <Icon sx={{ fontSize: 18 }}>add</Icon>
      </Box>
    </Box>
  );
}
