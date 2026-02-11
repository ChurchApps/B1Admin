import { type GenericSettingInterface, type VisibilityPreferenceInterface } from "@churchapps/helpers";
import { ApiHelper, Locale, UniqueIdHelper } from "@churchapps/apphelper";
import { Box, FormControl, Grid, Icon, InputLabel, MenuItem, Select, Stack, Tooltip, Typography, type SelectChangeEvent } from "@mui/material";
import React, { useState } from "react";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
}

export const VisbilityPrefSettingsEdit: React.FC<Props> = (props) => {
  const [addressSetting, setAddressSetting] = useState<GenericSettingInterface>(null);
  const [phoneSetting, setPhoneSetting] = useState<GenericSettingInterface>(null);
  const [emailSetting, setEmailSetting] = useState<GenericSettingInterface>(null);
  const [pref, setPref] = useState<VisibilityPreferenceInterface>({ address: "", phoneNumber: "", email: "" } as VisibilityPreferenceInterface);

  const loadData = async () => {
    const p = { ...pref };
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const address = allSettings.filter((s) => s.keyName === "addressVisibility");
    if (address.length > 0) {
      setAddressSetting(address[0]);
      p.address = address[0].value;
    }

    const phone = allSettings.filter((s) => s.keyName === "phoneVisibility");
    if (phone.length > 0) {
      setPhoneSetting(phone[0]);
      p.phoneNumber = phone[0].value;
    }

    const email = allSettings.filter((s) => s.keyName === "emailVisibility");
    if (email.length > 0) {
      setEmailSetting(email[0]);
      p.email = email[0].value;
    }

    setPref(p);
  };

  const handlePrefChange = (e: React.ChangeEvent<HTMLInputElement> | SelectChangeEvent) => {
    const p = { ...pref } as VisibilityPreferenceInterface;
    const value = e.target.value;
    switch (e.target.name) {
      case "address": p.address = value; break;
      case "phoneNumber": p.phoneNumber = value; break;
      case "email": p.email = value; break;
    }
    setPref(p);
  };

  const save = () => {
    const addressSett: GenericSettingInterface = addressSetting === null ? { churchId: props.churchId, public: 1, keyName: "addressVisibility" } : addressSetting;
    addressSett.value = pref.address;

    const phoneSett: GenericSettingInterface = phoneSetting === null ? { churchId: props.churchId, public: 1, keyName: "phoneVisibility" } : phoneSetting;
    phoneSett.value = pref.phoneNumber;

    const emailSett: GenericSettingInterface = emailSetting === null ? { churchId: props.churchId, public: 1, keyName: "emailVisibility" } : emailSetting;
    emailSett.value = pref.email;

    ApiHelper.post("/settings", [addressSett, phoneSett, emailSett], "MembershipApi");
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);
  React.useEffect(checkSave, [props.saveTrigger]);

  return (
    <Box sx={{ mb: 0 }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("settings.visibilityPrefSettingsEdit.visibilityPreference")}</Typography>
        <Tooltip title={Locale.label("settings.visibilityPrefSettingsEdit.forceMsg")} arrow>
          <Icon fontSize="small" sx={{ cursor: "pointer", color: "text.disabled", ml: 0.5 }}>
            help_outline
          </Icon>
        </Tooltip>
      </Stack>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="address">{Locale.label("settings.visibilityPrefSettingsEdit.address")}</InputLabel>
            <Select fullWidth labelId="address" label={Locale.label("settings.visibilityPrefSettingsEdit.address")} name="address" value={pref.address} defaultValue="" onChange={handlePrefChange}>
              <MenuItem value="everyone">{Locale.label("settings.visibilityPrefSettingsEdit.everyone")}</MenuItem>
              <MenuItem value="members">{Locale.label("settings.visibilityPrefSettingsEdit.members")}</MenuItem>
              <MenuItem value="groups">{Locale.label("settings.visibilityPrefSettingsEdit.groups")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="phone">{Locale.label("settings.visibilityPrefSettingsEdit.phoneNum")}</InputLabel>
            <Select
              fullWidth
              labelId="phone"
              label={Locale.label("settings.visibilityPrefSettingsEdit.phoneNum")}
              name="phoneNumber"
              value={pref.phoneNumber}
              defaultValue=""
              onChange={handlePrefChange}>
              <MenuItem value="everyone">{Locale.label("settings.visibilityPrefSettingsEdit.everyone")}</MenuItem>
              <MenuItem value="members">{Locale.label("settings.visibilityPrefSettingsEdit.members")}</MenuItem>
              <MenuItem value="groups">{Locale.label("settings.visibilityPrefSettingsEdit.groups")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid size={{ xs: 12, sm: 12, md: 4 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="email">{Locale.label("settings.visibilityPrefSettingsEdit.email")}</InputLabel>
            <Select fullWidth labelId="email" label={Locale.label("settings.visibilityPrefSettingsEdit.email")} name="email" value={pref.email} defaultValue="" onChange={handlePrefChange}>
              <MenuItem value="everyone">{Locale.label("settings.visibilityPrefSettingsEdit.everyone")}</MenuItem>
              <MenuItem value="members">{Locale.label("settings.visibilityPrefSettingsEdit.members")}</MenuItem>
              <MenuItem value="groups">{Locale.label("settings.visibilityPrefSettingsEdit.groups")}</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
};
