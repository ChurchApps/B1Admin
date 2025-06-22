import React, { useEffect } from "react";
import { Locale, DisplayBox, ApiHelper, type SettingInterface } from "@churchapps/apphelper"
import { Button, Card, CardContent, CardMedia, Grid, Icon } from "@mui/material";

export const LinkedAccounts = () => {

  const [settings, setSettings] = React.useState<SettingInterface[]>([]);

  const loadData = () => {
    ApiHelper.get("/settings/my", "ContentApi").then(data => { setSettings(data); });
  }

  const unlinkPraiseCharts = async () => {
    const token = settings.find(s => s.keyName === "praiseChartsAccessToken");
    const secret = settings.find(s => s.keyName === "praiseChartsAccessTokenSecret");
    if (secret) await ApiHelper.delete("/settings/my/" + secret.id, "ContentApi");
    if (token) await ApiHelper.delete("/settings/my/" + token.id, "ContentApi");
    loadData();
  }

  const openOAuthPopup = async () => {
    const returnUrl = window.location.origin + "/pingback"
    const { authUrl, oauthToken, oauthTokenSecret } = await ApiHelper.get("/praiseCharts/authUrl?returnUrl=" + encodeURIComponent(returnUrl), "ContentApi");

    const popup = window.open(authUrl, 'oauth', 'width=600,height=700');

    const handleMessage = async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const { oauth_token, oauth_verifier } = event.data;
      if (popup) popup.close();

      try {
        await ApiHelper.get("/praiseCharts/access?verifier=" + encodeURIComponent(oauth_verifier) + "&token=" + encodeURIComponent(oauthToken) + "&secret=" + encodeURIComponent(oauthTokenSecret), "ContentApi");
      } catch (error) {
        console.error("Failed to complete OAuth flow:", error);
      }
      loadData();
      window.removeEventListener('message', handleMessage);
    };

    // Listen for message from popup
    window.addEventListener('message', handleMessage);
  };

  useEffect(loadData, []);

  const praiseChartsAccessToken = settings.find(s => s.keyName === "praiseChartsAccessToken")?.value;

  return (
    <>
      <div style={{ marginBottom: 15 }}><b>{Locale.label("profile.profilePage.linkedAccounts")}</b></div>
      <Grid container spacing={3} style={{ marginBottom: 25 }}>
        <Grid item sm={3}>
          <Card>
            <CardContent sx={{ textAlign: "center" }}>
              <CardMedia component="img" image="/images/praisecharts.png" alt="Praise Charts" />
              <br />

              {!praiseChartsAccessToken && (<>
                <Button variant="contained" color="primary" onClick={() => { 
                  const newWindow = window.open("https://www.praisecharts.com/?XID=churchapps", "_blank");
                  if (newWindow) newWindow.opener = null;
                }}>Sign-up</Button>
                &nbsp;
                <Button variant="contained" color="success" onClick={() => openOAuthPopup()}>Link</Button>
              </>)}
              {praiseChartsAccessToken && (<Button variant="contained" color="error" onClick={unlinkPraiseCharts}>Unlink</Button>)}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}
