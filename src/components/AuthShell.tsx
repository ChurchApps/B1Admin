import React, { type ReactNode } from "react";
import { Box } from "@mui/material";

interface AuthShellProps {
  logoAlt: string;
  children: ReactNode;
}

export const AuthShell: React.FC<AuthShellProps> = ({ logoAlt, children }) => (
  <Box sx={{ display: "flex", backgroundColor: "background.default", minHeight: "100vh" }}>
    <div style={{ marginLeft: "auto", marginRight: "auto", paddingTop: 20 }}>
      <Box
        sx={{
          width: 500,
          minHeight: 100,
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "var(--b1-radius-panel)",
          padding: "10px"
        }}
        px="16px"
        mx="auto">
        <div style={{ textAlign: "center", margin: 50 }}>
          <img src={"/images/logo-login.png"} alt={logoAlt} />
        </div>
        {children}
      </Box>
    </div>
  </Box>
);
