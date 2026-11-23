import React from "react";
import { Alert, Snackbar, TextField, Typography } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import type { GenericSettingInterface } from "@churchapps/helpers";
import { FormCard } from "../components/ui";

const KEY = "checkinAnnouncement";
const MAX_LENGTH = 500;

// One church-wide message the kiosk shows with an OK button before the household screen. Blank turns it off.
export const CheckinAnnouncementEdit: React.FC = () => {
  const [text, setText] = React.useState("");
  const [setting, setSetting] = React.useState<GenericSettingInterface | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [showSaved, setShowSaved] = React.useState(false);
  const [error, setError] = React.useState("");
  const [loaded, setLoaded] = React.useState(false);

  const loadData = React.useCallback(async () => {
    const allSettings: GenericSettingInterface[] = await ApiHelper.get("/settings", "MembershipApi");
    const found = allSettings.find((s) => s.keyName === KEY) || null;
    setSetting(found);
    setText(found?.value || "");
    setLoaded(true);
  }, []);

  React.useEffect(() => { loadData(); }, [loadData]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Private: the kiosk reads it through /attendance/checkin/settings, not the public settings.
      const s: GenericSettingInterface = setting || { keyName: KEY, public: 0 };
      s.value = text.trim();
      await ApiHelper.post("/settings", [s], "MembershipApi");
      setError("");
      setShowSaved(true);
      await loadData();
    } catch (e) {
      setError((e instanceof Error ? e.message : "") || Locale.label("common.saveError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormCard title={Locale.label("mobile.checkInPage.announcement.title")} icon="campaign" onSave={handleSave} isSubmitting={saving} saveTestId="checkin-announcement-save" data-testid="checkin-announcement">
      {error && <Alert severity="error">{error}</Alert>}
      <Typography variant="body2" color="text.secondary">{Locale.label("mobile.checkInPage.announcement.help")}</Typography>
      {loaded && (<TextField
        label={Locale.label("mobile.checkInPage.announcement.label")}
        value={text}
        onChange={(e) => setText(e.target.value)}
        multiline
        minRows={3}
        fullWidth
        slotProps={{ htmlInput: { maxLength: MAX_LENGTH, "data-testid": "checkin-announcement-input" } }}
        helperText={`${text.length}/${MAX_LENGTH}`}
      />)}
      <Snackbar open={showSaved} autoHideDuration={3000} onClose={() => setShowSaved(false)} message={Locale.label("common.saved")} anchorOrigin={{ vertical: "bottom", horizontal: "center" }} />
    </FormCard>
  );
};
