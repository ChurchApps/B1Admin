import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  Avatar,
  Alert,
  Link,
} from "@mui/material";
import {
  Link as LinkIcon,
  LinkOff as LinkOffIcon,
  Refresh as RefreshIcon,
  ContentCopy as ContentCopyIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import {
  getProvider,
  getAvailableProviders,
  type ContentProvider,
  type ContentProviderAuthData,
  type DeviceAuthorizationResponse,
} from "@churchapps/content-provider-helper";
import { type ContentProviderAuthInterface } from "../../helpers";
import { ContentProviderAuthHelper } from "../../helpers/ContentProviderAuthHelper";

interface Props {
  ministryId: string;
  onAuthChange?: () => void;
}

type AuthStatus = "idle" | "loading" | "device_flow" | "pkce_waiting" | "success" | "error";

export const ContentProviderAuthManager: React.FC<Props> = ({ ministryId, onAuthChange }) => {
  const [linkedProviders, setLinkedProviders] = useState<ContentProviderAuthInterface[]>([]);
  const [loading, setLoading] = useState(true);

  // Auth flow state
  const [authProviderId, setAuthProviderId] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  const [deviceFlowData, setDeviceFlowData] = useState<DeviceAuthorizationResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // PKCE state
  const [codeVerifier, setCodeVerifier] = useState<string | null>(null);
  const [pkceWindow, setPkceWindow] = useState<Window | null>(null);

  const availableProviders = useMemo(() => getAvailableProviders(), []);

  // Get providers that require auth
  const authProviders = useMemo(() => {
    return availableProviders.filter(p => p.requiresAuth && p.implemented);
  }, [availableProviders]);

  const loadLinkedProviders = useCallback(async () => {
    if (!ministryId) {
      setLinkedProviders([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const linked = await ContentProviderAuthHelper.getLinkedProviders(ministryId);
      setLinkedProviders(linked || []);
    } catch (error) {
      console.error("Error loading linked providers:", error);
      setLinkedProviders([]);
    } finally {
      setLoading(false);
    }
  }, [ministryId]);

  useEffect(() => {
    loadLinkedProviders();
  }, [loadLinkedProviders]);

  // Check if a provider is linked
  const isProviderLinked = useCallback((providerId: string): boolean => {
    return linkedProviders.some(lp => lp.providerId === providerId);
  }, [linkedProviders]);

  // Get linked auth record for a provider
  const getLinkedAuth = useCallback((providerId: string): ContentProviderAuthInterface | undefined => {
    return linkedProviders.find(lp => lp.providerId === providerId);
  }, [linkedProviders]);

  // Handle unlinking a provider
  const handleUnlink = useCallback(async (providerId: string) => {
    const auth = getLinkedAuth(providerId);
    if (!auth?.id) return;

    try {
      await ContentProviderAuthHelper.removeAuth(auth.id);
      await loadLinkedProviders();
      if (onAuthChange) onAuthChange();
    } catch (error) {
      console.error("Error unlinking provider:", error);
    }
  }, [getLinkedAuth, loadLinkedProviders, onAuthChange]);

  // Start device flow authentication
  const startDeviceFlow = useCallback(async (providerId: string) => {
    const provider = getProvider(providerId);
    if (!provider) return;

    setAuthProviderId(providerId);
    setAuthStatus("loading");
    setAuthError(null);
    setDeviceFlowData(null);

    try {
      const deviceResponse = await provider.initiateDeviceFlow();
      if (!deviceResponse) {
        setAuthError("Failed to start device flow");
        setAuthStatus("error");
        return;
      }

      setDeviceFlowData(deviceResponse);
      setAuthStatus("device_flow");

      // Start polling for token
      pollDeviceFlowToken(provider, deviceResponse.device_code, deviceResponse.interval || 5);
    } catch (error) {
      console.error("Error starting device flow:", error);
      setAuthError("Failed to start authentication");
      setAuthStatus("error");
    }
  }, []);

  // Poll for device flow token
  const pollDeviceFlowToken = useCallback(async (
    provider: ContentProvider,
    deviceCode: string,
    interval: number
  ) => {
    const poll = async () => {
      try {
        const result = await provider.pollDeviceFlowToken(deviceCode);

        if (result && "access_token" in result) {
          // Success - we have the token
          await ContentProviderAuthHelper.storeAuth(ministryId, provider.id, result);
          setAuthStatus("success");
          await loadLinkedProviders();
          if (onAuthChange) onAuthChange();

          // Auto-close after success
          setTimeout(() => {
            setAuthProviderId(null);
            setAuthStatus("idle");
            setDeviceFlowData(null);
          }, 2000);
          return;
        }

        if (result && "error" in result) {
          if (result.error === "authorization_pending" || result.error === "slow_down") {
            // Keep polling
            const nextInterval = result.error === "slow_down" ? interval + 5 : interval;
            setTimeout(() => poll(), nextInterval * 1000);
            return;
          }

          // Other error - stop polling
          setAuthError(result.error_description || result.error);
          setAuthStatus("error");
          return;
        }

        // Null result - expired or failed
        setAuthError("Authentication expired or failed");
        setAuthStatus("error");
      } catch (error) {
        console.error("Error polling device flow:", error);
        setAuthError("Authentication failed");
        setAuthStatus("error");
      }
    };

    // Start polling after initial interval
    setTimeout(poll, interval * 1000);
  }, [ministryId, loadLinkedProviders, onAuthChange]);

  // Start PKCE OAuth flow
  const startPKCEFlow = useCallback(async (providerId: string) => {
    const provider = getProvider(providerId);
    if (!provider) return;

    setAuthProviderId(providerId);
    setAuthStatus("loading");
    setAuthError(null);

    try {
      // Generate code verifier
      const verifier = provider.generateCodeVerifier();
      setCodeVerifier(verifier);

      // Build auth URL
      const redirectUri = `${window.location.origin}/oauth/callback`;
      const authResult = await provider.buildAuthUrl(verifier, redirectUri);

      // Open popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        authResult.url,
        "oauth_popup",
        `width=${width},height=${height},left=${left},top=${top},popup=yes`
      );

      if (!popup) {
        setAuthError("Failed to open popup. Please allow popups for this site.");
        setAuthStatus("error");
        return;
      }

      setPkceWindow(popup);
      setAuthStatus("pkce_waiting");

      // Listen for the callback
      const handleMessage = async (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === "oauth_callback" && event.data?.providerId === providerId) {
          window.removeEventListener("message", handleMessage);

          if (event.data.error) {
            setAuthError(event.data.error_description || event.data.error);
            setAuthStatus("error");
            return;
          }

          if (event.data.code) {
            try {
              // Exchange code for tokens
              const tokens = await provider.exchangeCodeForTokens(
                event.data.code,
                verifier,
                redirectUri
              );

              if (tokens) {
                await ContentProviderAuthHelper.storeAuth(ministryId, providerId, tokens);
                setAuthStatus("success");
                await loadLinkedProviders();
                if (onAuthChange) onAuthChange();

                // Auto-close after success
                setTimeout(() => {
                  setAuthProviderId(null);
                  setAuthStatus("idle");
                  setCodeVerifier(null);
                }, 2000);
              } else {
                setAuthError("Failed to exchange code for tokens");
                setAuthStatus("error");
              }
            } catch (error) {
              console.error("Error exchanging code:", error);
              setAuthError("Failed to complete authentication");
              setAuthStatus("error");
            }
          }
        }
      };

      window.addEventListener("message", handleMessage);

      // Check if popup is closed
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", handleMessage);
          if (authStatus === "pkce_waiting") {
            setAuthStatus("idle");
            setAuthProviderId(null);
          }
        }
      }, 500);
    } catch (error) {
      console.error("Error starting PKCE flow:", error);
      setAuthError("Failed to start authentication");
      setAuthStatus("error");
    }
  }, [ministryId, loadLinkedProviders, onAuthChange, authStatus]);

  // Handle link button click
  const handleLink = useCallback((providerId: string) => {
    const provider = getProvider(providerId);
    if (!provider) return;

    // Prefer device flow if supported
    if (provider.supportsDeviceFlow()) {
      startDeviceFlow(providerId);
    } else {
      startPKCEFlow(providerId);
    }
  }, [startDeviceFlow, startPKCEFlow]);

  // Copy user code to clipboard
  const handleCopyCode = useCallback(() => {
    if (deviceFlowData?.user_code) {
      navigator.clipboard.writeText(deviceFlowData.user_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [deviceFlowData]);

  // Close auth dialog
  const handleCloseDialog = useCallback(() => {
    if (pkceWindow && !pkceWindow.closed) {
      pkceWindow.close();
    }
    setAuthProviderId(null);
    setAuthStatus("idle");
    setDeviceFlowData(null);
    setAuthError(null);
    setCodeVerifier(null);
    setPkceWindow(null);
  }, [pkceWindow]);

  // Get current provider being authenticated
  const currentProvider = useMemo(() => {
    if (!authProviderId) return null;
    return availableProviders.find(p => p.id === authProviderId);
  }, [authProviderId, availableProviders]);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (authProviders.length === 0) {
    return (
      <Typography color="text.secondary">
        {Locale.label("plans.contentProviderAuth.noProvidersAvailable") || "No content providers available that require authentication."}
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>
        {Locale.label("plans.contentProviderAuth.title") || "Content Provider Accounts"}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {Locale.label("plans.contentProviderAuth.description") || "Link your content provider accounts to access their content in your service plans."}
      </Typography>

      <Stack spacing={2}>
        {authProviders.map((providerInfo) => {
          const isLinked = isProviderLinked(providerInfo.id);
          const linkedAuth = getLinkedAuth(providerInfo.id);

          return (
            <Card key={providerInfo.id} variant="outlined">
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Avatar
                    src={providerInfo.logo}
                    alt={providerInfo.name}
                    sx={{ width: 48, height: 48 }}
                  >
                    {providerInfo.name.charAt(0)}
                  </Avatar>

                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {providerInfo.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isLinked
                        ? Locale.label("plans.contentProviderAuth.linked") || "Account linked"
                        : Locale.label("plans.contentProviderAuth.notLinked") || "Not linked"}
                    </Typography>
                    {isLinked && linkedAuth?.expiresAt && (
                      <Typography variant="caption" color="text.secondary">
                        {new Date(linkedAuth.expiresAt) > new Date()
                          ? `Expires: ${new Date(linkedAuth.expiresAt).toLocaleDateString()}`
                          : "Token expired - please re-link"}
                      </Typography>
                    )}
                  </Box>

                  <Stack direction="row" spacing={1}>
                    {isLinked ? (
                      <>
                        <IconButton
                          onClick={() => handleLink(providerInfo.id)}
                          title={Locale.label("plans.contentProviderAuth.refresh") || "Refresh"}
                          size="small"
                        >
                          <RefreshIcon />
                        </IconButton>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<LinkOffIcon />}
                          onClick={() => handleUnlink(providerInfo.id)}
                        >
                          {Locale.label("plans.contentProviderAuth.unlink") || "Unlink"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<LinkIcon />}
                        onClick={() => handleLink(providerInfo.id)}
                      >
                        {Locale.label("plans.contentProviderAuth.link") || "Link Account"}
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Auth Dialog */}
      <Dialog
        open={!!authProviderId}
        onClose={authStatus === "loading" ? undefined : handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            {currentProvider?.logo && (
              <Avatar src={currentProvider.logo} sx={{ width: 32, height: 32 }} />
            )}
            <span>
              {Locale.label("plans.contentProviderAuth.linkAccount") || "Link"} {currentProvider?.name}
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
                  borderRadius: 2,
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
            <Button onClick={() => handleLink(authProviderId!)} color="primary">
              {Locale.label("common.tryAgain") || "Try Again"}
            </Button>
          )}
          <Button
            onClick={handleCloseDialog}
            disabled={authStatus === "loading"}
          >
            {authStatus === "success"
              ? Locale.label("common.close") || "Close"
              : Locale.label("common.cancel") || "Cancel"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
