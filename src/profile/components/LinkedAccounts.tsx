import { useRef } from "react";
import { type SettingInterface } from "@churchapps/helpers";
import { Locale, ApiHelper } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, CardContent, CardMedia, Grid } from "@mui/material";
import { Link as LinkIcon } from "@mui/icons-material";
import { CardWithHeader } from "../../components/ui";

export const LinkedAccounts = () => {
  const settingsQuery = useQuery<SettingInterface[]>({ queryKey: ["/settings/my", "ContentApi"], placeholderData: [] });
  const settings = settingsQuery.data || [];
  const cleanupRef = useRef<(() => void) | null>(null);

  const unlinkPraiseCharts = async () => {
    const token = settings.find((s) => s.keyName === "praiseChartsAccessToken");
    const secret = settings.find((s) => s.keyName === "praiseChartsAccessTokenSecret");
    if (secret) await ApiHelper.delete("/settings/my/" + secret.id, "ContentApi");
    if (token) await ApiHelper.delete("/settings/my/" + token.id, "ContentApi");
    settingsQuery.refetch();
  };

  const openOAuthPopup = async () => {
    const returnUrl = window.location.origin + "/pingback";
    const { authUrl, oauthToken, oauthTokenSecret } = await ApiHelper.get("/praiseCharts/authUrl?returnUrl=" + encodeURIComponent(returnUrl), "ContentApi");

    cleanupRef.current?.();
    const popup = window.open(authUrl, "oauth", "width=600,height=700");

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !popup || event.source !== popup || !event.data?.oauth_verifier) return;
      const { oauth_verifier } = event.data;
      cleanup();
      popup.close();

      try {
        await ApiHelper.get(
          "/praiseCharts/access?verifier=" + encodeURIComponent(oauth_verifier) + "&token=" + encodeURIComponent(oauthToken) + "&secret=" + encodeURIComponent(oauthTokenSecret),
          "ContentApi"
        );
      } catch (error) {
        console.error("Failed to complete OAuth flow:", error);
      }
      settingsQuery.refetch();
    };

    const closeWatch = setInterval(() => {
      if (!popup || popup.closed) setTimeout(cleanup, 2000);
    }, 1000);
    const cleanup = () => {
      clearInterval(closeWatch);
      window.removeEventListener("message", handleMessage);
      if (cleanupRef.current === cleanup) cleanupRef.current = null;
    };
    cleanupRef.current = cleanup;
    window.addEventListener("message", handleMessage);
  };

  const praiseChartsAccessToken = settings.find((s) => s.keyName === "praiseChartsAccessToken")?.value;

  return (
    <CardWithHeader title={Locale.label("profile.profilePage.linkedAccounts")} icon={<LinkIcon />}>
      <Grid container spacing={3}>
        <Grid size={{ sm: 3 }}>
          <Card>
            <CardContent sx={{ textAlign: "center", backgroundColor: "#FFF" }}>
              <CardMedia component="img" image="/images/praisecharts.png" alt="Praise Charts" />
              <br />

              {!praiseChartsAccessToken && (
                <>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      const newWindow = window.open("https://www.praisecharts.com/?XID=churchapps", "_blank");
                      if (newWindow) newWindow.opener = null;
                    }}>
                    {Locale.label("profile.linkedAccounts.signUp")}
                  </Button>
                  &nbsp;
                  <Button variant="contained" color="success" onClick={() => openOAuthPopup()}>
                    {Locale.label("profile.linkedAccounts.link")}
                  </Button>
                </>
              )}
              {praiseChartsAccessToken && (
                <Button variant="contained" onClick={unlinkPraiseCharts}>
                  {Locale.label("profile.linkedAccounts.unlink")}
                </Button>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </CardWithHeader>
  );
};
