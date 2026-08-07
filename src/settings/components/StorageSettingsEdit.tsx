import React from "react";
import { FormControl, InputLabel, MenuItem, Select, Grid, TextField, Typography, Button, Chip, type SelectChangeEvent } from "@mui/material";
import { CheckCircle as CheckCircleIcon } from "@mui/icons-material";
import { ApiHelper, ErrorMessages, UniqueIdHelper, Locale } from "@churchapps/apphelper";
import { OAuthHelper } from "@churchapps/content-providers";
import { MINISTRYSTUFF_ENABLED } from "../../helpers/MinistryStuffFlag";
import { BYOS_PROVIDERS } from "./byosProviders";

interface StorageProviderInterface {
  id?: string;
  churchId?: string;
  provider?: string;
  enabled?: boolean;
  apiKey?: string;
  apiSecret?: string;
  settings?: string;
  connected?: boolean;
}

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  onError?: (errors: string[]) => void;
  onSaveComplete?: (ok: boolean) => void;
}

interface S3Settings {
  endpoint?: string;
  region?: string;
  bucket?: string;
  publicBase?: string;
}

export const StorageSettingsEdit: React.FC<Props> = (props) => {
  const [rows, setRows] = React.useState<StorageProviderInterface[]>([]);
  const [provider, setProvider] = React.useState("");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [status, setStatus] = React.useState<{ provider?: string; usedBytes?: number; quotaBytes?: number } | null>(null);
  const [s3Key, setS3Key] = React.useState("");
  const [s3Secret, setS3Secret] = React.useState("");
  const [s3Settings, setS3Settings] = React.useState<S3Settings>({});
  const [connecting, setConnecting] = React.useState(false);
  const pollGenerationRef = React.useRef(0);

  const selectedRow = rows.find((r) => r.provider === provider);
  const selectedDescriptor = BYOS_PROVIDERS.find((p) => p.id === provider);

  const handleChange = (e: SelectChangeEvent) => {
    e.preventDefault();
    setProvider(e.target.value);
  };

  const save = async () => {
    try {
      const enabledRow = rows.find((r) => r.enabled);
      if (provider === "") {
        if (enabledRow && !UniqueIdHelper.isMissing(enabledRow.id)) await ApiHelper.delete("/storage/providers/" + enabledRow.id, "ContentApi");
      } else if (selectedDescriptor?.oauth) {
        if (!selectedRow?.connected) throw new Error(Locale.label("settings.storageSettingsEdit.connectFirst", "Connect your account before saving."));
        if (!selectedRow.enabled) await ApiHelper.post("/storage/providers", [{ ...selectedRow, enabled: true }], "ContentApi");
      } else if (provider === "s3") {
        if (!s3Settings.bucket || !s3Settings.publicBase) throw new Error(Locale.label("settings.storageSettingsEdit.s3Required", "Bucket and public URL base are required."));
        const sp: StorageProviderInterface = selectedRow ? { ...selectedRow } : { churchId: props.churchId };
        sp.provider = "s3";
        sp.enabled = true;
        sp.apiKey = s3Key;
        sp.apiSecret = s3Secret;
        sp.settings = JSON.stringify(s3Settings);
        await ApiHelper.post("/storage/providers", [sp], "ContentApi");
      } else {
        const sp: StorageProviderInterface = selectedRow ? { ...selectedRow } : { churchId: props.churchId };
        sp.provider = provider;
        sp.enabled = true;
        await ApiHelper.post("/storage/providers", [sp], "ContentApi");
      }
      setErrors([]);
      await loadData();
      props.onSaveComplete?.(true);
    } catch (error: any) {
      const message = error?.message || Locale.label("settings.storageSettingsEdit.saveError");
      setErrors([message]);
      if (props.onError) props.onError([message]);
      props.onSaveComplete?.(false);
    }
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const loadData = async () => {
    const providers: StorageProviderInterface[] = await ApiHelper.get("/storage/providers", "ContentApi");
    setRows(providers);
    const enabled = providers.find((r) => r.enabled);
    setProvider(enabled?.provider || "");
    const s3Row = providers.find((r) => r.provider === "s3");
    if (s3Row) {
      setS3Key(s3Row.apiKey || "");
      setS3Secret(s3Row.apiSecret || "");
      try {
        setS3Settings(JSON.parse(s3Row.settings || "{}"));
      } catch {
        setS3Settings({});
      }
    }
    ApiHelper.get("/storage/status", "ContentApi").then(setStatus).catch(() => setStatus(null));
  };

  // OAuth popup + relay-session polling, same flow as ContentProviderAuthManager.startPKCEFlow
  const startConnect = async () => {
    const descriptor = selectedDescriptor;
    if (!descriptor?.buildAuthUrl) return;
    setErrors([]);
    setConnecting(true);
    pollGenerationRef.current++;
    const generation = pollGenerationRef.current;
    const isCancelled = () => generation !== pollGenerationRef.current;
    try {
      const relayData = await ApiHelper.post("/oauth/relay/sessions", { provider: descriptor.id }, "MembershipApi");
      if (!relayData?.sessionCode || !relayData?.redirectUri) throw new Error(Locale.label("settings.storageSettingsEdit.sessionFailed", "Could not start the sign-in session."));
      const oauth = new OAuthHelper();
      const verifier = oauth.generateCodeVerifier();
      const challenge = await oauth.generateCodeChallenge(verifier);
      const url = descriptor.buildAuthUrl(challenge, relayData.redirectUri, relayData.sessionCode);

      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(url, "oauth_popup", `width=${width},height=${height},left=${left},top=${top},popup=yes`);
      if (!popup) throw new Error(Locale.label("settings.storageSettingsEdit.popupBlocked", "Popup blocked. Please allow popups and try again."));

      const expiresAt = Date.now() + (relayData.expiresIn || 300) * 1000;
      const poll = async () => {
        if (isCancelled()) return;
        if (popup.closed) {
          setConnecting(false);
          return;
        }
        if (Date.now() >= expiresAt) {
          popup.close();
          setConnecting(false);
          setErrors([Locale.label("settings.storageSettingsEdit.sessionExpired", "The sign-in session expired. Please try again.")]);
          return;
        }
        let result;
        try {
          result = await ApiHelper.getAnonymous(`/oauth/relay/sessions/${relayData.sessionCode}`, "MembershipApi");
        } catch {
          if (!isCancelled()) window.setTimeout(poll, 5000);
          return;
        }
        if (isCancelled()) return;
        if (result?.status === "completed" && result?.authCode) {
          popup.close();
          // Exchange runs server-side: the token endpoint needs the client_secret and sends no CORS headers.
          // The relay session is consumed by the completed read, so a failed exchange is terminal — surface it, don't re-poll.
          try {
            await ApiHelper.post("/storage/exchange", { provider: descriptor.id, code: result.authCode, codeVerifier: verifier, redirectUri: relayData.redirectUri }, "ContentApi");
          } catch (e: any) {
            if (isCancelled()) return;
            setConnecting(false);
            setErrors([e?.message || Locale.label("settings.storageSettingsEdit.authFailed", "Sign-in failed. Please try again.")]);
            return;
          }
          if (isCancelled()) return;
          setConnecting(false);
          await loadData();
          return;
        }
        window.setTimeout(poll, 3000);
      };
      window.setTimeout(poll, 3000);
    } catch (error: any) {
      setConnecting(false);
      setErrors([error?.message || Locale.label("settings.storageSettingsEdit.authFailed", "Sign-in failed. Please try again.")]);
    }
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);
  React.useEffect(checkSave, [props.saveTrigger]);

  const gb = (bytes: number) => (bytes / 1073741824).toFixed(2);
  const s3Field = (label: string, value: string, onChange: (val: string) => void, type: string = "text") => (
    <Grid size={{ xs: 12, md: 4 }}>
      <TextField fullWidth type={type} label={label} value={value} onChange={(e) => onChange(e.target.value)} />
    </Grid>
  );

  return (
    <>
      <ErrorMessages errors={errors} />
      <Grid container spacing={3} marginBottom={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("settings.storageSettingsEdit.provider")}</InputLabel>
            <Select name="provider" label={Locale.label("settings.storageSettingsEdit.provider")} value={provider || ""} onChange={handleChange}>
              <MenuItem value="">{Locale.label("settings.storageSettingsEdit.churchAppsFree")}</MenuItem>
              {BYOS_PROVIDERS.map((p) => <MenuItem key={p.id} value={p.id} disabled={p.oauth && !p.clientId}>{p.name}</MenuItem>)}
              {MINISTRYSTUFF_ENABLED && <MenuItem value="ministrystuff">{Locale.label("settings.storageSettingsEdit.ministryStuff")}</MenuItem>}
            </Select>
          </FormControl>
        </Grid>
        {selectedDescriptor?.oauth && (
          <Grid size={{ xs: 12, md: 8 }} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            {selectedRow?.connected && <Chip icon={<CheckCircleIcon />} color="success" label={Locale.label("settings.storageSettingsEdit.connected", "Account connected")} />}
            <Button variant={selectedRow?.connected ? "outlined" : "contained"} onClick={startConnect} disabled={connecting} data-testid="byos-connect-button">
              {connecting
                ? Locale.label("settings.storageSettingsEdit.connecting", "Waiting for sign-in...")
                : selectedRow?.connected
                  ? Locale.label("settings.storageSettingsEdit.reconnect", "Reconnect")
                  : Locale.label("settings.storageSettingsEdit.connect", "Connect Account")}
            </Button>
          </Grid>
        )}
        {selectedDescriptor?.oauth && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary">
              {Locale.label("settings.storageSettingsEdit.byosHelper", "New uploads are stored in your own account and downloads are served from it. Files already uploaded stay where they are.")}
            </Typography>
          </Grid>
        )}
        {provider === "s3" && (
          <>
            {s3Field(Locale.label("settings.storageSettingsEdit.s3AccessKey", "Access Key Id"), s3Key, setS3Key)}
            {s3Field(Locale.label("settings.storageSettingsEdit.s3SecretKey", "Secret Access Key"), s3Secret, setS3Secret, "password")}
            {s3Field(Locale.label("settings.storageSettingsEdit.s3Bucket", "Bucket"), s3Settings.bucket || "", (val) => setS3Settings({ ...s3Settings, bucket: val }))}
            {s3Field(Locale.label("settings.storageSettingsEdit.s3Endpoint", "Endpoint (blank for AWS)"), s3Settings.endpoint || "", (val) => setS3Settings({ ...s3Settings, endpoint: val }))}
            {s3Field(Locale.label("settings.storageSettingsEdit.s3Region", "Region"), s3Settings.region || "", (val) => setS3Settings({ ...s3Settings, region: val }))}
            {s3Field(Locale.label("settings.storageSettingsEdit.s3PublicBase", "Public URL Base"), s3Settings.publicBase || "", (val) => setS3Settings({ ...s3Settings, publicBase: val }))}
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" color="textSecondary">
                {Locale.label("settings.storageSettingsEdit.s3Helper", "The bucket must allow public read access and CORS PUT requests from this site. Works with AWS S3, Cloudflare R2 and Backblaze B2.")}
              </Typography>
            </Grid>
          </>
        )}
        {provider === "ministrystuff" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              {status?.provider === "ministrystuff" && status?.quotaBytes
                ? Locale.label("settings.storageSettingsEdit.usage").replace("{used}", gb(status.usedBytes || 0)).replace("{quota}", gb(status.quotaBytes))
                : Locale.label("settings.storageSettingsEdit.ministryStuffHelper")}{" "}
              <a href="https://ministrystuff.org" target="_blank" rel="noopener noreferrer">{Locale.label("settings.storageSettingsEdit.ministryStuffHelperLink")}</a>
            </Typography>
          </Grid>
        )}
      </Grid>
    </>
  );
};
