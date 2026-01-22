import React, { useEffect } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

/**
 * OAuth callback page that handles the redirect from OAuth providers.
 * This page parses the authorization code from the URL and sends it back
 * to the parent window that initiated the OAuth flow.
 */
export const OAuthCallback: React.FC = () => {
  useEffect(() => {
    // Parse the URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    const error = urlParams.get("error");
    const errorDescription = urlParams.get("error_description");
    const state = urlParams.get("state");

    // Parse provider ID from state if available
    let providerId = "";
    if (state) {
      try {
        const stateData = JSON.parse(atob(state));
        providerId = stateData.providerId || "";
      } catch {
        // State might just be the provider ID directly
        providerId = state;
      }
    }

    // Send message to parent window
    if (window.opener) {
      window.opener.postMessage(
        {
          type: "oauth_callback",
          providerId,
          code,
          error,
          error_description: errorDescription,
        },
        window.location.origin
      );

      // Close this window after a short delay
      setTimeout(() => {
        window.close();
      }, 1000);
    } else {
      // No parent window - redirect to main app
      window.location.href = "/";
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
        gap: 2,
      }}
    >
      <CircularProgress />
      <Typography>Completing authentication...</Typography>
    </Box>
  );
};
