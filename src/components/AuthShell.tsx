import React, { type ReactNode } from "react";
import { Box } from "@mui/material";

interface AuthShellProps {
  logoAlt: string;
  children: ReactNode;
}

// Fixed 500px card on desktop; full width on a phone so the consent buttons don't run off-screen.
export const AuthShell: React.FC<AuthShellProps> = ({ logoAlt, children }) => (
  <Box sx={{ display: "flex", backgroundColor: "background.default", minHeight: "100vh" }}>
    <Box sx={{ mx: "auto", pt: "20px", px: { xs: 2, sm: 0 }, width: { xs: "100%", sm: "auto" }, boxSizing: "border-box" }}>
      <Box
        sx={{
          width: { xs: "100%", sm: 500 },
          boxSizing: "border-box",
          minHeight: 100,
          backgroundColor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: "var(--b1-radius-panel)",
          padding: "10px"
        }}
        px="16px"
        mx="auto">
        <Box sx={{ textAlign: "center", m: { xs: 3, sm: "50px" } }}>
          <img src={"/images/logo-login.png"} alt={logoAlt} style={{ maxWidth: "100%" }} />
        </Box>
        {children}
      </Box>
    </Box>
  </Box>
);
