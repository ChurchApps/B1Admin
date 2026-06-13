import { ApiHelper, Locale, UniqueIdHelper } from "@churchapps/apphelper";
import { type GenericSettingInterface } from "@churchapps/helpers";
import { Grid, Icon, InputAdornment, TextField } from "@mui/material";
import React from "react";
import { useForm } from "react-hook-form";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  provider?: string;
  currency?: string;
}

type AnyRecord = Record<string, any>;

const stripeCurrencyFees = {
  usd: { percent: 2.9, fixed: 0.3, symbol: "$" },
  eur: { percent: 2.9, fixed: 0.25, symbol: "€" },
  gbp: { percent: 2.9, fixed: 0.2, symbol: "£" },
  cad: { percent: 2.9, fixed: 0.3, symbol: "C$" },
  aud: { percent: 2.9, fixed: 0.3, symbol: "A$" },
  inr: { percent: 2.9, fixed: 3.0, symbol: "₹" },
  jpy: { percent: 2.9, fixed: 30.0, symbol: "¥" },
  sgd: { percent: 2.9, fixed: 0.5, symbol: "S$" },
  hkd: { percent: 2.9, fixed: 2.35, symbol: "元" },
  sek: { percent: 2.9, fixed: 2.5, symbol: "SEK" },
  nok: { percent: 2.9, fixed: 2.0, symbol: "NOK" },
  dkk: { percent: 2.9, fixed: 1.8, symbol: "DKK" },
  chf: { percent: 2.9, fixed: 0.3, symbol: "CHF" },
  mxn: { percent: 2.9, fixed: 3.0, symbol: "MXN" },
  brl: { percent: 3.9, fixed: 0.5, symbol: "R$" }
};

export const FeeOptionsSettingsEdit: React.FC<Props> = (props) => {
  const [flatRateCC, setFlatRateCC] = React.useState<GenericSettingInterface>(null);
  const [transFeeCC, setTransFeeCC] = React.useState<GenericSettingInterface>(null);
  const [flatRateACH, setFlatRateACH] = React.useState<GenericSettingInterface>(null);
  const [hardLimitACH, setHardLimitACH] = React.useState<GenericSettingInterface>(null);
  const [flatRatePayPal, setFlatRatePayPal] = React.useState<GenericSettingInterface>(null);
  const [transFeePayPal, setTransFeePayPal] = React.useState<GenericSettingInterface>(null);
  const [flatRateKF, setFlatRateKF] = React.useState<GenericSettingInterface>(null);
  const [transFeeKF, setTransFeeKF] = React.useState<GenericSettingInterface>(null);
  const [symbol, setSymbol] = React.useState("$");
  const [loadedCurrency, setLoadedCurrency] = React.useState("usd");
  const [hasLoadedData, setHasLoadedData] = React.useState(false);

  const { register, reset, getValues, setValue } = useForm<AnyRecord>({ defaultValues: { flatRateCC: "0.30", transFeeCC: "2.9", flatRateACH: "0.8", hardLimitACH: "5", flatRatePayPal: "0.30", transFeePayPal: "2.9", flatRateKF: "0.30", transFeeKF: "2.9" } });

  const loadData = async () => {
    const currentCurrency = (props.currency || "usd").toLowerCase();
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const next = { flatRateCC: "0.30", transFeeCC: "2.9", flatRateACH: "0.8", hardLimitACH: "5", flatRatePayPal: "0.30", transFeePayPal: "2.9", flatRateKF: "0.30", transFeeKF: "2.9" };

    const creditCardFlatRate = allSettings.filter((s) => s.keyName === "flatRateCC");
    if (creditCardFlatRate.length > 0) { setFlatRateCC(creditCardFlatRate[0]); next.flatRateCC = creditCardFlatRate[0].value; } else {
      const fees = stripeCurrencyFees[currentCurrency as keyof typeof stripeCurrencyFees];
      if (fees) next.flatRateCC = fees.fixed.toString();
    }

    const creditCardTransactionFee = allSettings.filter((s) => s.keyName === "transFeeCC");
    if (creditCardTransactionFee.length > 0) { setTransFeeCC(creditCardTransactionFee[0]); next.transFeeCC = creditCardTransactionFee[0].value; } else {
      const fees = stripeCurrencyFees[currentCurrency as keyof typeof stripeCurrencyFees];
      if (fees) next.transFeeCC = fees.percent.toString();
    }

    const achFlatRate = allSettings.filter((s) => s.keyName === "flatRateACH");
    if (achFlatRate.length > 0) { setFlatRateACH(achFlatRate[0]); next.flatRateACH = achFlatRate[0].value; }

    const achHardLimit = allSettings.filter((s) => s.keyName === "hardLimitACH");
    if (achHardLimit.length > 0) { setHardLimitACH(achHardLimit[0]); next.hardLimitACH = achHardLimit[0].value; }

    const paypalFlatRate = allSettings.filter((s) => s.keyName === "flatRatePayPal");
    if (paypalFlatRate.length > 0) { setFlatRatePayPal(paypalFlatRate[0]); next.flatRatePayPal = paypalFlatRate[0].value; }

    const paypalTransactionFee = allSettings.filter((s) => s.keyName === "transFeePayPal");
    if (paypalTransactionFee.length > 0) { setTransFeePayPal(paypalTransactionFee[0]); next.transFeePayPal = paypalTransactionFee[0].value; }

    const kfFlatRate = allSettings.filter((s) => s.keyName === "flatRateKF");
    if (kfFlatRate.length > 0) { setFlatRateKF(kfFlatRate[0]); next.flatRateKF = kfFlatRate[0].value; }

    const kfTransactionFee = allSettings.filter((s) => s.keyName === "transFeeKF");
    if (kfTransactionFee.length > 0) { setTransFeeKF(kfTransactionFee[0]); next.transFeeKF = kfTransactionFee[0].value; }

    reset(next);
    setLoadedCurrency(currentCurrency);
    const fees = stripeCurrencyFees[currentCurrency as keyof typeof stripeCurrencyFees];
    if (fees) setSymbol(fees.symbol);
    setHasLoadedData(true);
  };

  const save = () => {
    const values = getValues();
    const flatRateCCSett: GenericSettingInterface = flatRateCC === null ? { churchId: props.churchId, public: 1, keyName: "flatRateCC" } : flatRateCC;
    flatRateCCSett.value = values.flatRateCC;

    const transFeeCCSett: GenericSettingInterface = transFeeCC === null ? { churchId: props.churchId, public: 1, keyName: "transFeeCC" } : transFeeCC;
    transFeeCCSett.value = values.transFeeCC;

    const flatRateACHSett: GenericSettingInterface = flatRateACH === null ? { churchId: props.churchId, public: 1, keyName: "flatRateACH" } : flatRateACH;
    flatRateACHSett.value = values.flatRateACH;

    const hardLimitACHSett: GenericSettingInterface = hardLimitACH === null ? { churchId: props.churchId, public: 1, keyName: "hardLimitACH" } : hardLimitACH;
    hardLimitACHSett.value = values.hardLimitACH;

    const flatRatePayPalSett: GenericSettingInterface = flatRatePayPal === null ? { churchId: props.churchId, public: 1, keyName: "flatRatePayPal" } : flatRatePayPal;
    flatRatePayPalSett.value = values.flatRatePayPal;

    const transFeePayPalSett: GenericSettingInterface = transFeePayPal === null ? { churchId: props.churchId, public: 1, keyName: "transFeePayPal" } : transFeePayPal;
    transFeePayPalSett.value = values.transFeePayPal;

    const flatRateKFSett: GenericSettingInterface = flatRateKF === null ? { churchId: props.churchId, public: 1, keyName: "flatRateKF" } : flatRateKF;
    flatRateKFSett.value = values.flatRateKF;

    const transFeeKFSett: GenericSettingInterface = transFeeKF === null ? { churchId: props.churchId, public: 1, keyName: "transFeeKF" } : transFeeKF;
    transFeeKFSett.value = values.transFeeKF;

    ApiHelper.post("/settings", [
      flatRateCCSett, transFeeCCSett, flatRateACHSett, hardLimitACHSett, flatRatePayPalSett, transFeePayPalSett, flatRateKFSett, transFeeKFSett
    ], "MembershipApi");
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);

  React.useEffect(() => {
    if (props.saveTrigger !== null) save();
  }, [props.saveTrigger]);

  React.useEffect(() => {
    if (!hasLoadedData) return;
    const currentCurrency = (props.currency || "usd").toLowerCase();
    if (currentCurrency === loadedCurrency) return;
    const fees = stripeCurrencyFees[currentCurrency as keyof typeof stripeCurrencyFees];
    if (!fees) return;
    setValue("flatRateCC", fees.fixed.toString());
    setValue("transFeeCC", fees.percent.toString());
    setSymbol(fees.symbol);
    setLoadedCurrency(currentCurrency);
  }, [props.currency, hasLoadedData, loadedCurrency, setValue]);

  const showStripeFields = props.provider === "Stripe";
  const showPayPalFields = props.provider === "Paypal";
  const showKFFields = props.provider === "KingdomFunding";
  const currentCurrency = (props.currency || "usd").toLowerCase();
  const showACHFields = currentCurrency === "usd";

  return (
    <Grid container spacing={2}>
      {showStripeFields && (
        <>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth margin="dense" type="number" label={Locale.label("settings.feeOptionsSettings.creditCardFlatRate")} slotProps={{ input: { startAdornment: <InputAdornment position="start">{symbol}</InputAdornment> } }} {...register("flatRateCC")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth margin="dense" type="number" label={Locale.label("settings.feeOptionsSettings.creditCardTransactionFee")} InputProps={{ endAdornment: <Icon fontSize="small">percent</Icon> }} {...register("transFeeCC")} />
          </Grid>
          {showACHFields && (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth margin="dense" type="number" label={Locale.label("settings.feeOptionsSettings.achFlatRate")} InputProps={{ endAdornment: <Icon fontSize="small">percent</Icon> }} {...register("flatRateACH")} />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField fullWidth margin="dense" type="number" label={Locale.label("settings.feeOptionsSettings.achHardLimit")} InputProps={{ startAdornment: <Icon fontSize="small">attach_money</Icon> }} {...register("hardLimitACH")} />
              </Grid>
            </>
          )}
        </>
      )}
      {showPayPalFields && (
        <>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth margin="dense" type="number" label={Locale.label("settings.feeOptionsSettings.paypalFlatRate")} InputProps={{ startAdornment: <Icon fontSize="small">attach_money</Icon> }} {...register("flatRatePayPal")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth margin="dense" type="number" label={Locale.label("settings.feeOptionsSettings.paypalTransactionFee")} InputProps={{ endAdornment: <Icon fontSize="small">percent</Icon> }} {...register("transFeePayPal")} />
          </Grid>
        </>
      )}
      {showKFFields && (
        <>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth margin="dense" type="number" label={Locale.label("settings.feeOptionsSettings.kfFlatRate")} InputProps={{ startAdornment: <Icon fontSize="small">attach_money</Icon> }} {...register("flatRateKF")} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField fullWidth margin="dense" type="number" label={Locale.label("settings.feeOptionsSettings.kfTransactionFee")} InputProps={{ endAdornment: <Icon fontSize="small">percent</Icon> }} {...register("transFeeKF")} />
          </Grid>
        </>
      )}
    </Grid>
  );
};
