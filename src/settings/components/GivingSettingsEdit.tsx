import React from "react";
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
  onError?: (errors: string[]) => void;
}

type AnyRecord = Record<string, any>;

const stripeSupportedCurrencies = [
  "usd", "eur", "gbp", "cad", "aud", "inr", "jpy", "sgd", "hkd", "sek", "nok", "dkk", "chf", "mxn", "brl"
];

export const GivingSettingsEdit: React.FC<Props> = (props) => {
  const [gateway, setGateway] = React.useState<PaymentGatewaysInterface>(null);
  const [errors, setErrors] = React.useState<string[]>([]);

  const { register, reset, control, watch, getValues } = useForm<AnyRecord>({ defaultValues: { provider: "", publicKey: "", privateKey: "", payFees: false, currency: "usd" } });
  const provider = watch("provider");
  const currency = watch("currency");

  const save = async () => {
    try {
      const values = getValues();
      if (values.provider === "") {
        if (!UniqueIdHelper.isMissing(gateway?.id)) await ApiHelper.delete("/gateways/" + gateway.id, "GivingApi");
      } else {
        if (values.privateKey === "") return;
        const gw: PaymentGatewaysInterface = gateway === null ? { churchId: props.churchId } : { ...gateway };
        gw.provider = values.provider;
        gw.publicKey = values.publicKey;
        gw.payFees = values.payFees;
        gw.currency = values.currency;
        if (values.privateKey !== "") gw.privateKey = values.privateKey;
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
      reset({ provider: "", publicKey: "", privateKey: "", payFees: false, currency: "usd" });
    } else {
      setGateway(gateways[0]);
      reset({
        provider: gateways[0].provider || "",
        publicKey: gateways[0].publicKey || "",
        privateKey: "",
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
                  <MenuItem value="Stripe">{Locale.label("settings.givingSettingsEdit.stripe")}</MenuItem>
                </Select>
              </FormControl>
            )}
          />
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
        {getKeys()}
        {getCurrency()}
      </Grid>
      <FeeOptionsSettingsEdit churchId={props.churchId} saveTrigger={props.saveTrigger} provider={provider} currency={currency} />
    </>
  );
};
