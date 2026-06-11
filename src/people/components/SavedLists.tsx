import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiHelper, DisplayBox, Locale } from "@churchapps/apphelper";
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { PlaylistPlay as ListIcon, Delete as DeleteIcon, Settings as SettingsIcon, Lock as LockIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type SearchCondition } from "@churchapps/helpers";
import { type ActiveFilter } from "./AdvancedPeopleSearch";
import { type ListRuleGroup } from "./listRules";

// A saved list stores either the advanced-search filter spec (object, re-resolved live)
// or a flat condition set from simple/AI search (array, server-evaluated each run).
export type ListConditions = Record<string, ActiveFilter> | SearchCondition[];

export interface ListInterface {
  id?: string;
  churchId?: string;
  createdByPersonId?: string;
  createdByPersonName?: string;
  name?: string;
  category?: string;
  conditions?: ListConditions;
  rules?: ListRuleGroup;
  scope?: string;
  autoRefresh?: boolean;
  householdInclusion?: string;
  notifyOnChange?: boolean;
}

interface Props {
  // Loads the selected list's saved query; the search then re-runs live.
  onSelect: (list: ListInterface) => void;
  canManage: boolean;
}

export const SavedLists = (props: Props) => {
  const queryClient = useQueryClient();
  const { data: lists = [] } = useQuery<ListInterface[]>({ queryKey: ["/lists", "MembershipApi"], placeholderData: [] });
  const [deleteTarget, setDeleteTarget] = useState<ListInterface | null>(null);
  const [settingsTarget, setSettingsTarget] = useState<ListInterface | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/lists", "MembershipApi"] });

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await ApiHelper.delete("/lists/" + deleteTarget.id, "MembershipApi");
    setDeleteTarget(null);
    invalidate();
  };

  const handleSaveSettings = async () => {
    if (!settingsTarget || !settingsTarget.name?.trim()) return;
    await ApiHelper.post("/lists", [{ ...settingsTarget, name: settingsTarget.name.trim() }], "MembershipApi");
    setSettingsTarget(null);
    invalidate();
  };

  // Group lists by category for a tidy picker (uncategorized last).
  const { grouped, categories } = useMemo(() => {
    const grouped = lists.reduce<Record<string, ListInterface[]>>((acc, list) => {
      const key = list.category?.trim() || "";
      (acc[key] ||= []).push(list);
      return acc;
    }, {});
    const categories = Object.keys(grouped).sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
    return { grouped, categories };
  }, [lists]);

  if (lists.length === 0) {
    return (
      <DisplayBox headerText={Locale.label("people.lists.title")} headerIcon="playlist_play">
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          {Locale.label("people.lists.empty")}
        </Typography>
      </DisplayBox>
    );
  }

  return (
    <DisplayBox headerText={Locale.label("people.lists.title")} headerIcon="playlist_play">
      <Stack spacing={1.5}>
        {categories.map((category) => (
          <Box key={category || "_uncategorized"}>
            {category && (
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.4 }}>
                {category}
              </Typography>
            )}
            <Stack spacing={0.5} sx={{ mt: category ? 0.5 : 0 }}>
              {grouped[category].map((list) => (
                <Stack key={list.id} direction="row" alignItems="center" spacing={0.5} data-testid="saved-list-row">
                  <Button
                    fullWidth
                    onClick={() => props.onSelect(list)}
                    startIcon={<ListIcon fontSize="small" />}
                    sx={{ justifyContent: "flex-start", textTransform: "none", textAlign: "left", flex: 1, minWidth: 0 }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{list.name}</Typography>
                        {list.scope === "private" && <LockIcon sx={{ fontSize: 14, color: "text.secondary" }} />}
                      </Stack>
                      {list.createdByPersonName && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                          {Locale.label("people.lists.createdBy").replace("{name}", list.createdByPersonName)}
                        </Typography>
                      )}
                    </Box>
                  </Button>
                  {props.canManage && (
                    <>
                      <AppIconButton label={Locale.label("people.lists.settings")} icon={<SettingsIcon />} onClick={() => setSettingsTarget({ ...list })} />
                      <AppIconButton intent="remove" label={Locale.label("common.delete")} icon={<DeleteIcon />} onClick={() => setDeleteTarget(list)} />
                    </>
                  )}
                </Stack>
              ))}
            </Stack>
          </Box>
        ))}
      </Stack>

      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{Locale.label("people.lists.delete")}</DialogTitle>
        <DialogContent>
          <Typography>{Locale.label("people.lists.confirmDelete").replace("{name}", deleteTarget?.name || "")}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>{Locale.label("common.cancel")}</Button>
          <Button onClick={handleDelete} color="error" variant="contained">{Locale.label("common.delete")}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!settingsTarget} onClose={() => setSettingsTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{Locale.label("people.lists.settings")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField fullWidth autoFocus label={Locale.label("people.lists.name")} value={settingsTarget?.name || ""} onChange={(e) => setSettingsTarget((t) => ({ ...t, name: e.target.value }))} />
            <TextField fullWidth label={Locale.label("people.lists.category")} placeholder={Locale.label("people.lists.categoryPlaceholder")} value={settingsTarget?.category || ""} onChange={(e) => setSettingsTarget((t) => ({ ...t, category: e.target.value }))} />
            <FormControl fullWidth size="small">
              <InputLabel>{Locale.label("people.lists.sharing")}</InputLabel>
              <Select label={Locale.label("people.lists.sharing")} value={settingsTarget?.scope || "org"} onChange={(e) => setSettingsTarget((t) => ({ ...t, scope: e.target.value }))} data-testid="list-settings-sharing">
                <MenuItem value="org">{Locale.label("people.lists.sharingOrg")}</MenuItem>
                <MenuItem value="private">{Locale.label("people.lists.sharingPrivate")}</MenuItem>
              </Select>
            </FormControl>
            {settingsTarget?.rules && (
              <FormControl fullWidth size="small">
                <InputLabel>{Locale.label("people.lists.household")}</InputLabel>
                <Select label={Locale.label("people.lists.household")} value={settingsTarget?.householdInclusion || "none"} onChange={(e) => setSettingsTarget((t) => ({ ...t, householdInclusion: e.target.value }))}>
                  <MenuItem value="none">{Locale.label("people.lists.householdNone")}</MenuItem>
                  <MenuItem value="children">{Locale.label("people.lists.householdChildren")}</MenuItem>
                  <MenuItem value="household">{Locale.label("people.lists.householdAll")}</MenuItem>
                </Select>
              </FormControl>
            )}
            {settingsTarget?.rules && (
              <>
                <FormControlLabel
                  control={<Checkbox checked={!!settingsTarget?.autoRefresh} onChange={(e) => setSettingsTarget((t) => ({ ...t, autoRefresh: e.target.checked }))} />}
                  label={Locale.label("people.lists.autoRefresh")}
                />
                {settingsTarget?.autoRefresh && (
                  <FormControlLabel
                    control={<Checkbox checked={!!settingsTarget?.notifyOnChange} onChange={(e) => setSettingsTarget((t) => ({ ...t, notifyOnChange: e.target.checked }))} />}
                    label={Locale.label("people.lists.notifyOnChange")}
                  />
                )}
              </>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsTarget(null)}>{Locale.label("common.cancel")}</Button>
          <Button onClick={handleSaveSettings} variant="contained" disabled={!settingsTarget?.name?.trim()} data-testid="list-settings-save">{Locale.label("common.save")}</Button>
        </DialogActions>
      </Dialog>
    </DisplayBox>
  );
};
