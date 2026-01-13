import * as React from "react";
import { ApiHelper, UserHelper } from "@churchapps/apphelper";
import { Alert, Box, Button, Grid, Icon } from "@mui/material";

export const OAuthPage: React.FC = () => {
  const [clientName, setClientName] = React.useState<string>("");

  const search = new URLSearchParams(window.location.search);
  const clientId = search.get("client_id");
  const redirectUri = search.get("redirect_uri");
  const scope = search.get("scope");
  const responseType = search.get("response_type");
  const state = search.get("state");

  React.useEffect(() => {
    if (clientId) {
      ApiHelper.get(`/oauth/clients/clientId/${clientId}`, "MembershipApi").then((client) => {
        if (client) setClientName(client.name);
      });
    }
  }, [clientId]);

  const handleAllow = async () => {
    try {
      const response = await ApiHelper.post("/oauth/authorize", { client_id: clientId, redirect_uri: redirectUri, response_type: responseType, scope: scope, state: state }, "MembershipApi");

      if (response?.code) {
        // Redirect back to the client with the authorization code
        const redirectUrl = new URL(redirectUri || "");
        redirectUrl.searchParams.append("code", response.code);
        if (state) redirectUrl.searchParams.append("state", state);
        window.location.href = redirectUrl.toString();
      }
    } catch (error) {
      console.error("Authorization error:", error);
    }
  };

  return (
    <Box sx={{ display: "flex", backgroundColor: "var(--bg-main)", minHeight: "100vh" }}>
      <div style={{ marginLeft: "auto", marginRight: "auto", paddingTop: 20 }}>
        <Box
          sx={{
            width: 500,
            minHeight: 100,
            backgroundColor: "var(--bg-card)",
            border: "1px solid var(--border-main)",
            borderRadius: "5px",
            padding: "10px",
          }}
          px="16px"
          mx="auto">
          <div style={{ textAlign: "center", margin: 50 }}>
            <img src={"/images/logo-login.png"} alt="logo" />
          </div>
          <Alert severity="info" style={{ fontWeight: "bold" }}>
            AUTHORIZATION REQUIRED
          </Alert>
          <div style={{ marginLeft: 50, marginRight: 50 }}>
            <div style={{ textAlign: "center" }}>
              <Icon style={{ fontSize: 120, marginTop: 30, color: "var(--text-muted)" }}>lock</Icon>
              <h2>{clientName || "Loading..."}</h2>
              <p>
                Would you like to access the following data from <b>{UserHelper.currentUserChurch.church.name}</b> in the above application?
              </p>
            </div>

            <ul>
              <li>Plans</li>
            </ul>
          </div>
          <div style={{ backgroundColor: "var(--bg-sub)", padding: 10 }}>
            <Grid container spacing={2}>
              <Grid size={{ xs: 6 }} style={{ textAlign: "center" }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="error"
                  onClick={() => {
                    window.location.href = redirectUri || "/";
                  }}
                  data-testid="oauth-deny-button"
                  aria-label="Deny authorization">
                  Deny
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }} style={{ textAlign: "center" }}>
                <Button fullWidth variant="contained" color="primary" onClick={handleAllow} data-testid="oauth-allow-button" aria-label="Allow authorization">
                  Allow
                </Button>
              </Grid>
            </Grid>
          </div>
        </Box>
      </div>
    </Box>
  );
};
