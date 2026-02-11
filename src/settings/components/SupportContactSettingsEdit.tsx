import React, { useEffect, useState } from "react";
import { Box, Icon, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { type GenericSettingInterface, UniqueIdHelper, ApiHelper, Locale } from "@churchapps/apphelper";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
}

export const SupportContactSettingsEdit: React.FC<Props> = (props) => {
  const [value, setValue] = useState<string>("");
  const [setting, setSetting] = useState<GenericSettingInterface>(null);

  const save = () => {
    const s: GenericSettingInterface = setting === null ? { churchId: props.churchId, public: 1, keyName: "supportContact" } : setting;
    s.value = value;
    ApiHelper.post("/settings", [s], "MembershipApi");
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const loadData = async () => {
    const publicSettings = await ApiHelper.get("/settings", "MembershipApi");
    const contactSetting = publicSettings.filter((c: GenericSettingInterface) => c.keyName === "supportContact");
    if (contactSetting.length > 0) {
      setSetting(contactSetting[0]);
      setValue(contactSetting[0].value);
    }
  };

  useEffect(() => {
    if (!UniqueIdHelper.isMissing(props.churchId)) loadData();
  }, [props.churchId]);
  useEffect(checkSave, [props.saveTrigger]);

  return (
    <Box sx={{ mb: 2.5, pb: 2.5, borderBottom: "1px solid", borderColor: "divider", "&:last-child": { borderBottom: "none", mb: 0, pb: 0 } }}>
      <Stack direction="row" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("settings.supportContactSettingsEdit.supportContact")}</Typography>
        <Tooltip arrow title={Locale.label("settings.supportContactSettingsEdit.forceMsg")}>
          <Icon fontSize="small" sx={{ cursor: "pointer", color: "text.disabled", ml: 0.5 }}>
            help_outline
          </Icon>
        </Tooltip>
      </Stack>
      <TextField
        fullWidth
        size="small"
        name="supportContact"
        label={Locale.label("settings.supportContactSettingsEdit.link")}
        value={value || ""}
        onChange={(e) => {
          e.preventDefault();
          setValue(e.target.value);
        }}
        helperText={Locale.label("settings.supportContactSettingsEdit.linkHelperText")}
      />
    </Box>
  );
};
