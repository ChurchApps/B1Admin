import React from "react";
import { FormControl, InputLabel, MenuItem, Select, TextField, Grid, Stack, Switch, Typography, Tooltip, IconButton, Snackbar, Alert, type SelectChangeEvent } from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { ApiHelper, ErrorMessages, Locale, UniqueIdHelper, UserHelper, type ChurchInterface } from "@churchapps/apphelper";
import { Alert, FormControl, InputLabel, MenuItem, Select, TextField, Grid, Stack, Switch, Typography } from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import { Controller, useForm } from "react-hook-form";
import { ApiHelper, Locale, UniqueIdHelper } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type PaymentGatewaysInterface } from "../../helpers";
import { FeeOptionsSettingsEdit } from "./FeeOptionsSettingsEdit";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  churchInfo: ChurchInterface;
  onError?: (errors: string[]) => void;
}

export const GivingSettingsEdit: React.FC<Props> = (props) => {
  const [gateway, setGateway] = React.useState<PaymentGatewaysInterface>(null);
  const [provider, setProvider] = React.useState("");
  const [publicKey, setPublicKey] = React.useState("");
  const [privateKey, setPrivateKey] = React.useState("");
  const [payFees, setPayFees] = React.useState<boolean>(false);
  const [currency, setCurrency] = React.useState("usd");
  const [errors, setErrors] = React.useState<string[]>([]);
  const [copySnackbar, setCopySnackbar] = React.useState(false);

  // Build the webhook URL for KingdomFunding (Accept Blue) using the active GivingApi base URL.
  // This is the URL the church gives to their KF representative during onboarding.
  const kfWebhookUrl = React.useMemo(() => {
    if (!props.churchId) return "";
    try {
      const givingConfig = ApiHelper.getConfig("GivingApi") as { url?: string } | undefined;
      const base = givingConfig?.url?.replace(/\/+$/, "") || "";
      if (!base) return "";
      return `${base}/donate/webhook/kingdomfunding?churchId=${props.churchId}`;
    } catch {
      return "";
    }
  }, [props.churchId]);

  const copyWebhookUrl = async () => {
    if (!kfWebhookUrl) return;
    try {
      await navigator.clipboard.writeText(kfWebhookUrl);
      setCopySnackbar(true);
    } catch {
      // Fallback for older browsers / non-secure contexts
      const ta = document.createElement("textarea");
      ta.value = kfWebhookUrl;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); setCopySnackbar(true); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  };

  //these are just temporary until we get the list as per the languages we support
  const stripeSupportedCurrencies = [
    "usd", "eur", "gbp", "cad", "aud", "inr", "jpy", "sgd", "hkd", "sek", "nok", "dkk", "chf", "mxn", "brl"
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    e.preventDefault();
    switch (e.target.name) {
      case "provider": setProvider(e.target.value); break;
      case "publicKey": setPublicKey(e.target.value); break;
      case "privateKey": setPrivateKey(e.target.value); break;
      case "currency": setCurrency(e.target.value); break;
    }
  };

  const getKeys = () => {
    if (provider === "") return null;
    else {
      let publicLabel = Locale.label("settings.givingSettingsEdit.pubKey");
      let privateLabel = Locale.label("settings.givingSettingsEdit.secKey");
      if (provider === "Paypal") {
        publicLabel = Locale.label("settings.givingSettingsEdit.clientId") || "Client ID";
        privateLabel = Locale.label("settings.givingSettingsEdit.clientSecret") || "Client Secret";
      } else if (provider === "KingdomFunding") {
        publicLabel = "Tokenization Key";
        privateLabel = "Source Key";
      }

      return (
        <>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth name="publicKey" label={publicLabel} value={publicKey} onChange={handleChange} placeholder={Locale.label("placeholders.giving.publicKey")} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth name="privateKey" label={privateLabel} value={privateKey} placeholder={Locale.label("settings.giving.secretPlaceholder")} type="password" onChange={handleChange} />
          </Grid>
          <Grid size={{ xs: 12 }}>
            <Stack direction="row" alignItems="center">
              <Typography>{Locale.label("settings.givingSettingsEdit.transFee")}</Typography>
              <Tooltip title={Locale.label("settings.givingSettingsEdit.forceMsg")} arrow>
                <IconButton data-testid="force-ssl-help-button" aria-label="Force SSL help">
                  <HelpIcon />
                </IconButton>
              </Tooltip>
              <Switch
                checked={payFees === true}
                onChange={(e) => {
                  setPayFees(e.target.checked);
                }}
              />
            </Stack>
          </Grid>
        </>
      );
    }
  };

  // Currency selection hidden for now - defaulting to USD
  const getCurrency = () => {
    if (provider !== "Stripe") return null;
    return (
      <div style={{ display: "none" }}>
        <Typography variant="body2" color="textSecondary" component="div">Make sure this currency is also enabled in your Stripe Dashboard. Enable currency here: <a href="https://dashboard.stripe.com/settings/currencies" target="_blank" rel="noopener noreferrer">{Locale.label("settings.givingSettingsEdit.stripeDashboard")}</a></Typography>
        <FormControl fullWidth>
          <InputLabel>Currency</InputLabel>
          <Select name="currency" label="Currency" value={currency} onChange={handleChange}>
            {stripeSupportedCurrencies.map((c) => <MenuItem key={c} value={c}>{c.toUpperCase()}</MenuItem>)}
          </Select>
        </FormControl>
      </div>
    );
  };

  const save = async () => {
    try {
      if (provider === "") {
        if (!UniqueIdHelper.isMissing(gateway?.id)) await ApiHelper.delete("/gateways/" + gateway.id, "GivingApi");
      } else {
        if (privateKey === "") return;
        const gw: PaymentGatewaysInterface = gateway === null ? { churchId: props.churchId } : { ...gateway };
        gw.provider = provider;
        gw.publicKey = publicKey;
        gw.payFees = payFees;
        gw.currency = currency;
        if (privateKey !== "") gw.privateKey = privateKey;
        await ApiHelper.post("/gateways", [gw], "GivingApi");
      }
    } catch (error: any) {
      let message = Locale.label("settings.givingSettingsEdit.saveError");
      if (error?.message) {
        try {
          const parsed = JSON.parse(error.message);
          message = parsed.message || error.message;
        } catch {
          message = error.message;
        }
      }
      setErrors([message]);
      if (props.onError) props.onError([message]);
    }
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const loadData = async () => {
    const gateways = await ApiHelper.get("/gateways", "GivingApi");
    if (gateways.length === 0) {
      setGateway(null);
      setProvider("");
      setPublicKey("");
      setPayFees(false);
      setCurrency("usd");
    } else {
      setGateway(gateways[0]);
      setProvider(gateways[0].provider || "");
      setPublicKey(gateways[0].publicKey || "");
      setPayFees(gateways[0].payFees || false);
      setCurrency(gateways[0].currency || "usd");
    }
    setPrivateKey("");
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);

  React.useEffect(() => {
    if (props.saveTrigger !== null) save();
  }, [props.saveTrigger]);

  const getKeys = () => {
    if (!provider) return null;
    const publicLabel = provider === "Paypal" ? Locale.label("settings.givingSettingsEdit.clientId") : Locale.label("settings.givingSettingsEdit.pubKey");
    const privateLabel = provider === "Paypal" ? Locale.label("settings.givingSettingsEdit.clientSecret") : Locale.label("settings.givingSettingsEdit.secKey");
    return (
      <>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label={publicLabel} placeholder={Locale.label("placeholders.giving.publicKey")} {...register("publicKey")} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label={privateLabel} placeholder={Locale.label("settings.giving.secretPlaceholder")} type="password" {...register("privateKey")} />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <Stack direction="row" alignItems="center">
            <Typography>{Locale.label("settings.givingSettingsEdit.transFee")}</Typography>
            <AppIconButton label={Locale.label("settings.givingSettingsEdit.forceMsg")} icon={<HelpIcon />} data-testid="force-ssl-help-button" />
            <Controller
              control={control}
              name="payFees"
              render={({ field }) => <Switch checked={!!field.value} onChange={(ev) => field.onChange(ev.target.checked)} />}
            />
          </Stack>
        </Grid>
      </>
    );
  };

  const getCurrency = () => {
    if (provider !== "Stripe") return null;
    return (
      <Grid size={{ xs: 12, md: 4 }}>
        <Typography variant="body2" color="textSecondary" component="div" sx={{ mb: 1 }}>
          {Locale.label("settings.givingSettingsEdit.currencyHelper")} <a href="https://dashboard.stripe.com/settings/currencies" target="_blank" rel="noopener noreferrer">{Locale.label("settings.givingSettingsEdit.stripeDashboard")}</a>
        </Typography>
        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>{Locale.label("settings.givingSettingsEdit.currency")}</InputLabel>
              <Select {...field} label={Locale.label("settings.givingSettingsEdit.currency")}>
                {stripeSupportedCurrencies.map((c) => <MenuItem key={c} value={c}>{c.toUpperCase()}</MenuItem>)}
              </Select>
            </FormControl>
          )}
        />
      </Grid>
    );
  };

  return (
    <>
      <ErrorMessages errors={errors} />
      {/* <div className="subHead">{Locale.label("settings.givingSettingsEdit.giving")}</div> */}
      <Grid container spacing={3} marginBottom={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("settings.givingSettingsEdit.prov")}</InputLabel>
            <Select name="provider" label={Locale.label("settings.givingSettingsEdit.prov")} value={provider || ""} onChange={handleChange}>
              <MenuItem value="">{Locale.label("settings.givingSettingsEdit.none")}</MenuItem>
              <MenuItem value="KingdomFunding">Kingdom Funding (Recommended)</MenuItem>
              <MenuItem value="Stripe">{Locale.label("settings.givingSettingsEdit.stripe")}</MenuItem>
              <MenuItem value="Paypal">{Locale.label("settings.givingSettingsEdit.paypal")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        {provider === "Stripe" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              {Locale.label("settings.givingSettingsEdit.stripeVisit")} <a href="https://dashboard.stripe.com/" target="_blank" rel="noopener noreferrer">{Locale.label("settings.givingSettingsEdit.stripeDashboard")}</a> {Locale.label("settings.givingSettingsEdit.stripeGoTo")} <strong>{Locale.label("settings.givingSettingsEdit.developersApiKeys")}</strong> {Locale.label("settings.givingSettingsEdit.stripeCopyKeys")}
            </Typography>
          </Grid>
        )}
        {provider === "Paypal" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              {Locale.label("settings.givingSettingsEdit.paypalGoTo")} <a href="https://developer.paypal.com/" target="_blank" rel="noopener noreferrer">{Locale.label("settings.givingSettingsEdit.paypalDeveloper")}</a>, {Locale.label("settings.givingSettingsEdit.paypalLogin")} <strong>{Locale.label("settings.givingSettingsEdit.apiCredentials")}</strong> {Locale.label("settings.givingSettingsEdit.paypalCreateApp")}
            </Typography>
          </Grid>
        )}
        {provider === "KingdomFunding" && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              Visit <a href={`https://kingdomfunding.org/begin-registration/?sponsor=b1&email=${UserHelper.user?.email}&org=${props.churchInfo?.name}&full_name=${UserHelper.user?.firstName}+${UserHelper.user?.lastName}&phone=${UserHelper.person.contactInfo?.workPhone}&address1=${props.churchInfo?.address1}&address2=${props.churchInfo?.address2}&state=${props.churchInfo?.state}&zip=${props.churchInfo?.zip}&country=${props.churchInfo?.country}`} target="_blank" rel="noopener noreferrer">kingdomfunding.org</a> to get started. Enter your <strong>Tokenization Key</strong> and <strong>Source Key</strong> from your Kingdom Funding dashboard.
            </Typography>
            {kfWebhookUrl && (
              <Typography variant="body2" color="textSecondary" component="div" sx={{ mt: 1 }}>
                Provide the following webhook URL to your Kingdom Funding representative during onboarding. They will configure it so transaction updates (recurring charges, ACH settlements, returns) are sent back to your church giving reports:{" "}
                <code style={{ wordBreak: "break-all" }}>{kfWebhookUrl}</code>
                <IconButton size="small" onClick={copyWebhookUrl} aria-label="Copy webhook URL" sx={{ ml: 0.5, verticalAlign: "middle" }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Typography>
            )}
          </Grid>
        )}
        {getKeys()}
        {getCurrency()}
      </Grid>
      <FeeOptionsSettingsEdit churchId={props.churchId} saveTrigger={props.saveTrigger} provider={provider} currency={currency} />
      <Snackbar
        open={copySnackbar}
        autoHideDuration={2500}
        onClose={() => setCopySnackbar(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" onClose={() => setCopySnackbar(false)}>
          Webhook URL copied to clipboard
        </Alert>
      </Snackbar>
    </>
  );
};
