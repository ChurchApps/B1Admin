import React, { useState, useEffect, useMemo } from "react";
import { TextField, FormControlLabel, Checkbox, Box, Typography, Stack, Button, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import type { ApiKeyInterface } from "./DeveloperSection";

interface Props {
  onSave: () => void;
  onCancel: () => void;
}

export const ApiKeyEdit: React.FC<Props> = ({ onSave, onCancel }) => {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [catalog, setCatalog] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    ApiHelper.get("/apiKeys/scopes", "MembershipApi").then((d: { scopes?: string[] }) => setCatalog(d?.scopes || []));
  }, []);

  const toggleScope = (scope: string) => {
    setScopes((prev) => (prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]));
  };

  // Group scopes by their resource prefix ("people:read" → "people") so the
  // catalog reads as labelled sections instead of one long checkbox run.
  const groupedCatalog = useMemo(() => {
    const groups = new Map<string, string[]>();
    catalog.forEach((scope) => {
      const resource = scope.includes(":") ? scope.split(":")[0] : Locale.label("settings.apiKeyEdit.generalScopes");
      const list = groups.get(resource) || [];
      list.push(scope);
      groups.set(resource, list);
    });
    return Array.from(groups.entries());
  }, [catalog]);

  const validate = () => {
    const errs: string[] = [];
    if (!name.trim()) errs.push(Locale.label("settings.apiKeyEdit.nameRequired"));
    if (scopes.length === 0) errs.push(Locale.label("settings.apiKeyEdit.scopesRequired"));
    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload = { name, scopes, expiresAt: expiresAt || undefined };
    const saved: ApiKeyInterface = await ApiHelper.post("/apiKeys", payload, "MembershipApi");
    // The raw key is returned exactly once — show it before returning to the list.
    if (saved?.key) setRawKey(saved.key);
    else onSave();
  };

  const copyKey = () => {
    if (rawKey) navigator.clipboard?.writeText(rawKey);
    setCopied(true);
  };

  const closeKey = () => {
    setRawKey(null);
    setCopied(false);
    onSave();
  };

  return (
    <>
      <FormCard icon="key" title={Locale.label("settings.apiKeyEdit.newKey")} onSave={handleSave} onCancel={onCancel}>
        <ErrorMessages errors={errors} />
        <TextField fullWidth label={Locale.label("settings.apiKeyEdit.name")} placeholder={Locale.label("settings.apiKeyEdit.namePlaceholder")} value={name} onChange={(e) => setName(e.target.value)} />
        <TextField fullWidth type="date" label={Locale.label("settings.apiKeyEdit.expires")} InputLabelProps={{ shrink: true }} value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} helperText={Locale.label("settings.apiKeyEdit.expiresHelp")} />
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>{Locale.label("settings.apiKeyEdit.scopes")}</Typography>
          <Stack spacing={1.5}>
            {groupedCatalog.map(([resource, items]) => (
              <Box key={resource}>
                <Typography variant="caption" sx={{ display: "block", fontWeight: 700, textTransform: "capitalize", color: "text.secondary", mb: 0.25 }}>{resource}</Typography>
                <Stack direction="row" flexWrap="wrap" sx={{ gap: 0.5 }}>
                  {items.map((scope) => (
                    <FormControlLabel key={scope} sx={{ mr: 0 }} control={<Checkbox size="small" checked={scopes.includes(scope)} onChange={() => toggleScope(scope)} />} label={scope} />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>
        </Box>
      </FormCard>

      <Dialog open={!!rawKey} onClose={closeKey} maxWidth="sm" fullWidth>
        <DialogTitle>{Locale.label("settings.apiKeyEdit.keyTitle")}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1 }}>{Locale.label("settings.apiKeyEdit.keyIntro")}</Typography>
          <TextField fullWidth value={rawKey || ""} InputProps={{ readOnly: true }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={copyKey}>{copied ? Locale.label("settings.apiKeyEdit.copied") : Locale.label("settings.apiKeyEdit.copy")}</Button>
          <Button variant="contained" onClick={closeKey}>{Locale.label("settings.apiKeyEdit.close")}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
