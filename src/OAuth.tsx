import * as React from "react";
import { ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { Alert, Box, Button, Grid, Icon } from "@mui/material";
import { AuthShell } from "./components/AuthShell";

// Scope strings come from Api shared/auth/Scopes.ts; labels use "_" because ":" is the i18n namespace separator.
const scopeLabel = (scope: string) => {
  if (scope === "plans") return Locale.label("app.oauth.permissionPlans");
  const key = "app.oauth.scopes." + scope.replace(":", "_");
  const label = Locale.label(key);
  return label && label !== key ? label : scope;
};

const parseRedirectUris = (raw: string | string[]) => (Array.isArray(raw) ? raw : (raw || "").split(/[|,\s]+/).filter((u) => u.length > 0));

const redirectHost = (uri: string | null) => {
  try { return uri ? new URL(uri).host : ""; } catch { return ""; }
};

export const OAuthPage: React.FC = () => {
  const [clientName, setClientName] = React.useState<string>("");
  const [clientRedirectUris, setClientRedirectUris] = React.useState<string | string[]>("");
  const [selfRegistered, setSelfRegistered] = React.useState(false);

  const search = new URLSearchParams(window.location.search);
  const clientId = search.get("client_id");
  const redirectUri = search.get("redirect_uri");
  const scope = search.get("scope");
  const responseType = search.get("response_type");
  const state = search.get("state");
  const codeChallenge = search.get("code_challenge");
  const codeChallengeMethod = search.get("code_challenge_method");
  const scopes = (scope || "").split(/[\s,]+/).filter((s) => s.length > 0);
  const returnHost = redirectHost(redirectUri);

  React.useEffect(() => {
    if (clientId) {
      ApiHelper.get(`/oauth/clients/clientId/${clientId}`, "MembershipApi").then((client: any) => {
        if (client) {
          setClientName(client.name);
          setClientRedirectUris(client.redirectUris || "");
          setSelfRegistered(!!client.selfRegistered);
        }
      }).catch(() => setClientName(clientId));
    }
  }, [clientId]);

  if (!UserHelper.currentUserChurch) {
    return <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}><Alert severity="info">{Locale.label("app.oauth.loadingChurchData")}</Alert></Box>;
  }

  const handleAllow = async () => {
    try {
      const response = await ApiHelper.post("/oauth/authorize", { client_id: clientId, redirect_uri: redirectUri, response_type: responseType, scope: scope, state: state, code_challenge: codeChallenge || undefined, code_challenge_method: codeChallengeMethod || undefined }, "MembershipApi");

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
    <AuthShell logoAlt={Locale.label("app.oauth.logoAlt")}>
      <Alert severity="info">
        {Locale.label("app.oauth.authorizationRequired")}
      </Alert>
      <div style={{ marginLeft: 50, marginRight: 50 }}>
        <div style={{ textAlign: "center" }}>
          <Icon sx={{ fontSize: 56, mt: 3, color: "text.secondary" }}>lock</Icon>
          <h2>{clientName || Locale.label("app.oauth.loading")}</h2>
          <p>
            {Locale.label("app.oauth.promptAccess").split("{churchName}").map((part, i, arr) => (
              <React.Fragment key={i}>{part}{i < arr.length - 1 && <b>{UserHelper.currentUserChurch.church.name}</b>}</React.Fragment>
            ))}
          </p>
        </div>

        <ul data-testid="oauth-scopes">
          {scopes.length === 0
            ? <li>{Locale.label("app.oauth.scopes.all")}</li>
            : scopes.map((s) => <li key={s}>{scopeLabel(s)}</li>)}
        </ul>
        {returnHost && (
          <p data-testid="oauth-redirect-host">
            {Locale.label("app.oauth.returnTo").split("{host}").map((part, i, arr) => (
              <React.Fragment key={i}>{part}{i < arr.length - 1 && <b>{returnHost}</b>}</React.Fragment>
            ))}
          </p>
        )}
        {selfRegistered && <Alert severity="warning" data-testid="oauth-self-registered" sx={{ mb: 2 }}>{Locale.label("app.oauth.selfRegisteredNote")}</Alert>}
      </div>
      <Box sx={{ backgroundColor: "var(--b1-canvas)", p: 2 }}>
        <Grid container spacing={2}>
          <Grid size={{ xs: 6 }} style={{ textAlign: "center" }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                if (redirectUri && parseRedirectUris(clientRedirectUris).includes(redirectUri)) {
                  const denyUrl = new URL(redirectUri);
                  denyUrl.searchParams.append("error", "access_denied");
                  if (state) denyUrl.searchParams.append("state", state);
                  window.location.href = denyUrl.toString();
                  return;
                }
                const target = redirectUri || "/";
                const isSafeRelative = target.startsWith("/") && !target.startsWith("//");
                window.location.href = isSafeRelative ? target : "/";
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
    </AuthShell>
  );
};
