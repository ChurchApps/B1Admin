import { useRef } from "react";
import { type SettingInterface } from "@churchapps/helpers";
import { Locale, ApiHelper } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Stack, Typography } from "@mui/material";
import { Link as LinkIcon, LinkOff as UnlinkIcon } from "@mui/icons-material";
import { RecordHeading, TextAction } from "../../components/ui";

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
    <Box component="section" data-testid="linked-accounts">
      <RecordHeading label={Locale.label("profile.profilePage.linkedAccounts")} />
      <Stack direction={{ xs: "column", sm: "row" }} spacing={3} alignItems={{ xs: "flex-start", sm: "center" }} useFlexGap flexWrap="wrap">
        <Box component="img" src="/images/praisecharts.png" alt="PraiseCharts" sx={{ height: 36, width: "auto", display: "block" }} />
        <Typography variant="body2" color="text.secondary" sx={{ flex: 1, minWidth: 0 }}>
          {praiseChartsAccessToken ? Locale.label("profile.linkedAccounts.linked", "Linked") : Locale.label("profile.linkedAccounts.notLinked", "Not linked")}
        </Typography>
        <Stack direction="row" spacing={2} alignItems="center">
          {!praiseChartsAccessToken && (
            <>
              <TextAction
                small
                onClick={() => {
                  const newWindow = window.open("https://www.praisecharts.com/?XID=churchapps", "_blank");
                  if (newWindow) newWindow.opener = null;
                }}>
                {Locale.label("profile.linkedAccounts.signUp")}
              </TextAction>
              <Button variant="outlined" startIcon={<LinkIcon />} onClick={() => openOAuthPopup()}>
                {Locale.label("profile.linkedAccounts.link")}
              </Button>
            </>
          )}
          {praiseChartsAccessToken && (
            <Button variant="outlined" startIcon={<UnlinkIcon />} onClick={unlinkPraiseCharts}>
              {Locale.label("profile.linkedAccounts.unlink")}
            </Button>
          )}
        </Stack>
      </Stack>
    </Box>
  );
};
