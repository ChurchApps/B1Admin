import React from "react";
import { Box, FormControl, Grid, Icon, InputLabel, MenuItem, Select, Stack, Tooltip, Typography } from "@mui/material";
import { type GenericSettingInterface, type GroupInterface } from "@churchapps/helpers";
import { ApiHelper, Locale, UniqueIdHelper } from "@churchapps/apphelper";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
}

export const DirectoryApproveSettingsEdit: React.FC<Props> = (props) => {
  const [groups, setGroups] = React.useState<GroupInterface[]>(null);
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>("");
  const [setting, setSetting] = React.useState<GenericSettingInterface>(null);
  const [directoryVisibility, setDirectoryVisibility] = React.useState<string>("Members");
  const [visibilitySetting, setVisibilitySetting] = React.useState<GenericSettingInterface>(null);

  const save = () => {
    const approvalSetting: GenericSettingInterface = setting === null ? { churchId: props.churchId, public: 1, keyName: "directoryApprovalGroupId" } : setting;
    approvalSetting.value = selectedGroupId;

    const visibilitySett: GenericSettingInterface = visibilitySetting === null ? { churchId: props.churchId, public: 1, keyName: "directoryVisibility" } : visibilitySetting;
    visibilitySett.value = directoryVisibility;

    ApiHelper.post("/settings", [approvalSetting, visibilitySett], "MembershipApi");
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const getFields = () => {
    const result: JSX.Element[] = [];
    groups.forEach((g) => {
      result.push(<MenuItem value={g.id}>{g.name}</MenuItem>);
    });
    return result;
  };

  const loadData = async () => {
    const groups = await ApiHelper.get("/groups/tag/standard", "MembershipApi");
    setGroups(groups);
    const publicSettings = await ApiHelper.get("/settings", "MembershipApi");

    const approvalGroupSetting = publicSettings.filter((d: GenericSettingInterface) => d.keyName === "directoryApprovalGroupId");
    if (approvalGroupSetting.length > 0) {
      setSetting(approvalGroupSetting[0]);
      setSelectedGroupId(approvalGroupSetting[0].value);
    }

    const directorySetting = publicSettings.filter((d: GenericSettingInterface) => d.keyName === "directoryVisibility");
    if (directorySetting.length > 0) {
      setVisibilitySetting(directorySetting[0]);
      setDirectoryVisibility(directorySetting[0].value || "Members");
    }
  };

  React.useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);
  React.useEffect(checkSave, [props.saveTrigger]);

  return (
    <Box sx={{ mb: 2.5, pb: 2.5, borderBottom: "1px solid", borderColor: "divider" }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("settings.directoryApprovalSettingsEdit.directoryApprovalGroup")}</Typography>
        <Tooltip title={Locale.label("settings.directoryApprovalSettingsEdit.forceMsg")} arrow>
          <Icon fontSize="small" sx={{ cursor: "pointer", color: "text.disabled", ml: 0.5 }}>
            help_outline
          </Icon>
        </Tooltip>
      </Stack>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <FormControl fullWidth size="small">
            <InputLabel id="groups">{Locale.label("settings.directoryApprovalSettingsEdit.groups")}</InputLabel>
            <Select labelId="groups" name="groups" label={Locale.label("settings.directoryApprovalSettingsEdit.groups")} value={selectedGroupId} onChange={(e) => setSelectedGroupId(e.target.value)}>
              <MenuItem value="">{Locale.label("settings.directoryApprovalSettingsEdit.none")}</MenuItem>
              {groups?.length > 0 ? (
                getFields()
              ) : (
                <MenuItem value="" disabled>
                  {Locale.label("settings.directoryApprovalSettingsEdit.noGroups")}
                </MenuItem>
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
    </Box>
  );
};
