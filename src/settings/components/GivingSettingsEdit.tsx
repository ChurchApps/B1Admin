import React from "react";
import { Alert, FormControl, IconButton, InputLabel, MenuItem, Select, Snackbar, TextField, Grid, Stack, Switch, Typography } from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { Controller, useForm } from "react-hook-form";
import { ApiHelper, Locale, UniqueIdHelper, UserHelper } from "@churchapps/apphelper";
import { listPaymentProviders, getPaymentProvider } from "@churchapps/apphelper/donations";
import { type ChurchInterface } from "@churchapps/helpers";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type PaymentGatewaysInterface } from "../../helpers";
import { FeeOptionsSettingsEdit } from "./FeeOptionsSettingsEdit";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  churchInfo?: ChurchInterface;
  onError?: (errors: string[]) => void;
}

type AnyRecord = Record<string, any>;

const isProd = process.env.REACT_APP_STAGE === "prod";

export const GivingSettingsEdit: React.FC<Props> = (props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [gateway, setGateway] = React.useState<PaymentGatewaysInterface>(null);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [copySnackbar, setCopySnackbar] = React.useState(false);

  const { register, reset, control, watch, getValues } = useForm<AnyRecord>({ defaultValues: { provider: "", publicKey: "", privateKey: "", webhookKey: "", payFees: false, currency: "usd" } });
  const provider = watch("provider");
  const currency = watch("currency");

  // Everything provider-specific comes from the registry descriptor, so a new
  // gateway shows up here (dropdown, key labels, currency, setup) with no edits.
  // getPaymentProvider() falls back to Stripe for an unrecognized value; in the admin UI
  // that would silently show Stripe's key labels/fees for a misconfigured gateway, so detect
  // an unknown provider and suppress the (wrong) fields instead.
  const knownProvider = !provider || listPaymentProviders().some((p) => p.descriptor.adminValue?.toLowerCase() === String(provider).toLowerCase());
  const descriptor = (provider && knownProvider) ? getPaymentProvider(provider).descriptor : undefined;
  const providerOptions = listPaymentProviders().filter((p) => p.descriptor.selectableInAdmin && (!p.descriptor.betaOnly || !isProd || p.descriptor.adminValue === provider));

  const webhookUrl = React.useMemo(() => {
    if (!props.churchId || !descriptor?.keyLabels.webhook) return "";
    const base = ApiHelper.getConfig("GivingApi")?.url?.replace(/\/+$/, "") || "";
    return base ? base + "/donate/webhook/" + getPaymentProvider(provider).key + "?churchId=" + props.churchId : "";
  }, [props.churchId, provider, descriptor?.keyLabels.webhook]);

  const signupHref = descriptor?.signupUrl
    ? descriptor.signupUrl(props.churchInfo, { ...UserHelper.user, contactInfo: UserHelper.person?.contactInfo })
    : undefined;

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl).then(() => setCopySnackbar(true)).catch(() => {});
  };

  const save = async () => {
    try {
      const values = getValues();
      if (values.provider === "") {
        if (!UniqueIdHelper.isMissing(gateway?.id)) await ApiHelper.delete("/gateways/" + gateway.id, "GivingApi");
      } else {
        const providerChanged = !!gateway && gateway.provider !== values.provider;
        if ((gateway === null || providerChanged) && values.privateKey === "") {
          const message = Locale.label("settings.givingSettingsEdit.privateKeyRequired");
          setErrors([message]);
          if (props.onError) props.onError([message]);
          return;
        }
        const gw: PaymentGatewaysInterface = gateway === null ? { churchId: props.churchId } : { ...gateway };
        gw.provider = values.provider;
        gw.publicKey = values.publicKey;
        gw.payFees = values.payFees;
        gw.currency = values.currency;
        if (values.privateKey !== "") gw.privateKey = values.privateKey;
        if (values.webhookKey !== "") gw.webhookKey = values.webhookKey;
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

  const loadData = async () => {
    const gateways = await ApiHelper.get("/gateways", "GivingApi");
    if (gateways.length === 0) {
      setGateway(null);
      reset({ provider: "", publicKey: "", privateKey: "", webhookKey: "", payFees: false, currency: "usd" });
    } else {
      setGateway(gateways[0]);
      reset({
        provider: gateways[0].provider || "",
        publicKey: gateways[0].publicKey || "",
        privateKey: "",
        webhookKey: "",
        payFees: gateways[0].payFees || false,
        currency: gateways[0].currency || "usd"
      });
    }
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);

  React.useEffect(() => {
    if (props.saveTrigger !== null) save();
  }, [props.saveTrigger]);

  const getKeys = () => {
    if (!descriptor) return null;
    const publicLabel = Locale.label(descriptor.keyLabels.public);
    const privateLabel = Locale.label(descriptor.keyLabels.private);
    return (
      <>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label={publicLabel} placeholder={Locale.label("placeholders.giving.publicKey")} {...register("publicKey")} />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <TextField fullWidth label={privateLabel} placeholder={Locale.label("settings.giving.secretPlaceholder")} type="password" {...register("privateKey")} />
        </Grid>
        {descriptor.keyLabels.webhook && (
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth label={Locale.label(descriptor.keyLabels.webhook)} placeholder={Locale.label("settings.giving.secretPlaceholder")} type="password" helperText={Locale.label("settings.givingSettingsEdit.webhookKeyHelper")} {...register("webhookKey")} />
          </Grid>
        )}
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
    const currencyOptions = Array.isArray(descriptor?.currencies) ? descriptor!.currencies : [];
    if (!currencyOptions.length) return null;
    return (
      <Grid size={{ xs: 12, md: 4 }}>
        <Typography variant="body2" color="textSecondary" component="div" sx={{ mb: 1 }}>
          {Locale.label("settings.givingSettingsEdit.currencyHelper")}
          {/* The currency reference link is Stripe-specific; only show it for Stripe. */}
          {provider === "stripe" && <> <a href="https://dashboard.stripe.com/settings/currencies" target="_blank" rel="noopener noreferrer">{Locale.label("settings.givingSettingsEdit.stripeDashboard")}</a></>}
        </Typography>
        <Controller
          control={control}
          name="currency"
          render={({ field }) => (
            <FormControl fullWidth>
              <InputLabel>{Locale.label("settings.givingSettingsEdit.currency")}</InputLabel>
              <Select {...field} label={Locale.label("settings.givingSettingsEdit.currency")}>
                {currencyOptions.map((c) => <MenuItem key={c} value={c}>{c.toUpperCase()}</MenuItem>)}
              </Select>
            </FormControl>
          )}
        />
      </Grid>
    );
  };

  return (
    <>
      {errors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{errors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
      <Grid container spacing={3} marginBottom={2}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Controller
            control={control}
            name="provider"
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>{Locale.label("settings.givingSettingsEdit.prov")}</InputLabel>
                <Select {...field} label={Locale.label("settings.givingSettingsEdit.prov")}>
                  <MenuItem value="">{Locale.label("settings.givingSettingsEdit.none")}</MenuItem>
                  {providerOptions.map((p) => (
                    <MenuItem key={p.key} value={p.descriptor.adminValue}>{p.descriptor.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          />
        </Grid>
        {provider && !knownProvider && (
          <Grid size={{ xs: 12 }}>
            {/* ponytail: admin-only misconfiguration warning — intentionally not localized (rare, English-only edge). */}
            <Alert severity="warning">This church is configured with an unrecognized payment provider (&quot;{provider}&quot;). Please reselect a provider above.</Alert>
          </Grid>
        )}
        {descriptor && (descriptor.setupInstructionsKey || signupHref) && (
          <Grid size={{ xs: 12 }}>
            <Typography variant="body2" color="textSecondary" component="div">
              {descriptor.setupInstructionsKey ? Locale.label(descriptor.setupInstructionsKey) : ""}
              {signupHref && <> <a href={signupHref} target="_blank" rel="noopener noreferrer">{descriptor.label}</a></>}
            </Typography>
            {webhookUrl && (
              <Typography variant="body2" color="textSecondary" component="div" sx={{ mt: 1 }}>
                {Locale.label("settings.givingSettingsEdit.kfWebhookInstructions")} <code style={{ wordBreak: "break-all" }}>{webhookUrl}</code>
                <IconButton size="small" onClick={copyWebhookUrl} aria-label={Locale.label("settings.givingSettingsEdit.copyWebhookUrl")} sx={{ ml: 0.5, verticalAlign: "middle" }}>
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
      <Snackbar open={copySnackbar} autoHideDuration={2500} onClose={() => setCopySnackbar(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" variant="filled" onClose={() => setCopySnackbar(false)}>{Locale.label("settings.givingSettingsEdit.webhookUrlCopied")}</Alert>
      </Snackbar>
    </>
  );
};
