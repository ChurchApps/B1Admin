import { ApiHelper, Locale, UniqueIdHelper } from "@churchapps/apphelper";
import { getPaymentProvider } from "@churchapps/apphelper/donations";
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

export const FeeOptionsSettingsEdit: React.FC<Props> = (props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [flatRateCC, setFlatRateCC] = React.useState<GenericSettingInterface | null>(null);
  const [transFeeCC, setTransFeeCC] = React.useState<GenericSettingInterface | null>(null);
  const [flatRateACH, setFlatRateACH] = React.useState<GenericSettingInterface | null>(null);
  const [hardLimitACH, setHardLimitACH] = React.useState<GenericSettingInterface | null>(null);
  const [flatRatePayPal, setFlatRatePayPal] = React.useState<GenericSettingInterface | null>(null);
  const [transFeePayPal, setTransFeePayPal] = React.useState<GenericSettingInterface | null>(null);
  const [flatRateKF, setFlatRateKF] = React.useState<GenericSettingInterface | null>(null);
  const [transFeeKF, setTransFeeKF] = React.useState<GenericSettingInterface | null>(null);
  const [symbol, setSymbol] = React.useState("$");
  const [loadedCurrency, setLoadedCurrency] = React.useState("usd");
  const [hasLoadedData, setHasLoadedData] = React.useState(false);

  const { register, reset, getValues, setValue } = useForm<AnyRecord>({ defaultValues: { flatRateCC: "0.30", transFeeCC: "2.9", flatRateACH: "0.8", hardLimitACH: "5", flatRatePayPal: "0.30", transFeePayPal: "2.9", flatRateKF: "0.30", transFeeKF: "2.9" } });

  const defaultFees = props.provider ? getPaymentProvider(props.provider).descriptor.defaultFees : undefined;

  const loadData = async () => {
    const currentCurrency = (props.currency || "usd").toLowerCase();
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const next = { flatRateCC: "0.30", transFeeCC: "2.9", flatRateACH: "0.8", hardLimitACH: "5", flatRatePayPal: "0.30", transFeePayPal: "2.9", flatRateKF: "0.30", transFeeKF: "2.9" };

    const creditCardFlatRate = allSettings.filter((s) => s.keyName === "flatRateCC");
    if (creditCardFlatRate.length > 0) { setFlatRateCC(creditCardFlatRate[0]); next.flatRateCC = creditCardFlatRate[0].value ?? next.flatRateCC; } else {
      const fees = defaultFees?.[currentCurrency];
      if (fees) next.flatRateCC = fees.fixed.toString();
    }

    const creditCardTransactionFee = allSettings.filter((s) => s.keyName === "transFeeCC");
    if (creditCardTransactionFee.length > 0) { setTransFeeCC(creditCardTransactionFee[0]); next.transFeeCC = creditCardTransactionFee[0].value ?? next.transFeeCC; } else {
      const fees = defaultFees?.[currentCurrency];
      if (fees) next.transFeeCC = fees.percent.toString();
    }

    const achFlatRate = allSettings.filter((s) => s.keyName === "flatRateACH");
    if (achFlatRate.length > 0) { setFlatRateACH(achFlatRate[0]); next.flatRateACH = achFlatRate[0].value ?? next.flatRateACH; }

    const achHardLimit = allSettings.filter((s) => s.keyName === "hardLimitACH");
    if (achHardLimit.length > 0) { setHardLimitACH(achHardLimit[0]); next.hardLimitACH = achHardLimit[0].value ?? next.hardLimitACH; }

    const paypalFlatRate = allSettings.filter((s) => s.keyName === "flatRatePayPal");
    if (paypalFlatRate.length > 0) { setFlatRatePayPal(paypalFlatRate[0]); next.flatRatePayPal = paypalFlatRate[0].value ?? next.flatRatePayPal; }

    const paypalTransactionFee = allSettings.filter((s) => s.keyName === "transFeePayPal");
    if (paypalTransactionFee.length > 0) { setTransFeePayPal(paypalTransactionFee[0]); next.transFeePayPal = paypalTransactionFee[0].value ?? next.transFeePayPal; }

    const kfFlatRate = allSettings.filter((s) => s.keyName === "flatRateKF");
    if (kfFlatRate.length > 0) { setFlatRateKF(kfFlatRate[0]); next.flatRateKF = kfFlatRate[0].value ?? next.flatRateKF; }

    const kfTransactionFee = allSettings.filter((s) => s.keyName === "transFeeKF");
    if (kfTransactionFee.length > 0) { setTransFeeKF(kfTransactionFee[0]); next.transFeeKF = kfTransactionFee[0].value ?? next.transFeeKF; }

    reset(next);
    setLoadedCurrency(currentCurrency);
    const fees = defaultFees?.[currentCurrency];
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
    const fees = defaultFees?.[currentCurrency];
    if (!fees) return;
    // Always keep the symbol in sync — loadData can run before the real currency propagates.
    setSymbol(fees.symbol);
    if (currentCurrency === loadedCurrency) return;
    setLoadedCurrency(currentCurrency);
    // Re-default ONLY unsaved fees so the stale-USD default is corrected once the real currency
    // arrives, without ever clobbering values the church explicitly saved.
    if (flatRateCC === null) setValue("flatRateCC", fees.fixed.toString());
    if (transFeeCC === null) setValue("transFeeCC", fees.percent.toString());
  }, [props.currency, hasLoadedData, loadedCurrency, flatRateCC, transFeeCC, setValue]);

  const feeFields = props.provider ? getPaymentProvider(props.provider).descriptor.feeFields : [];
  const showStripeFields = feeFields.includes("card");
  const showPayPalFields = feeFields.includes("paypal");
  const showKFFields = feeFields.includes("kf");
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
