import React, { useEffect } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

export const OAuthCallback: React.FC = () => {
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const errorDescription = urlParams.get("error_description");
    const state = urlParams.get("state");

    let providerId = "";
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        providerId = stateData.providerId || "";
      } catch {
        providerId = state;
      }
    }

    if (window.opener) {
      window.opener.postMessage(
        {
          type: "oauth_callback",
          providerId,
          code,
          error,
          error_description: errorDescription
        },
        window.location.origin
      );

      setTimeout(() => {
        window.close();
      }, 1000);
    } else {
      window.location.href = import.meta.env.BASE_URL;
    }
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        gap: 2
      }}
    >
      <CircularProgress />
      <Typography>Completing authentication...</Typography>
    </Box>
  );
};
