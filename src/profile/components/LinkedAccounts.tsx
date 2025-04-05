import React, { useEffect } from "react";
import { Locale, DisplayBox, ApiHelper, SettingInterface } from "@churchapps/apphelper"
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


    // Listen for message from popup
    window.addEventListener('message', async (event) => {
      if (event.origin !== window.location.origin) return;
      const { oauth_token, oauth_verifier } = event.data;
      popup.close();

      try {
        // TODO:  Make sure this listener doesn't get mapps more than once.
        await ApiHelper.get("/praiseCharts/access?verifier=" + encodeURIComponent(oauth_verifier) + "&token=" + encodeURIComponent(oauthToken) + "&secret=" + encodeURIComponent(oauthTokenSecret), "ContentApi");
      } catch { }
      loadData();
    });
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
              {!praiseChartsAccessToken && (<Button variant="contained" color="primary" onClick={() => openOAuthPopup()}>Link</Button>)}
              {praiseChartsAccessToken && (<Button variant="contained" color="error" onClick={unlinkPraiseCharts}>Unlink</Button>)}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </>
  )
}
