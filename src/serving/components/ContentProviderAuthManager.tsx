import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Box, Button, Card, CardContent, CircularProgress, IconButton, Stack, Typography } from "@mui/material";
import { Link as LinkIcon, LinkOff as LinkOffIcon, Refresh as RefreshIcon, Add as AddIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { getProvider, getAvailableProviders, type IProvider, type DeviceAuthorizationResponse } from "@churchapps/content-providers";
import { type ContentProviderAuthInterface } from "../../helpers";
import { ContentProviderAuthHelper } from "../../helpers/ContentProviderAuthHelper";
import { ProviderSelectorModal } from "./ProviderSelectorModal";
import { AuthFlowDialog, type AuthStatus } from "./AuthFlowDialog";

interface Props {
  ministryId: string;
  onAuthChange?: () => void;
}

export const ContentProviderAuthManager: React.FC<Props> = ({ ministryId, onAuthChange }) => {
  console.log("[ContentProviderAuthManager] Render with ministryId:", ministryId);

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

  // Polling cancellation: bumping the generation invalidates any outstanding poll closures,
  // so closing the dialog (or starting a new flow) stops the previous chain.
  const pollGenerationRef = useRef(0);
  const activePollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelActivePolls = useCallback(() => {
    pollGenerationRef.current += 1;
    if (activePollTimeoutRef.current) {
      clearTimeout(activePollTimeoutRef.current);
      activePollTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => { cancelActivePolls(); }, [cancelActivePolls]);

  const availableProviders = useMemo(() => {
    const providers = getAvailableProviders(["lessonschurch", "signpresenter", "bibleproject", "dropbox", "jesusfilm"]);
    console.log("[ContentProviderAuthManager] availableProviders:", providers);
    return providers;
  }, []);

  // Get implemented providers
  const authProviders = useMemo(() => {
    const implemented = availableProviders.filter(p => p.implemented);
    console.log("[ContentProviderAuthManager] authProviders (implemented):", implemented);
    return implemented;
  }, [availableProviders]);

  // Providers not yet linked (for modal)
  const unlinkableProviders = useMemo(() => {
    const linkedIds = new Set(linkedProviders.map(lp => lp.providerId));
    return authProviders.filter(p => !linkedIds.has(p.id));
  }, [authProviders, linkedProviders]);

  const loadLinkedProviders = useCallback(async () => {
    console.log("[ContentProviderAuthManager] loadLinkedProviders called, ministryId:", ministryId);
    if (!ministryId) {
      console.log("[ContentProviderAuthManager] No ministryId, clearing providers");
      setLinkedProviders([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      console.log("[ContentProviderAuthManager] Fetching linked providers...");
      const linked = await ContentProviderAuthHelper.getLinkedProviders(ministryId);
      console.log("[ContentProviderAuthManager] API returned:", linked);
      setLinkedProviders(linked || []);
    } catch (error) {
      console.error("[ContentProviderAuthManager] Error loading linked providers:", error);
      setLinkedProviders([]);
    } finally {
      console.log("[ContentProviderAuthManager] Setting loading to false");
      setLoading(false);
    }
  }, [ministryId]);

  useEffect(() => {
    console.log("[ContentProviderAuthManager] useEffect triggered, calling loadLinkedProviders");
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
      if (!("initiateDeviceFlow" in provider)) {
        setAuthError(Locale.label("plans.contentProviderAuth.deviceFlowUnsupported"));
        setAuthStatus("error");
        return;
      }
      const deviceResponse = await (provider as any).initiateDeviceFlow();
      if (!deviceResponse) {
        setAuthError(Locale.label("plans.contentProviderAuth.deviceFlowFailed"));
        setAuthStatus("error");
        return;
      }

      setDeviceFlowData(deviceResponse);
      setAuthStatus("device_flow");

      // Start polling for token
      pollDeviceFlowToken(provider, deviceResponse.device_code, deviceResponse.interval || 5);
    } catch (error) {
      console.error("Error starting device flow:", error);
      setAuthError(Locale.label("plans.contentProviderAuth.startAuthFailed"));
      setAuthStatus("error");
    }
  }, []);

  // Poll for device flow token
  const pollDeviceFlowToken = useCallback(async (
    provider: IProvider,
    deviceCode: string,
    initialInterval: number
  ) => {
    cancelActivePolls();
    const generation = pollGenerationRef.current;
    // RFC 8628 §3.5: once the server returns slow_down, the increased interval must persist
    // for subsequent polls. Storing this in a closure-local `let` instead of recomputing
    // `interval + 5` each time keeps the bump compounding correctly.
    let currentInterval = initialInterval;

    const isCancelled = () => generation !== pollGenerationRef.current;

    const poll = async () => {
      if (isCancelled()) return;
      if (!("pollDeviceFlowToken" in provider) || typeof provider.pollDeviceFlowToken !== "function") return;
      try {
        const result = await (provider as any).pollDeviceFlowToken(deviceCode);
        if (isCancelled()) return;

        if (result && "access_token" in result) {
          // Success - we have the token
          await ContentProviderAuthHelper.storeAuth(ministryId, provider.id, result);
          if (isCancelled()) return;
          setAuthStatus("success");
          await loadLinkedProviders();
          if (onAuthChange) onAuthChange();

          // Auto-close after success
          activePollTimeoutRef.current = setTimeout(() => {
            if (isCancelled()) return;
            setAuthProviderId(null);
            setAuthStatus("idle");
            setDeviceFlowData(null);
          }, 2000);
          return;
        }

        if (result && "error" in result) {
          if (result.error === "authorization_pending" || result.error === "slow_down") {
            if (result.error === "slow_down") currentInterval += 5;
            activePollTimeoutRef.current = setTimeout(poll, currentInterval * 1000);
            return;
          }

          // Other error - stop polling
          setAuthError(result.error_description || result.error);
          setAuthStatus("error");
          return;
        }

        // Null result - expired or failed
        setAuthError(Locale.label("plans.contentProviderAuth.authExpired"));
        setAuthStatus("error");
      } catch (error) {
        if (isCancelled()) return;
        console.error("Error polling device flow:", error);
        setAuthError(Locale.label("plans.contentProviderAuth.authFailed"));
        setAuthStatus("error");
      }
    };

    activePollTimeoutRef.current = setTimeout(poll, currentInterval * 1000);
  }, [ministryId, loadLinkedProviders, onAuthChange, cancelActivePolls]);

  // Start PKCE OAuth flow
  const startPKCEFlow = useCallback(async (providerId: string) => {
    const provider = getProvider(providerId);
    if (!provider) return;

    setAuthProviderId(providerId);
    setAuthStatus("loading");
    setAuthError(null);

    try {
      if (!("generateCodeVerifier" in provider) || !("buildAuthUrl" in provider)) {
        setAuthError(Locale.label("plans.contentProviderAuth.pkceUnsupported"));
        setAuthStatus("error");
        return;
      }

      // Step 1: Create a relay session on the API
      const relayData = await ApiHelper.post("/oauth/relay/sessions", { provider: providerId }, "MembershipApi");
      if (!relayData?.sessionCode || !relayData?.redirectUri) {
        setAuthError(Locale.label("plans.contentProviderAuth.sessionFailed"));
        setAuthStatus("error");
        return;
      }

      const { sessionCode, redirectUri, expiresIn } = relayData;

      // Step 2: Generate code verifier and build auth URL using relay redirect
      const verifier = (provider as any).generateCodeVerifier();
      setCodeVerifier(verifier);

      const authResult = await (provider as any).buildAuthUrl(verifier, redirectUri, sessionCode);

      // Step 3: Open popup window
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
        setAuthError(Locale.label("plans.contentProviderAuth.popupBlocked"));
        setAuthStatus("error");
        return;
      }

      setPkceWindow(popup);
      setAuthStatus("pkce_waiting");

      cancelActivePolls();
      const generation = pollGenerationRef.current;
      const isCancelled = () => generation !== pollGenerationRef.current;

      // Step 4: Poll the relay for the auth code
      const expiresAt = Date.now() + (expiresIn || 300) * 1000;

      const poll = async () => {
        if (isCancelled()) return;
        if (popup.closed) {
          setAuthStatus("idle");
          setAuthProviderId(null);
          return;
        }

        if (Date.now() >= expiresAt) {
          popup.close();
          setAuthError(Locale.label("plans.contentProviderAuth.sessionExpired"));
          setAuthStatus("error");
          return;
        }

        try {
          const result = await ApiHelper.getAnonymous(`/oauth/relay/sessions/${sessionCode}`, "MembershipApi");
          if (isCancelled()) return;

          if (result?.status === "completed" && result?.authCode) {
            popup.close();

            // Exchange code for tokens
            const tokens = await (provider as any).exchangeCodeForTokens(
              result.authCode,
              verifier,
              redirectUri
            );
            if (isCancelled()) return;

            if (tokens) {
              await ContentProviderAuthHelper.storeAuth(ministryId, providerId, tokens);
              if (isCancelled()) return;
              setAuthStatus("success");
              await loadLinkedProviders();
              if (onAuthChange) onAuthChange();

              activePollTimeoutRef.current = setTimeout(() => {
                if (isCancelled()) return;
                setAuthProviderId(null);
                setAuthStatus("idle");
                setCodeVerifier(null);
              }, 2000);
            } else {
              setAuthError(Locale.label("plans.contentProviderAuth.tokenExchangeFailed"));
              setAuthStatus("error");
            }
            return;
          }

          // Still pending — poll again
          activePollTimeoutRef.current = setTimeout(poll, 3000);
        } catch (error) {
          if (isCancelled()) return;
          console.error("Polling error:", error);
          activePollTimeoutRef.current = setTimeout(poll, 5000);
        }
      };

      activePollTimeoutRef.current = setTimeout(poll, 3000);
    } catch (error) {
      console.error("Error starting PKCE flow:", error);
      setAuthError(Locale.label("plans.contentProviderAuth.startAuthFailed"));
      setAuthStatus("error");
    }
  }, [ministryId, loadLinkedProviders, onAuthChange, cancelActivePolls]);

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
    cancelActivePolls();
    if (pkceWindow && !pkceWindow.closed) {
      pkceWindow.close();
    }
    setAuthProviderId(null);
    setAuthStatus("idle");
    setDeviceFlowData(null);
    setAuthError(null);
    setCodeVerifier(null);
    setPkceWindow(null);
  }, [pkceWindow, cancelActivePolls]);

  // Get current provider being authenticated
  const currentProvider = useMemo(() => {
    if (!authProviderId) return null;
    return availableProviders.find(p => p.id === authProviderId) || null;
  }, [authProviderId, availableProviders]);

  console.log("[ContentProviderAuthManager] Render state - loading:", loading, "authProviders.length:", authProviders.length, "linkedProviders:", linkedProviders);

  if (loading) {
    console.log("[ContentProviderAuthManager] Showing loading spinner");
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (authProviders.length === 0) {
    console.log("[ContentProviderAuthManager] No authProviders, showing empty message");
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
                    <Box
                      sx={{
                        width: 64,
                        height: 64,
                        borderRadius: 2,
                        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        p: 1,
                        flexShrink: 0
                      }}
                    >
                      <Box
                        component="img"
                        src={providerInfo.logos?.dark || providerInfo.logos?.light}
                        alt={providerInfo.name}
                        sx={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain"
                        }}
                      />
                    </Box>

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
                            ? `${Locale.label("plans.contentProviderAuth.expiresPrefix")} ${new Date(linkedAuth.expiresAt).toLocaleDateString()}`
                            : Locale.label("plans.contentProviderAuth.tokenExpired")}
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
