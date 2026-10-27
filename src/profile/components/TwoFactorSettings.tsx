import { useState } from "react";
import { Locale, ApiHelper } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, Stack, TextField, Typography } from "@mui/material";
import { QRCodeSVG } from "qrcode.react";
import { RecordHeading } from "../../components/ui";

type Step = "idle" | "scan" | "backup" | "disable";

export const TwoFactorSettings = () => {
  const status = useQuery<{ enabled: boolean; backupCodesLeft: number }>({ queryKey: ["/users/mfa/status", "MembershipApi"] });
  const [step, setStep] = useState<Step>("idle");
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const run = async (action: () => Promise<void>) => {
    setError("");
    setBusy(true);
    try { await action(); } catch (e: any) { setError(e?.message || Locale.label("profile.twoFactor.invalidCode", "That code didn't work. Please try again.")); } finally { setBusy(false); }
  };

  const start = () => run(async () => {
    setSetup(await ApiHelper.post("/users/mfa/setup", {}, "MembershipApi"));
    setCode("");
    setStep("scan");
  });

  const enable = () => run(async () => {
    const resp = await ApiHelper.post("/users/mfa/enable", { code }, "MembershipApi");
    setBackupCodes(resp.backupCodes || []);
    setSetup(null);
    setStep("backup");
    status.refetch();
  });

  const disable = () => run(async () => {
    await ApiHelper.post("/users/mfa/disable", { code }, "MembershipApi");
    setStep("idle");
    setCode("");
    status.refetch();
  });

  const reset = () => { setStep("idle"); setCode(""); setError(""); setSetup(null); };

  const codeField = (onSubmit: () => void, label: string) => (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "stretch", sm: "center" }} component="form" onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
      <TextField size="small" label={label} value={code} onChange={(e) => setCode(e.target.value)} autoFocus autoComplete="one-time-code" inputProps={{ maxLength: 12 }} data-testid="mfa-code" />
      <Button type="submit" variant="contained" disabled={busy || !code.trim()}>{Locale.label("profile.twoFactor.verify", "Verify")}</Button>
      <Button onClick={reset} disabled={busy}>{Locale.label("common.cancel")}</Button>
    </Stack>
  );

  const enabled = !!status.data?.enabled;

  return (
    <Box component="section" data-testid="two-factor-settings">
      <RecordHeading label={Locale.label("profile.twoFactor.title", "Two-Factor Sign-In")} />
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {step === "idle" && (
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ xs: "flex-start", sm: "center" }}>
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            {enabled
              ? Locale.label("profile.twoFactor.on", "On. You'll enter a code from your authenticator app when you sign in.") + " " + Locale.label("profile.twoFactor.backupLeft", "Backup codes left: {}").replace("{}", String(status.data?.backupCodesLeft ?? 0))
              : Locale.label("profile.twoFactor.off", "Off. Add a code from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password, Authy...) to your sign-in.")}
          </Typography>
          {enabled
            ? <Button variant="outlined" color="error" onClick={() => { setCode(""); setStep("disable"); }} data-testid="mfa-disable">{Locale.label("profile.twoFactor.turnOff", "Turn off")}</Button>
            : <Button variant="contained" onClick={start} disabled={busy || status.isLoading} data-testid="mfa-enable">{Locale.label("profile.twoFactor.turnOn", "Turn on")}</Button>}
        </Stack>
      )}

      {step === "scan" && setup && (
        <Stack spacing={2}>
          <Typography variant="body2">{Locale.label("profile.twoFactor.scan", "Scan this QR code with your authenticator app, then enter the 6-digit code it shows.")}</Typography>
          <Box sx={{ p: 1, bgcolor: "#fff", width: "fit-content", borderRadius: 1 }}><QRCodeSVG value={setup.otpauthUrl} size={180} /></Box>
          <Typography variant="body2" color="text.secondary">
            {Locale.label("profile.twoFactor.manual", "Can't scan? Enter this key:")} <Box component="code" sx={{ wordBreak: "break-all" }} data-testid="mfa-secret">{setup.secret}</Box>
          </Typography>
          {codeField(enable, Locale.label("profile.twoFactor.code", "6-digit code"))}
        </Stack>
      )}

      {step === "backup" && (
        <Stack spacing={2}>
          <Alert severity="success">{Locale.label("profile.twoFactor.enabled", "Two-factor sign-in is on.")}</Alert>
          <Typography variant="body2">{Locale.label("profile.twoFactor.saveBackup", "Save these backup codes somewhere safe. Each one signs you in once if you lose your phone. They won't be shown again.")}</Typography>
          <Box component="pre" data-testid="mfa-backup-codes" sx={{ m: 0, p: 2, bgcolor: "action.hover", borderRadius: 1, fontFamily: "monospace", columns: 2, width: "fit-content" }}>{backupCodes.join("\n")}</Box>
          <Stack direction="row" spacing={2}>
            <Button variant="outlined" onClick={() => navigator.clipboard?.writeText(backupCodes.join("\n"))}>{Locale.label("profile.twoFactor.copy", "Copy")}</Button>
            <Button variant="contained" onClick={() => { setBackupCodes([]); setStep("idle"); }}>{Locale.label("profile.twoFactor.done", "I saved them")}</Button>
          </Stack>
        </Stack>
      )}

      {step === "disable" && (
        <Stack spacing={2}>
          <Typography variant="body2">{Locale.label("profile.twoFactor.disablePrompt", "Enter a code from your authenticator app or a backup code to turn off two-factor sign-in.")}</Typography>
          {codeField(disable, Locale.label("profile.twoFactor.codeOrBackup", "Code or backup code"))}
        </Stack>
      )}
    </Box>
  );
};
