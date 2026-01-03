import React from "react";
import {
  FormControl, InputLabel, MenuItem, Select, TextField, Grid, Stack, Switch, Typography, Tooltip, IconButton, type SelectChangeEvent
} from "@mui/material";
import HelpIcon from "@mui/icons-material/Help";
import { ApiHelper, ErrorMessages, Locale, UniqueIdHelper } from "@churchapps/apphelper";
import { type PaymentGatewaysInterface } from "../../helpers";
import { FeeOptionsSettingsEdit } from "./FeeOptionsSettingsEdit";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
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

  //these are just temporary until we get the list as per the languages we support
  const stripeSupportedCurrencies = [
    "usd", "eur", "gbp", "cad", "aud", "inr", "jpy", "sgd", "hkd", "sek", "nok", "dkk", "chf", "mxn", "brl"
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    e.preventDefault();
    switch (e.target.name) {
      case "provider":
        setProvider(e.target.value);
        break;
      case "publicKey":
        setPublicKey(e.target.value);
        break;
      case "privateKey":
        setPrivateKey(e.target.value);
        break;
      case "currency":
        setCurrency(e.target.value);
        break;
    }
  };

  const getKeys = () => {
    if (provider === "") return null;
    else {
      const publicLabel = provider === "Paypal"
        ? Locale.label("settings.givingSettingsEdit.clientId") || "Client ID"
        : Locale.label("settings.givingSettingsEdit.pubKey");
      const privateLabel = provider === "Paypal"
        ? Locale.label("settings.givingSettingsEdit.clientSecret") || "Client Secret"
        : Locale.label("settings.givingSettingsEdit.secKey");

      return (
        <>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField fullWidth name="publicKey" label={publicLabel} value={publicKey} onChange={handleChange} />
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
  React.useEffect(checkSave, [props.saveTrigger]); //eslint-disable-line

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
        {getKeys()}
        {getCurrency()}
      </Grid>
      <FeeOptionsSettingsEdit churchId={props.churchId} saveTrigger={props.saveTrigger} provider={provider} currency={currency} />
    </>
  );
};
