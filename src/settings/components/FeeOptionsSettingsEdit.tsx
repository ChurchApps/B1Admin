import { ApiHelper, type GenericSettingInterface, Locale, UniqueIdHelper } from "@churchapps/apphelper";
import { Grid, Icon, TextField } from "@mui/material";
import React from "react";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
}

export const FeeOptionsSettingsEdit: React.FC<Props> = (props) => {
  const [flatRateCC, setFlatRateCC] = React.useState<GenericSettingInterface>(null);
  const [transFeeCC, setTransFeeCC] = React.useState<GenericSettingInterface>(null);
  const [flatRateACH, setFlatRateACH] = React.useState<GenericSettingInterface>(null);
  const [hardLimitACH, setHardLimitACH] = React.useState<GenericSettingInterface>(null);
  const [options, setOptions] = React.useState({
    flatRateCC: "0.30",
    transFeeCC: "2.9",
    flatRateACH: "0.8",
    hardLimitACH: "5",
  });

  const loadData = async () => {
    const o = { ...options };
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const creditCardFlatRate = allSettings.filter((s) => s.keyName === "flatRateCC");
    if (creditCardFlatRate.length > 0) {
      setFlatRateCC(creditCardFlatRate[0]);
      o.flatRateCC = creditCardFlatRate[0].value;
    }

    const creditCardTransactionFee = allSettings.filter((s) => s.keyName === "transFeeCC");
    if (creditCardTransactionFee.length > 0) {
      setTransFeeCC(creditCardTransactionFee[0]);
      o.transFeeCC = creditCardTransactionFee[0].value;
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

    setOptions(o);
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

    ApiHelper.post("/settings", [flatRateCCSett, transFeeCCSett, flatRateACHSett, hardLimitACHSett], "MembershipApi");
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]); //eslint-disable-line
  React.useEffect(checkSave, [props.saveTrigger]); //eslint-disable-line

  return (
    <Grid container spacing={2}>
      <Grid xs={12} md={6}>
        <TextField
          fullWidth
          margin="dense"
          type="number"
          label={Locale.label("settings.feeOptionsSettings.creditCardFlatRate")}
          name="creditCardFlatRate"
          onChange={handleChange}
          value={options.flatRateCC}
          defaultValue=""
          // helperText="Credit Card"
          InputProps={{ startAdornment: <Icon fontSize="small">attach_money</Icon> }}
        />
      </Grid>
      <Grid xs={12} md={6}>
        <TextField
          fullWidth
          margin="dense"
          type="number"
          label={Locale.label("settings.feeOptionsSettings.creditCardTransactionFee")}
          name="creditCardTransactionFee"
          onChange={handleChange}
          value={options.transFeeCC}
          defaultValue=""
          // helperText="Credit Card"
          InputProps={{ endAdornment: <Icon fontSize="small">percent</Icon> }}
        />
      </Grid>
      <Grid xs={12} md={6}>
        <TextField
          fullWidth
          margin="dense"
          type="number"
          label={Locale.label("settings.feeOptionsSettings.achFlatRate")}
          name="achFlatRate"
          onChange={handleChange}
          value={options.flatRateACH}
          defaultValue=""
          // helperText="ACH"
          InputProps={{ endAdornment: <Icon fontSize="small">percent</Icon> }}
        />
      </Grid>
      <Grid xs={12} md={6}>
        <TextField
          fullWidth
          margin="dense"
          type="number"
          label={Locale.label("settings.feeOptionsSettings.achHardLimit")}
          name="achHardLimit"
          onChange={handleChange}
          value={options.hardLimitACH}
          defaultValue=""
          // helperText="ACH"
          InputProps={{ startAdornment: <Icon fontSize="small">attach_money</Icon> }}
        />
      </Grid>
    </Grid>
  );
};
