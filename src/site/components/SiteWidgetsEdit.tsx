import React, { useEffect, useState } from "react";
import { Box, Button, Card, Checkbox, FormControl, FormControlLabel, Grid, Icon, IconButton, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import type { GenericSettingInterface } from "@churchapps/helpers";
import type { GlobalStyleInterface } from "../../helpers/Interfaces";
import { ColorPicker } from "../admin/ColorPicker";
import { IconPicker } from "../../components/iconPicker/IconPicker";

interface BannerData { text?: string; linkUrl?: string; linkText?: string; backgroundColor?: string; textColor?: string; startDate?: string; endDate?: string; }
interface LauncherAction { label?: string; url?: string; icon?: string; }
interface LauncherData { actions?: LauncherAction[]; position?: string; color?: string; }

export const SiteWidgetsEdit: React.FC = () => {
  const [globalStyles, setGlobalStyles] = useState<GlobalStyleInterface | null>(null);
  const [settings, setSettings] = useState<GenericSettingInterface[]>([]);
  const [bannerEnabled, setBannerEnabled] = useState(false);
  const [banner, setBanner] = useState<BannerData>({});
  const [launcherEnabled, setLauncherEnabled] = useState(false);
  const [launcher, setLauncher] = useState<LauncherData>({ actions: [], position: "bottomRight" });
  const [iconPickerIndex, setIconPickerIndex] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  const loadData = () => {
    ApiHelper.get("/globalStyles", "ContentApi").then((gs: GlobalStyleInterface) => setGlobalStyles(gs));
    ApiHelper.get("/settings", "ContentApi").then((data: GenericSettingInterface[]) => {
      setSettings(data || []);
      const bannerSetting = (data || []).find((d) => d.keyName === "announcementBanner");
      if (bannerSetting?.value) {
        try { setBanner(JSON.parse(bannerSetting.value)); setBannerEnabled(true); } catch { /* ignore malformed */ }
      }
      const launcherSetting = (data || []).find((d) => d.keyName === "launcher");
      if (launcherSetting?.value) {
        try { const l = JSON.parse(launcherSetting.value); setLauncher({ actions: l.actions || [], position: l.position || "bottomRight", color: l.color }); setLauncherEnabled(true); } catch { /* ignore malformed */ }
      }
    });
  };

  useEffect(loadData, []);

  const buildSetting = (keyName: string, value: string): GenericSettingInterface => {
    const existing = settings.find((s) => s.keyName === keyName);
    return existing ? { ...existing, value } : { keyName, value, public: 1 } as GenericSettingInterface;
  };

  const handleSave = () => {
    const bannerValue = bannerEnabled ? JSON.stringify(banner) : "";
    const launcherValue = launcherEnabled ? JSON.stringify({ actions: (launcher.actions || []).filter((a) => a.label || a.url), position: launcher.position || "bottomRight", color: launcher.color }) : "";
    const toSave = [buildSetting("announcementBanner", bannerValue), buildSetting("launcher", launcherValue)];
    ApiHelper.post("/settings", toSave, "ContentApi").then((data: GenericSettingInterface[]) => {
      setSettings((prev) => {
        const next = [...prev];
        (data || []).forEach((d) => {
          const idx = next.findIndex((s) => s.keyName === d.keyName);
          if (idx >= 0) next[idx] = d; else next.push(d);
        });
        return next;
      });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    });
  };

  const updateBanner = (field: keyof BannerData, value: string) => setBanner((b) => ({ ...b, [field]: value }));

  const updateAction = (index: number, field: keyof LauncherAction, value: string) => {
    setLauncher((l) => {
      const actions = [...(l.actions || [])];
      actions[index] = { ...actions[index], [field]: value };
      return { ...l, actions };
    });
  };

  const addAction = () => setLauncher((l) => ({ ...l, actions: [...(l.actions || []), {}] }));
  const removeAction = (index: number) => setLauncher((l) => ({ ...l, actions: (l.actions || []).filter((_, i) => i !== index) }));

  const canAddAction = (launcher.actions || []).length < 5;

  return (
    <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200", mb: 3 }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Icon sx={{ color: "primary.main", fontSize: 20 }}>widgets</Icon>
          <Typography variant="h6">{Locale.label("site.siteWidgets.title")}</Typography>
        </Stack>
      </Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{Locale.label("site.siteWidgets.announcementBar")}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("site.siteWidgets.announcementDesc")}</Typography>
        <FormControlLabel control={<Checkbox checked={bannerEnabled} onChange={(e) => setBannerEnabled(e.target.checked)} data-testid="banner-enabled-checkbox" />} label={Locale.label("site.siteWidgets.enabled")} />
        {bannerEnabled && (
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth size="small" label={Locale.label("site.siteWidgets.text")} value={banner.text || ""} onChange={(e) => updateBanner("text", e.target.value)} data-testid="banner-text-input" />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth size="small" label={Locale.label("site.siteWidgets.linkUrl")} value={banner.linkUrl || ""} onChange={(e) => updateBanner("linkUrl", e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth size="small" label={Locale.label("site.siteWidgets.linkText")} value={banner.linkText || ""} onChange={(e) => updateBanner("linkText", e.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <InputLabel sx={{ fontSize: "0.85rem" }}>{Locale.label("site.siteWidgets.backgroundColor")}</InputLabel>
              <ColorPicker color={banner.backgroundColor || "#1565c0"} updatedCallback={(c) => updateBanner("backgroundColor", c)} globalStyles={globalStyles as GlobalStyleInterface} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <InputLabel sx={{ fontSize: "0.85rem" }}>{Locale.label("site.siteWidgets.textColor")}</InputLabel>
              <ColorPicker color={banner.textColor || "#ffffff"} updatedCallback={(c) => updateBanner("textColor", c)} globalStyles={globalStyles as GlobalStyleInterface} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth size="small" type="date" label={Locale.label("site.siteWidgets.startDate")} value={banner.startDate || ""} onChange={(e) => updateBanner("startDate", e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth size="small" type="date" label={Locale.label("site.siteWidgets.endDate")} value={banner.endDate || ""} onChange={(e) => updateBanner("endDate", e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
          </Grid>
        )}

        <Box sx={{ borderTop: "1px solid var(--border-light)", mt: 2, pt: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>{Locale.label("site.siteWidgets.launcher")}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("site.siteWidgets.launcherDesc")}</Typography>
          <FormControlLabel control={<Checkbox checked={launcherEnabled} onChange={(e) => setLauncherEnabled(e.target.checked)} data-testid="launcher-enabled-checkbox" />} label={Locale.label("site.siteWidgets.enabled")} />
          {launcherEnabled && (
            <>
              {(launcher.actions || []).map((action, index) => (
                <Grid container spacing={1} key={index} sx={{ mt: 0.5 }} alignItems="center">
                  <Grid size={{ xs: 4 }}>
                    <TextField fullWidth size="small" label={Locale.label("site.siteWidgets.label")} value={action.label || ""} onChange={(e) => updateAction(index, "label", e.target.value)} data-testid={`launcher-label-${index}`} />
                  </Grid>
                  <Grid size={{ xs: 5 }}>
                    <TextField fullWidth size="small" label={Locale.label("site.siteWidgets.url")} value={action.url || ""} onChange={(e) => updateAction(index, "url", e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: 2 }}>
                    <Button size="small" variant="outlined" startIcon={<Icon>{action.icon || "add"}</Icon>} onClick={() => setIconPickerIndex(index)} fullWidth>{Locale.label("site.siteWidgets.icon")}</Button>
                  </Grid>
                  <Grid size={{ xs: 1 }}>
                    <IconButton size="small" onClick={() => removeAction(index)}><Icon>delete</Icon></IconButton>
                  </Grid>
                </Grid>
              ))}
              {canAddAction && <Button size="small" startIcon={<Icon>add</Icon>} onClick={addAction} sx={{ mt: 1 }} data-testid="launcher-add-action">{Locale.label("site.siteWidgets.addAction")}</Button>}
              <Grid container spacing={2} sx={{ mt: 0.5 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>{Locale.label("site.siteWidgets.position")}</InputLabel>
                    <Select label={Locale.label("site.siteWidgets.position")} value={launcher.position || "bottomRight"} onChange={(e) => setLauncher((l) => ({ ...l, position: e.target.value }))} data-testid="launcher-position-select">
                      <MenuItem value="bottomRight">{Locale.label("site.siteWidgets.bottomRight")}</MenuItem>
                      <MenuItem value="bottomLeft">{Locale.label("site.siteWidgets.bottomLeft")}</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <InputLabel sx={{ fontSize: "0.85rem" }}>{Locale.label("site.siteWidgets.color")}</InputLabel>
                  <ColorPicker color={launcher.color || "#1565c0"} updatedCallback={(c) => setLauncher((l) => ({ ...l, color: c }))} globalStyles={globalStyles as GlobalStyleInterface} />
                </Grid>
              </Grid>
            </>
          )}
        </Box>

        <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 3 }}>
          <Button variant="contained" onClick={handleSave} data-testid="site-widgets-save">{Locale.label("common.save")}</Button>
          {saved && <Typography variant="body2" color="success.main">{Locale.label("site.siteWidgets.saved")}</Typography>}
        </Stack>
      </Box>

      {iconPickerIndex !== null && (
        <IconPicker currentIcon={(launcher.actions || [])[iconPickerIndex]?.icon} onUpdate={(icon) => { updateAction(iconPickerIndex, "icon", icon); }} onClose={() => setIconPickerIndex(null)} />
      )}
    </Card>
  );
};
