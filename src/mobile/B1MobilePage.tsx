import React from "react";
import { Box, Button, FormControl, Grid, Icon, InputLabel, MenuItem, Select, Stack, Tooltip, Typography } from "@mui/material";
import { ApiHelper, Locale, PageHeader, UniqueIdHelper, UserHelper } from "@churchapps/apphelper";
import type { GenericSettingInterface, GroupInterface, VisibilityPreferenceInterface } from "@churchapps/helpers";

export const B1MobilePage: React.FC = () => {
  const [groups, setGroups] = React.useState<GroupInterface[]>(null);
  const [selectedGroupId, setSelectedGroupId] = React.useState("");
  const [approvalSetting, setApprovalSetting] = React.useState<GenericSettingInterface | null>(null);
  const [directoryVisibility, setDirectoryVisibility] = React.useState("Members");
  const [visibilitySetting, setVisibilitySetting] = React.useState<GenericSettingInterface | null>(null);
  const [addressSetting, setAddressSetting] = React.useState<GenericSettingInterface | null>(null);
  const [phoneSetting, setPhoneSetting] = React.useState<GenericSettingInterface | null>(null);
  const [emailSetting, setEmailSetting] = React.useState<GenericSettingInterface | null>(null);
  const [pref, setPref] = React.useState<VisibilityPreferenceInterface>({ address: "", phoneNumber: "", email: "" } as VisibilityPreferenceInterface);
  const [saving, setSaving] = React.useState(false);

  const churchId = UserHelper.currentUserChurch?.church?.id;

  const loadData = React.useCallback(async () => {
    if (!churchId || UniqueIdHelper.isMissing(churchId)) return;
    const [groupsData, allSettings] = await Promise.all([
      ApiHelper.get("/groups/tag/standard", "MembershipApi"),
      ApiHelper.get("/settings", "MembershipApi") as Promise<GenericSettingInterface[]>
    ]);
    setGroups(groupsData);

    const approvalGroupSetting = allSettings.find(s => s.keyName === "directoryApprovalGroupId");
    if (approvalGroupSetting) {
      setApprovalSetting(approvalGroupSetting);
      setSelectedGroupId(approvalGroupSetting.value);
    }

    const dirSetting = allSettings.find(s => s.keyName === "directoryVisibility");
    if (dirSetting) {
      setVisibilitySetting(dirSetting);
      setDirectoryVisibility(dirSetting.value || "Members");
    }

    const p: VisibilityPreferenceInterface = { address: "", phoneNumber: "", email: "" } as VisibilityPreferenceInterface;
    const addr = allSettings.find(s => s.keyName === "addressVisibility");
    if (addr) { setAddressSetting(addr); p.address = addr.value; }
    const phone = allSettings.find(s => s.keyName === "phoneVisibility");
    if (phone) { setPhoneSetting(phone); p.phoneNumber = phone.value; }
    const email = allSettings.find(s => s.keyName === "emailVisibility");
    if (email) { setEmailSetting(email); p.email = email.value; }
    setPref(p);
  }, [churchId]);

  React.useEffect(() => { loadData(); }, [loadData]);

  const handlePrefChange = (name: string, value: string) => {
    setPref(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const approval: GenericSettingInterface = approvalSetting || { churchId, public: 1, keyName: "directoryApprovalGroupId" };
      approval.value = selectedGroupId;

      const visibility: GenericSettingInterface = visibilitySetting || { churchId, public: 1, keyName: "directoryVisibility" };
      visibility.value = directoryVisibility;

      const addrSett: GenericSettingInterface = addressSetting || { churchId, public: 1, keyName: "addressVisibility" };
      addrSett.value = pref.address;
      const phoneSett: GenericSettingInterface = phoneSetting || { churchId, public: 1, keyName: "phoneVisibility" };
      phoneSett.value = pref.phoneNumber;
      const emailSett: GenericSettingInterface = emailSetting || { churchId, public: 1, keyName: "emailVisibility" };
      emailSett.value = pref.email;

      await ApiHelper.post("/settings", [approval, visibility, addrSett, phoneSett, emailSett], "MembershipApi");
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title={Locale.label("mobile.b1MobilePage.title")} subtitle={Locale.label("mobile.b1MobilePage.subtitle")} />
      <Box sx={{ p: 3 }}>
        <Box sx={{ maxWidth: 700, p: 3, backgroundColor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
          <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{Locale.label("settings.directoryApprovalSettingsEdit.directoryApprovalGroup")}</Typography>
            <Tooltip title={Locale.label("settings.directoryApprovalSettingsEdit.forceMsg")} arrow>
              <Icon fontSize="small" sx={{ cursor: "pointer", color: "text.disabled", ml: 0.5 }}>help_outline</Icon>
            </Tooltip>
          </Stack>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="groups">{Locale.label("settings.directoryApprovalSettingsEdit.groups")}</InputLabel>
                <Select labelId="groups" name="groups" label={Locale.label("settings.directoryApprovalSettingsEdit.groups")} value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
                  <MenuItem value="">{Locale.label("settings.directoryApprovalSettingsEdit.none")}</MenuItem>
                  {groups?.length > 0 ? (
                    groups.map(g => <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>)
                  ) : (
                    <MenuItem value="" disabled>{Locale.label("settings.directoryApprovalSettingsEdit.noGroups")}</MenuItem>
                  )}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="directoryVisibility">{Locale.label("settings.directoryVisibility.label")}</InputLabel>
                <Select
                  fullWidth
                  labelId="directoryVisibility"
                  label={Locale.label("settings.directoryVisibility.label")}
                  name="directoryVisibility"
                  value={directoryVisibility}
                  onChange={(e) => setDirectoryVisibility(e.target.value)}>
                  <MenuItem value="Staff">{Locale.label("settings.directoryVisibility.staff")}</MenuItem>
                  <MenuItem value="Members">{Locale.label("settings.directoryVisibility.members")}</MenuItem>
                  <MenuItem value="Regular Attendees">{Locale.label("settings.directoryVisibility.regularAttendees")}</MenuItem>
                  <MenuItem value="Everyone">{Locale.label("settings.directoryVisibility.everyone")}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{Locale.label("settings.visibilityPrefSettingsEdit.visibilityPreference")}</Typography>
            <Tooltip title={Locale.label("settings.visibilityPrefSettingsEdit.forceMsg")} arrow>
              <Icon fontSize="small" sx={{ cursor: "pointer", color: "text.disabled", ml: 0.5 }}>help_outline</Icon>
            </Tooltip>
          </Stack>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="address">{Locale.label("settings.visibilityPrefSettingsEdit.address")}</InputLabel>
                <Select fullWidth labelId="address" label={Locale.label("settings.visibilityPrefSettingsEdit.address")} name="address" value={pref.address} defaultValue="" onChange={(e) => handlePrefChange("address", e.target.value)}>
                  <MenuItem value="everyone">{Locale.label("settings.visibilityPrefSettingsEdit.everyone")}</MenuItem>
                  <MenuItem value="members">{Locale.label("settings.visibilityPrefSettingsEdit.members")}</MenuItem>
                  <MenuItem value="groups">{Locale.label("settings.visibilityPrefSettingsEdit.groups")}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="phone">{Locale.label("settings.visibilityPrefSettingsEdit.phoneNum")}</InputLabel>
                <Select fullWidth labelId="phone" label={Locale.label("settings.visibilityPrefSettingsEdit.phoneNum")} name="phoneNumber" value={pref.phoneNumber} defaultValue="" onChange={(e) => handlePrefChange("phoneNumber", e.target.value)}>
                  <MenuItem value="everyone">{Locale.label("settings.visibilityPrefSettingsEdit.everyone")}</MenuItem>
                  <MenuItem value="members">{Locale.label("settings.visibilityPrefSettingsEdit.members")}</MenuItem>
                  <MenuItem value="groups">{Locale.label("settings.visibilityPrefSettingsEdit.groups")}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel id="email">{Locale.label("settings.visibilityPrefSettingsEdit.email")}</InputLabel>
                <Select fullWidth labelId="email" label={Locale.label("settings.visibilityPrefSettingsEdit.email")} name="email" value={pref.email} defaultValue="" onChange={(e) => handlePrefChange("email", e.target.value)}>
                  <MenuItem value="everyone">{Locale.label("settings.visibilityPrefSettingsEdit.everyone")}</MenuItem>
                  <MenuItem value="members">{Locale.label("settings.visibilityPrefSettingsEdit.members")}</MenuItem>
                  <MenuItem value="groups">{Locale.label("settings.visibilityPrefSettingsEdit.groups")}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? Locale.label("common.saving") : Locale.label("common.save")}
          </Button>
        </Box>
      </Box>
    </>
  );
};
