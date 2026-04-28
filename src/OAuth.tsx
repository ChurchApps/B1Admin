import * as React from "react";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
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

  if (!UserHelper.currentUserChurch) {
    return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}><Alert severity="info">{Locale.label("app.oauth.loadingChurchData")}</Alert></Box>;
  }

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
    <Box sx={{ display: "flex", backgroundColor: "background.default", minHeight: "100vh" }}>
      <div style={{ marginLeft: "auto", marginRight: "auto", paddingTop: 20 }}>
        <Box
          sx={{
            width: 500,
            minHeight: 100,
            backgroundColor: "background.paper",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "5px",
            padding: "10px"
          }}
          px="16px"
          mx="auto">
          <div style={{ textAlign: "center", margin: 50 }}>
            <img src={"/images/logo-login.png"} alt={Locale.label("app.oauth.logoAlt")} />
          </div>
          <Alert severity="info" style={{ fontWeight: "bold" }}>
            {Locale.label("app.oauth.authorizationRequired")}
          </Alert>
          <div style={{ marginLeft: 50, marginRight: 50 }}>
            <div style={{ textAlign: "center" }}>
              <Icon sx={{ fontSize: 120, mt: 3.75, color: "text.secondary" }}>lock</Icon>
              <h2>{clientName || Locale.label("app.oauth.loading")}</h2>
              <p>
                <span dangerouslySetInnerHTML={{ __html: Locale.label("app.oauth.promptAccess").replace("{churchName}", "<b>" + UserHelper.currentUserChurch.church.name + "</b>") }} />
              </p>
            </div>

            <ul>
              <li>{Locale.label("app.oauth.permissionPlans")}</li>
            </ul>
          </div>
          <Box sx={{ backgroundColor: "action.hover", padding: "10px" }}>
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
                  aria-label={Locale.label("app.oauth.denyAria")}>
                  {Locale.label("app.oauth.deny")}
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }} style={{ textAlign: "center" }}>
                <Button fullWidth variant="contained" color="primary" onClick={handleAllow} data-testid="oauth-allow-button" aria-label={Locale.label("app.oauth.allowAria")}>
                  {Locale.label("app.oauth.allow")}
                </Button>
              </Grid>
            </Grid>
          </Box>
        </Box>
      </div>
    </Box>
  );
};
