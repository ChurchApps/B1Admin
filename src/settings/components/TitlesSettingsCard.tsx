import React from "react";
import type { GenericSettingInterface } from "@churchapps/helpers";
import { Locale } from "@churchapps/apphelper";
import { Alert, Button, Chip, Stack, TextField, Typography } from "@mui/material";
import { Badge as BadgeIcon } from "@mui/icons-material";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiHelper, UserHelper } from "../../helpers";
import { parseTitleOptions, TITLE_MAX_LENGTH, TITLE_OPTIONS_KEY } from "../../helpers/PersonConstants";
import { FormCard } from "../../components/ui";

// The church's own list of titles offered in every Title box (stored as the public titleOptions setting).
export const TitlesSettingsCard: React.FC = () => {
  const queryClient = useQueryClient();
  const churchId = UserHelper.currentUserChurch?.church?.id || "";
  const settings = useQuery<GenericSettingInterface[]>({ queryKey: ["/settings", "MembershipApi"], placeholderData: [] });
  const setting = (settings.data || []).find((s) => s.keyName === TITLE_OPTIONS_KEY);

  const [titles, setTitles] = React.useState<string[]>(() => parseTitleOptions(setting?.value));
  const [newTitle, setNewTitle] = React.useState("");
  const [error, setError] = React.useState("");
  const [saved, setSaved] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => { setTitles(parseTitleOptions(setting?.value)); }, [setting?.value]);

  const handleAdd = () => {
    const title = newTitle.trim().slice(0, TITLE_MAX_LENGTH);
    if (!title) return;
    if (titles.some((t) => t.toLowerCase() === title.toLowerCase())) {
      setError(Locale.label("settings.titles.duplicate"));
      return;
    }
    setTitles([...titles, title]);
    setNewTitle("");
    setError("");
    setSaved(false);
  };

  const handleRemove = (title: string) => {
    setTitles(titles.filter((t) => t !== title));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const s: GenericSettingInterface = { ...(setting || { churchId, public: 1, keyName: TITLE_OPTIONS_KEY }), value: JSON.stringify(titles) };
      await ApiHelper.post("/settings", [s], "MembershipApi");
      await queryClient.invalidateQueries({ queryKey: ["/settings", "MembershipApi"] });
      await queryClient.invalidateQueries({ queryKey: ["/settings/public/" + churchId, "MembershipApi"] });
      setSaved(true);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormCard
      data-testid="titles-card"
      icon={<BadgeIcon />}
      title={Locale.label("settings.titles.titles")}
      onSave={handleSave}
      isSubmitting={saving}
      saveText={Locale.label("settings.titles.save")}
      saveTestId="save-titles-button">
      <Typography variant="body2" color="text.secondary">{Locale.label("settings.titles.description")}</Typography>
      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1}>
        {titles.map((t) => <Chip key={t} label={t} onDelete={() => handleRemove(t)} data-testid={`title-chip-${t}`} />)}
      </Stack>
      <Stack direction="row" spacing={1} alignItems="flex-start">
        <TextField
          size="small"
          label={Locale.label("settings.titles.newTitle")}
          helperText={Locale.label("settings.titles.helper")}
          value={newTitle}
          onChange={(e) => { setNewTitle(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
          inputProps={{ maxLength: TITLE_MAX_LENGTH, "data-testid": "new-title-input" }} />
        <Button variant="outlined" onClick={handleAdd} data-testid="add-title-button">{Locale.label("settings.titles.addTitle")}</Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success" data-testid="titles-saved">{Locale.label("settings.titles.saved")}</Alert>}
    </FormCard>
  );
};
