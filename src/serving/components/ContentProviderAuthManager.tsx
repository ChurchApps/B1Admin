import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Box, Button, Card, CardContent, CircularProgress, IconButton, Stack, Typography, Avatar } from "@mui/material";
import { Link as LinkIcon, LinkOff as LinkOffIcon, Refresh as RefreshIcon, Add as AddIcon } from "@mui/icons-material";
import { useTheme } from "@mui/material/styles";
import { Locale } from "@churchapps/apphelper";
import { getProvider, getAvailableProviders, type ContentProvider, type DeviceAuthorizationResponse } from "@churchapps/content-provider-helper";
import { type ContentProviderAuthInterface } from "../../helpers";
import { ContentProviderAuthHelper } from "../../helpers/ContentProviderAuthHelper";
import { ProviderSelectorModal } from "./ProviderSelectorModal";
import { AuthFlowDialog, type AuthStatus } from "./AuthFlowDialog";

interface Props {
  ministryId: string;
  onAuthChange?: () => void;
}

export const ContentProviderAuthManager: React.FC<Props> = ({ ministryId, onAuthChange }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [linkedProviders, setLinkedProviders] = useState<ContentProviderAuthInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProviderSelector, setShowProviderSelector] = useState(false);

  // Auth flow state
  const [authProviderId, setAuthProviderId] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  const [deviceFlowData, setDeviceFlowData] = useState<DeviceAuthorizationResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // PKCE state
  const [codeVerifier, setCodeVerifier] = useState<string | null>(null);
  const [pkceWindow, setPkceWindow] = useState<Window | null>(null);

  const availableProviders = useMemo(() => getAvailableProviders(), []);

  // Get implemented providers
  const authProviders = useMemo(() => {
    return availableProviders.filter(p => p.implemented);
  }, [availableProviders]);

  // Providers not yet linked (for modal)
  const unlinkableProviders = useMemo(() => {
    const linkedIds = new Set(linkedProviders.map(lp => lp.providerId));
    return authProviders.filter(p => !linkedIds.has(p.id));
  }, [authProviders, linkedProviders]);

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
  const handleLink = useCallback(async (providerId: string) => {
    const providerInfo = availableProviders.find(p => p.id === providerId);
    if (!providerInfo) return;

    // For providers that don't require auth, just store a record with placeholder values
    if (!providerInfo.requiresAuth) {
      setShowProviderSelector(false);
      try {
        const now = Math.floor(Date.now() / 1000);
        console.log("Storing auth for public API provider:", providerId);
        await ContentProviderAuthHelper.storeAuth(ministryId, providerId, {
          access_token: "public_api",
          refresh_token: "",
          token_type: "none",
          created_at: now,
          expires_in: 60 * 60 * 24 * 365 * 10, // 10 years
          scope: ""
        });
        console.log("Auth stored, reloading linked providers");
        await loadLinkedProviders();
        console.log("Linked providers reloaded:", linkedProviders);
        if (onAuthChange) onAuthChange();
      } catch (error) {
        console.error("Error linking provider:", error);
      }
      return;
    }

    const provider = getProvider(providerId);
    if (!provider) return;

    setShowProviderSelector(false);

    // Prefer device flow if supported
    if (provider.supportsDeviceFlow()) {
      startDeviceFlow(providerId);
    } else {
      startPKCEFlow(providerId);
    }
  }, [availableProviders, ministryId, loadLinkedProviders, onAuthChange, startDeviceFlow, startPKCEFlow]);

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
    return availableProviders.find(p => p.id === authProviderId) || null;
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
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h6">
          {Locale.label("plans.contentProviderAuth.title") || "Content Provider Accounts"}
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setShowProviderSelector(true)}
        >
          {Locale.label("plans.contentProviderAuth.linkNew") || "Link New Provider"}
        </Button>
      </Stack>


      {linkedProviders.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <LinkIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            {Locale.label("plans.contentProviderAuth.noLinkedDescription") || "Link a content provider to access their content in your service plans."}
          </Typography>
        </Card>
      ) : (
        <Stack spacing={2}>
          {linkedProviders.map((linkedAuth) => {
            const providerInfo = availableProviders.find(p => p.id === linkedAuth.providerId);
            if (!providerInfo) return null;

            return (
              <Card key={linkedAuth.id} variant="outlined">
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      src={isDark ? providerInfo.logos?.dark : providerInfo.logos?.light}
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
                        {Locale.label("plans.contentProviderAuth.linked") || "Account linked"}
                      </Typography>
                      {linkedAuth?.expiresAt && (
                        <Typography variant="caption" color="text.secondary">
                          {new Date(linkedAuth.expiresAt) > new Date()
                            ? `Expires: ${new Date(linkedAuth.expiresAt).toLocaleDateString()}`
                            : "Token expired - please re-link"}
                        </Typography>
                      )}
                    </Box>

                    <Stack direction="row" spacing={1}>
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
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            );
          })}
        </Stack>
      )}

      <ProviderSelectorModal
        open={showProviderSelector}
        onClose={() => setShowProviderSelector(false)}
        providers={unlinkableProviders}
        onSelectProvider={handleLink}
      />

      <AuthFlowDialog
        open={!!authProviderId}
        onClose={handleCloseDialog}
        provider={currentProvider}
        authStatus={authStatus}
        deviceFlowData={deviceFlowData}
        authError={authError}
        onTryAgain={() => handleLink(authProviderId!)}
      />
    </Box>
  );
};
