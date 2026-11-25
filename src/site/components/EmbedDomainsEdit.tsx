import React from "react";
import { Alert, Button, Icon, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { ApiHelper, Locale, UserHelper } from "@churchapps/apphelper";
import type { GenericSettingInterface } from "@churchapps/helpers";
import { EMBED_DOMAINS_FIELD_ID } from "../../helpers/embedCode";
import { MAX_EMBED_DOMAINS, parseEmbedDomains } from "../../helpers/embedDomains";
import { clearSiteCache } from "../siteCache";

interface Props {
  setting?: GenericSettingInterface;
  onSaved: (setting: GenericSettingInterface) => void;
}

// The websites allowed to show this church's B1 pages in a frame (public setting embedDomains). Only the
// entries B1App will accept are saved; the rest are listed so the user can see why they had no effect.
export const EmbedDomainsEdit: React.FC<Props> = ({ setting, onSaved }) => {
  const [draft, setDraft] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  const savedValue = parseEmbedDomains(setting?.value).hosts.join("\n");
  const text = draft ?? savedValue;
  const parsed = parseEmbedDomains(text);
  const value = parsed.hosts.join("\n");

  const handleSave = () => {
    setSaving(true);
    const next: GenericSettingInterface = setting ? { ...setting, value } : { keyName: "embedDomains", value, public: 1 };
    ApiHelper.post("/settings", [next], "ContentApi").then((data: GenericSettingInterface[]) => {
      if (data?.[0]) onSaved(data[0]);
      setDraft(null);
      // Per-church setting, so bust the church's own subdomain even while editing a secondary site.
      clearSiteCache(UserHelper.currentUserChurch?.church?.subDomain);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 6000);
    }).finally(() => setSaving(false));
  };

  return (
    <Stack spacing={1} data-testid="embed-domains">
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Typography variant="body2" component="label" htmlFor={EMBED_DOMAINS_FIELD_ID}>{Locale.label("site.embed.domainsLabel")}</Typography>
        <Tooltip title={Locale.label("site.embed.domainsTooltip")} arrow>
          <Icon sx={{ fontSize: 18, cursor: "pointer", color: "text.secondary" }}>info</Icon>
        </Tooltip>
      </Stack>
      <TextField
        id={EMBED_DOMAINS_FIELD_ID}
        multiline
        fullWidth
        size="small"
        minRows={2}
        maxRows={8}
        placeholder={Locale.label("site.embed.domainsPlaceholder")}
        value={text}
        onChange={(e) => { setDraft(e.target.value); setSaved(false); }}
        helperText={Locale.label("site.embed.domainsHelp")}
        slotProps={{ htmlInput: { maxLength: 2000, spellCheck: false, autoCapitalize: "none", autoCorrect: "off", "data-testid": "embed-domains-input" } }}
      />
      {parsed.rejected.length > 0 && (
        <Alert severity="warning" data-testid="embed-domains-rejected">
          {Locale.label("site.embed.rejected")} <strong style={{ overflowWrap: "anywhere" }}>{parsed.rejected.join(", ")}</strong>
        </Alert>
      )}
      {parsed.overLimit.length > 0 && (
        <Alert severity="warning" data-testid="embed-domains-over-limit">
          {Locale.label("site.embed.overLimit").replace("{max}", MAX_EMBED_DOMAINS.toString())} <strong style={{ overflowWrap: "anywhere" }}>{parsed.overLimit.join(", ")}</strong>
        </Alert>
      )}
      <Stack direction="row" spacing={2} alignItems="center">
        <Button size="small" variant="contained" onClick={handleSave} disabled={saving || value === savedValue} data-testid="embed-domains-save">{Locale.label("common.save")}</Button>
        {saved && <Typography variant="body2" color="success.main" data-testid="embed-domains-saved">{Locale.label("site.embed.saved")}</Typography>}
      </Stack>
    </Stack>
  );
};
