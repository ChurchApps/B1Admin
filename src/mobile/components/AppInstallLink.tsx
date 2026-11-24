import React from "react";
import { Button, Link, Stack, Typography } from "@mui/material";
import { Check as CheckIcon, ContentCopy as CopyIcon, QrCode2 as QrIcon } from "@mui/icons-material";
import { Locale, UserHelper } from "@churchapps/apphelper";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";
import { ShareLinkDialog } from "../../components/ShareLinkDialog";
import { RecordHeading, Surface } from "../../components/ui";

// The church's install page on its B1 site; it sends each phone to the right app store.
export const getAppInstallUrl = (): string => EnvironmentHelper.B1Url.replace("{subdomain}", UserHelper.currentUserChurch?.church?.subDomain || "") + "/mobile/install";

export const AppInstallLink: React.FC = () => {
  const [copied, setCopied] = React.useState(false);
  const [showQr, setShowQr] = React.useState(false);
  const url = getAppInstallUrl();

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Surface sx={{ mb: 3 }} aria-labelledby="app-install-heading" data-testid="app-install-link">
      <RecordHeading id="app-install-heading" label={Locale.label("mobile.b1MobilePage.installTitle", "Install link")} />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {Locale.label("mobile.b1MobilePage.installHint", "Members open this link on their phone to get the app. Put the QR code in a bulletin or on a slide.")}
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ xs: "stretch", sm: "center" }} useFlexGap flexWrap="wrap">
        <Link href={url} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ overflowWrap: "anywhere", mr: { sm: 1 } }} data-testid="app-install-url">{url}</Link>
        <Button variant="outlined" size="small" startIcon={copied ? <CheckIcon /> : <CopyIcon />} onClick={handleCopy} data-testid="app-install-copy">
          {copied ? Locale.label("mobile.b1MobilePage.installCopied", "Copied") : Locale.label("common.copy")}
        </Button>
        <Button variant="outlined" size="small" startIcon={<QrIcon />} onClick={() => setShowQr(true)} data-testid="app-install-qr-button">
          {Locale.label("forms.formsPage.qrCode")}
        </Button>
      </Stack>
      {showQr && (
        <ShareLinkDialog
          open={true}
          onClose={() => setShowQr(false)}
          title={Locale.label("mobile.b1MobilePage.installTitle", "Install link")}
          url={url}
          hint={Locale.label("mobile.b1MobilePage.installQrHint", "Scanning this opens the install page for the church's app.")}
          fileName="app-install-qr"
          testIdPrefix="app-install-qr"
        />
      )}
    </Surface>
  );
};
