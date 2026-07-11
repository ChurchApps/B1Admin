import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Box, Button, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import { Link as LinkIcon, LinkOff as LinkOffIcon, Refresh as RefreshIcon, Add as AddIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { getProvider, getAvailableProviders, type IProvider, type DeviceAuthorizationResponse } from "@churchapps/content-providers";
import { type ContentProviderAuthInterface } from "../../helpers";
import { ContentProviderAuthHelper } from "../../helpers/ContentProviderAuthHelper";
import { SERVING_PROVIDER_IDS } from "../servingProviders";
import { ProviderSelectorModal } from "./ProviderSelectorModal";
import { AuthFlowDialog, type AuthStatus } from "./AuthFlowDialog";

interface Props {
  ministryId: string;
  onAuthChange?: () => void;
}

export const ContentProviderAuthManager: React.FC<Props> = ({ ministryId, onAuthChange }) => {
  const [linkedProviders, setLinkedProviders] = useState<ContentProviderAuthInterface[]>([]);
  const [loading, setLoading] = useState(true);
  const [showProviderSelector, setShowProviderSelector] = useState(false);

  const [authProviderId, setAuthProviderId] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>("idle");
  const [deviceFlowData, setDeviceFlowData] = useState<DeviceAuthorizationResponse | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const [, setCodeVerifier] = useState<string | null>(null);
  const [pkceWindow, setPkceWindow] = useState<Window | null>(null);

  // Bumping generation invalidates outstanding poll closures so closing the dialog stops the previous chain.
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

  const availableProviders = useMemo(
    () => getAvailableProviders(SERVING_PROVIDER_IDS),
    []
  );

  const authProviders = useMemo(
    () => availableProviders.filter(p => p.implemented),
    [availableProviders]
  );

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

  const getLinkedAuth = useCallback((providerId: string): ContentProviderAuthInterface | undefined => {
    return linkedProviders.find(lp => lp.providerId === providerId);
  }, [linkedProviders]);

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

  const startDeviceFlow = useCallback(async (providerId: string) => {
    const provider = getProvider(providerId);
    if (!provider) return;

    setAuthProviderId(providerId);
    setAuthStatus("loading");
    setAuthError(null);
    setDeviceFlowData(null);

    try {
      if (!provider.initiateDeviceFlow) {
        setAuthError(Locale.label("plans.contentProviderAuth.deviceFlowUnsupported"));
        setAuthStatus("error");
        return;
      }
      const deviceResponse = await provider.initiateDeviceFlow();
      if (!deviceResponse) {
        setAuthError(Locale.label("plans.contentProviderAuth.deviceFlowFailed"));
        setAuthStatus("error");
        return;
      }

      setDeviceFlowData(deviceResponse);
      setAuthStatus("device_flow");

      pollDeviceFlowToken(provider, deviceResponse.device_code, deviceResponse.interval || 5);
    } catch (error) {
      console.error("Error starting device flow:", error);
      setAuthError(Locale.label("plans.contentProviderAuth.startAuthFailed"));
      setAuthStatus("error");
    }
  }, []);

  const pollDeviceFlowToken = useCallback(async (
    provider: IProvider,
    deviceCode: string,
    initialInterval: number
  ) => {
    cancelActivePolls();
    const generation = pollGenerationRef.current;
    // RFC 8628: once slow_down is returned, increased interval must persist for subsequent polls.
    let currentInterval = initialInterval;

    const isCancelled = () => generation !== pollGenerationRef.current;

    const poll = async () => {
      if (isCancelled()) return;
      if (!provider.pollDeviceFlowToken) return;
      try {
        const result = await provider.pollDeviceFlowToken(deviceCode);
        if (isCancelled()) return;

        if (result && "access_token" in result) {
          await ContentProviderAuthHelper.storeAuth(ministryId, provider.id, result);
          if (isCancelled()) return;
          setAuthStatus("success");
          await loadLinkedProviders();
          if (onAuthChange) onAuthChange();

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

          setAuthError((result as any).error_description || result.error);
          setAuthStatus("error");
          return;
        }

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

  const startPKCEFlow = useCallback(async (providerId: string) => {
    const provider = getProvider(providerId);
    if (!provider) return;

    setAuthProviderId(providerId);
    setAuthStatus("loading");
    setAuthError(null);

    try {
      if (!provider.generateCodeVerifier || !provider.buildAuthUrl) {
        setAuthError(Locale.label("plans.contentProviderAuth.pkceUnsupported"));
        setAuthStatus("error");
        return;
      }
      const generateCodeVerifier = provider.generateCodeVerifier.bind(provider);
      const buildAuthUrl = provider.buildAuthUrl.bind(provider);

      const relayData = await ApiHelper.post("/oauth/relay/sessions", { provider: providerId }, "MembershipApi");
      if (!relayData?.sessionCode || !relayData?.redirectUri) {
        setAuthError(Locale.label("plans.contentProviderAuth.sessionFailed"));
        setAuthStatus("error");
        return;
      }

      const { sessionCode, redirectUri, expiresIn } = relayData;

      const verifier = generateCodeVerifier();
      setCodeVerifier(verifier);

      const authResult = await buildAuthUrl(verifier, redirectUri, sessionCode);

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

      const expiresAt = Date.now() + (expiresIn || 300) * 1000;

      const poll = async () => {
        if (isCancelled()) return;
        if (popup.closed) {
          setAuthStatus("idle");
          setAuthProviderId(null);
          setCodeVerifier(null);
          setPkceWindow(null);
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

            // Exchange runs server-side: the token endpoint needs the client_secret and sends no CORS headers.
            const exchanged = await ContentProviderAuthHelper.exchangeCode(ministryId, providerId, result.authCode, verifier, redirectUri);
            if (isCancelled()) return;

            if (exchanged) {
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

  const handleLink = useCallback(async (providerId: string) => {
    const providerInfo = availableProviders.find(p => p.id === providerId);
    if (!providerInfo) return;

    // For providers that don't require auth, just store a record with placeholder values
    if (!providerInfo.requiresAuth) {
      setShowProviderSelector(false);
      try {
        const now = Math.floor(Date.now() / 1000);
        await ContentProviderAuthHelper.storeAuth(ministryId, providerId, {
          access_token: "public_api",
          refresh_token: "",
          token_type: "none",
          created_at: now,
          expires_in: 60 * 60 * 24 * 365 * 10, // 10 years
          scope: ""
        });
        await loadLinkedProviders();
        if (onAuthChange) onAuthChange();
      } catch (error) {
        console.error("Error linking provider:", error);
      }
      return;
    }

    const provider = getProvider(providerId);
    if (!provider) return;

    setShowProviderSelector(false);

    if (provider.authTypes.includes("device_flow")) {
      startDeviceFlow(providerId);
    } else if (provider.authTypes.includes("oauth_pkce")) {
      startPKCEFlow(providerId);
    } else {
      setAuthProviderId(providerId);
      setAuthError(Locale.label("plans.contentProviderAuth.pkceUnsupported"));
      setAuthStatus("error");
    }
  }, [availableProviders, ministryId, loadLinkedProviders, onAuthChange, startDeviceFlow, startPKCEFlow]);

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
                      <AppIconButton label={Locale.label("plans.contentProviderAuth.refresh") || "Refresh"} icon={<RefreshIcon />} onClick={() => handleLink(providerInfo.id)} />
                      <Button
                        variant="outlined"
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
