import { ApiHelper, Locale, UniqueIdHelper } from "@churchapps/apphelper";
import { type GenericSettingInterface } from "@churchapps/helpers";
import { Grid, Icon, TextField, Typography } from "@mui/material";
import React from "react";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  provider?: string;
  currency?: string;
}

export const FeeOptionsSettingsEdit: React.FC<Props> = (props) => {
  const [flatRateCC, setFlatRateCC] = React.useState<GenericSettingInterface>(null);
  const [transFeeCC, setTransFeeCC] = React.useState<GenericSettingInterface>(null);
  const [flatRateACH, setFlatRateACH] = React.useState<GenericSettingInterface>(null);
  const [hardLimitACH, setHardLimitACH] = React.useState<GenericSettingInterface>(null);
  const [flatRatePayPal, setFlatRatePayPal] = React.useState<GenericSettingInterface>(null);
  const [transFeePayPal, setTransFeePayPal] = React.useState<GenericSettingInterface>(null);
  const [options, setOptions] = React.useState({
    flatRateCC: "0.30",
    transFeeCC: "2.9",
    flatRateACH: "0.8",
    hardLimitACH: "5",
    flatRatePayPal: "0.30",
    transFeePayPal: "2.9",
    symbol: "$",
    currency: "usd",
  });
  const [hasLoadedData, setHasLoadedData] = React.useState(false);

  // Stripe currency-specific fees
  const stripeCurrencyFees = {
    usd: { percent: 2.9, fixed: 0.3, symbol: "$" },
    eur: { percent: 2.9, fixed: 0.25, symbol: "€" },
    gbp: { percent: 2.9, fixed: 0.2, symbol: "£" },
    cad: { percent: 2.9, fixed: 0.3, symbol: "$" },
    aud: { percent: 2.9, fixed: 0.3, symbol: "$" },
    inr: { percent: 2.9, fixed: 3.0, symbol: "₹" },
    jpy: { percent: 2.9, fixed: 30.0, symbol: "¥" },
    sgd: { percent: 2.9, fixed: 0.5, symbol: "S$" },
    hkd: { percent: 2.9, fixed: 2.35, symbol: "元" },
    sek: { percent: 2.9, fixed: 2.5, symbol: "kr" },
    nok: { percent: 2.9, fixed: 2.0, symbol: "kr" },
    dkk: { percent: 2.9, fixed: 1.8, symbol: "kr" },
    chf: { percent: 2.9, fixed: 0.3, symbol: "CHF" },
    mxn: { percent: 2.9, fixed: 3.0, symbol: "MXN" },
    brl: { percent: 3.9, fixed: 0.5, symbol: "R$" },
  };

  const loadData = async () => {
    const o = { ...options };
    const currentCurrency = (props.currency || "usd").toLowerCase();
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const creditCardFlatRate = allSettings.filter((s) => s.keyName === "flatRateCC");
    if (creditCardFlatRate.length > 0) {
      setFlatRateCC(creditCardFlatRate[0]);
      o.flatRateCC = creditCardFlatRate[0].value;
    } else {
      // Use default for current currency if no saved value
      const currencyFees = stripeCurrencyFees[currentCurrency as keyof typeof stripeCurrencyFees];
      if (currencyFees) {
        o.flatRateCC = currencyFees.fixed.toString();
      }
    }

    const creditCardTransactionFee = allSettings.filter((s) => s.keyName === "transFeeCC");
    if (creditCardTransactionFee.length > 0) {
      setTransFeeCC(creditCardTransactionFee[0]);
      o.transFeeCC = creditCardTransactionFee[0].value;
    } else {
      // Use default for current currency if no saved value
      const currencyFees = stripeCurrencyFees[currentCurrency as keyof typeof stripeCurrencyFees];
      if (currencyFees) {
        o.transFeeCC = currencyFees.percent.toString();
      }
    }

    const achFlatRate = allSettings.filter((s) => s.keyName === "flatRateACH");
    if (achFlatRate.length > 0) {
      setFlatRateACH(achFlatRate[0]);
      o.flatRateACH = achFlatRate[0].value;
    }

    const achHardLimit = allSettings.filter((s) => s.keyName === "hardLimitACH");
    if (achHardLimit.length > 0) {
      setHardLimitACH(achHardLimit[0]);
      o.hardLimitACH = achHardLimit[0].value;
    }

    const paypalFlatRate = allSettings.filter((s) => s.keyName === "flatRatePayPal");
    if (paypalFlatRate.length > 0) {
      setFlatRatePayPal(paypalFlatRate[0]);
      o.flatRatePayPal = paypalFlatRate[0].value;
    }

    const paypalTransactionFee = allSettings.filter((s) => s.keyName === "transFeePayPal");
    if (paypalTransactionFee.length > 0) {
      setTransFeePayPal(paypalTransactionFee[0]);
      o.transFeePayPal = paypalTransactionFee[0].value;
    }

    o.currency = currentCurrency;
    setOptions(o);
    setHasLoadedData(true);
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.preventDefault();
    const o = { ...options };
    const value = e.target.value;
    switch (e.target.name) {
      case "creditCardFlatRate":
        o.flatRateCC = value;
        break;
      case "creditCardTransactionFee":
        o.transFeeCC = value;
        break;
      case "achFlatRate":
        o.flatRateACH = value;
        break;
      case "achHardLimit":
        o.hardLimitACH = value;
        break;
      case "paypalFlatRate":
        o.flatRatePayPal = value;
        break;
      case "paypalTransactionFee":
        o.transFeePayPal = value;
        break;
    }
    setOptions(o);
  };

  const save = () => {
    const flatRateCCSett: GenericSettingInterface = flatRateCC === null ? { churchId: props.churchId, public: 1, keyName: "flatRateCC" } : flatRateCC;
    flatRateCCSett.value = options.flatRateCC;

    const transFeeCCSett: GenericSettingInterface = transFeeCC === null ? { churchId: props.churchId, public: 1, keyName: "transFeeCC" } : transFeeCC;
    transFeeCCSett.value = options.transFeeCC;

    const flatRateACHSett: GenericSettingInterface = flatRateACH === null ? { churchId: props.churchId, public: 1, keyName: "flatRateACH" } : flatRateACH;
    flatRateACHSett.value = options.flatRateACH;

    const hardLimitACHSett: GenericSettingInterface = hardLimitACH === null ? { churchId: props.churchId, public: 1, keyName: "hardLimitACH" } : hardLimitACH;
    hardLimitACHSett.value = options.hardLimitACH;

    const flatRatePayPalSett: GenericSettingInterface = flatRatePayPal === null ? { churchId: props.churchId, public: 1, keyName: "flatRatePayPal" } : flatRatePayPal;
    flatRatePayPalSett.value = options.flatRatePayPal;

    const transFeePayPalSett: GenericSettingInterface = transFeePayPal === null ? { churchId: props.churchId, public: 1, keyName: "transFeePayPal" } : transFeePayPal;
    transFeePayPalSett.value = options.transFeePayPal;

    ApiHelper.post("/settings", [flatRateCCSett, transFeeCCSett, flatRateACHSett, hardLimitACHSett, flatRatePayPalSett, transFeePayPalSett], "MembershipApi");
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]); //eslint-disable-line
  React.useEffect(checkSave, [props.saveTrigger]); //eslint-disable-line

  // Update rates when currency changes
  React.useEffect(() => {
    if (!hasLoadedData) return;
    const currentCurrency = (props.currency || "usd").toLowerCase();

    setOptions((prevOptions) => {
      if (currentCurrency === prevOptions.currency) return prevOptions;

      const currencyFees = stripeCurrencyFees[currentCurrency as keyof typeof stripeCurrencyFees];
      if (!currencyFees) return prevOptions;

      const o = { ...prevOptions };
      // Always update to the new currency's defaults when currency changes
      o.flatRateCC = currencyFees.fixed.toString();
      o.transFeeCC = currencyFees.percent.toString();
      o.currency = currentCurrency;
      o.symbol = currencyFees.symbol;
      return o;
    });
  }, [props.currency, hasLoadedData]); //eslint-disable-line

  const showStripeFields = props.provider === "Stripe";
  const showPayPalFields = props.provider === "Paypal";
  const currentCurrency = (props.currency || "usd").toLowerCase();
  const showACHFields = currentCurrency === "usd";

  return (
    <Grid container spacing={2}>
      {showStripeFields && (
        <>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              margin="dense"
              type="number"
              label={Locale.label("settings.feeOptionsSettings.creditCardFlatRate")}
              name="creditCardFlatRate"
              onChange={handleChange}
              value={options.flatRateCC}
              defaultValue=""
              InputProps={{ startAdornment: <Icon><Typography>{options.symbol}</Typography></Icon> }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              margin="dense"
              type="number"
              label={Locale.label("settings.feeOptionsSettings.creditCardTransactionFee")}
              name="creditCardTransactionFee"
              onChange={handleChange}
              value={options.transFeeCC}
              defaultValue=""
              InputProps={{ endAdornment: <Icon fontSize="small">percent</Icon> }}
            />
          </Grid>
          {showACHFields && (
            <>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  margin="dense"
                  type="number"
                  label={Locale.label("settings.feeOptionsSettings.achFlatRate")}
                  name="achFlatRate"
                  onChange={handleChange}
                  value={options.flatRateACH}
                  defaultValue=""
                  InputProps={{ endAdornment: <Icon fontSize="small">percent</Icon> }}
                />
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <TextField
                  fullWidth
                  margin="dense"
                  type="number"
                  label={Locale.label("settings.feeOptionsSettings.achHardLimit")}
                  name="achHardLimit"
                  onChange={handleChange}
                  value={options.hardLimitACH}
                  defaultValue=""
                  InputProps={{ startAdornment: <Icon fontSize="small">attach_money</Icon> }}
                />
              </Grid>
            </>
          )}
        </>
      )}
      {showPayPalFields && (
        <>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              margin="dense"
              type="number"
              label={Locale.label("settings.feeOptionsSettings.paypalFlatRate") || "PayPal Flat Rate"}
              name="paypalFlatRate"
              onChange={handleChange}
              value={options.flatRatePayPal}
              defaultValue=""
              InputProps={{ startAdornment: <Icon fontSize="small">attach_money</Icon> }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              margin="dense"
              type="number"
              label={Locale.label("settings.feeOptionsSettings.paypalTransactionFee") || "PayPal Transaction Fee"}
              name="paypalTransactionFee"
              onChange={handleChange}
              value={options.transFeePayPal}
              defaultValue=""
              InputProps={{ endAdornment: <Icon fontSize="small">percent</Icon> }}
            />
          </Grid>
        </>
      )}
    </Grid>
  );
};
