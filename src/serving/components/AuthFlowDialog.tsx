import React, { useState, useCallback } from "react";
import { Alert, Avatar, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Link, Stack, Typography } from "@mui/material";
import { ContentCopy as ContentCopyIcon, Check as CheckIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { Locale } from "@churchapps/apphelper";
import { type ProviderInfo, type DeviceAuthorizationResponse } from "@churchapps/content-providers";

export type AuthStatus = "idle" | "loading" | "device_flow" | "pkce_waiting" | "success" | "error";

interface Props {
  open: boolean;
  onClose: () => void;
  provider: ProviderInfo | null;
  authStatus: AuthStatus;
  deviceFlowData: DeviceAuthorizationResponse | null;
  authError: string | null;
  onTryAgain: () => void;
}

export const AuthFlowDialog: React.FC<Props> = ({
  open,
  onClose,
  provider,
  authStatus,
  deviceFlowData,
  authError,
  onTryAgain
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [copied, setCopied] = useState(false);

  const handleCopyCode = useCallback(() => {
    if (deviceFlowData?.user_code) {
      navigator.clipboard.writeText(deviceFlowData.user_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [deviceFlowData]);

  return (
    <Dialog
      open={open}
      onClose={authStatus === "loading" ? undefined : onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          {provider?.logos && (
            <Avatar src={isDark ? provider.logos.dark : provider.logos.light} sx={{ width: 32, height: 32 }} />
          )}
          <span>
            {Locale.label("plans.contentProviderAuth.linkAccount") || "Link"} {provider?.name}
          </span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {authStatus === "loading" && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        )}

        {authStatus === "device_flow" && deviceFlowData && (
          <Stack spacing={3} sx={{ py: 2 }}>
            <Typography>
              {Locale.label("plans.contentProviderAuth.deviceFlowInstructions") ||
                "To link your account, visit the URL below and enter the code:"}
            </Typography>

            <Box sx={{ textAlign: "center" }}>
              <Link
                href={deviceFlowData.verification_uri_complete || deviceFlowData.verification_uri}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontSize: "1.1rem" }}
              >
                {deviceFlowData.verification_uri}
              </Link>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                p: 2,
                bgcolor: "grey.100",
                borderRadius: 2
              }}
            >
              <Typography variant="h4" fontFamily="monospace" fontWeight={700}>
                {deviceFlowData.user_code}
              </Typography>
              <IconButton onClick={handleCopyCode} size="small">
                {copied ? <CheckIcon color="success" /> : <ContentCopyIcon />}
              </IconButton>
            </Box>

            <Alert severity="info">
              {Locale.label("plans.contentProviderAuth.waitingForAuth") ||
                "Waiting for you to authorize... This page will update automatically."}
            </Alert>
          </Stack>
        )}

        {authStatus === "pkce_waiting" && (
          <Stack spacing={3} sx={{ py: 2 }}>
            <Typography>
              {Locale.label("plans.contentProviderAuth.pkceInstructions") ||
                "Complete the sign-in in the popup window."}
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <CircularProgress />
            </Box>
            <Alert severity="info">
              {Locale.label("plans.contentProviderAuth.pkceWaiting") ||
                "Waiting for authorization... If the popup doesn't appear, please allow popups for this site."}
            </Alert>
          </Stack>
        )}

        {authStatus === "success" && (
          <Stack spacing={2} sx={{ py: 2, textAlign: "center" }}>
            <CheckIcon sx={{ fontSize: 64, color: "success.main", mx: "auto" }} />
            <Typography variant="h6" color="success.main">
              {Locale.label("plans.contentProviderAuth.success") || "Account linked successfully!"}
            </Typography>
          </Stack>
        )}

        {authStatus === "error" && (
          <Stack spacing={2} sx={{ py: 2 }}>
            <Alert severity="error">
              {authError || Locale.label("plans.contentProviderAuth.errorGeneric") || "An error occurred during authentication."}
            </Alert>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {authStatus === "error" && (
          <Button onClick={onTryAgain} color="primary">
            {Locale.label("common.tryAgain") || "Try Again"}
          </Button>
        )}
        <Button
          onClick={onClose}
          disabled={authStatus === "loading"}
        >
          {authStatus === "success"
            ? Locale.label("common.close") || "Close"
            : Locale.label("common.cancel") || "Cancel"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
