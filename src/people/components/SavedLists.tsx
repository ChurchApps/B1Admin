import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { Delete as DeleteIcon, Settings as SettingsIcon, Lock as LockIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { FilterChip } from "../../components/ui";
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
  onClear: () => void;
  selectedId?: string;
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
    if (deleteTarget.id === props.selectedId) props.onClear();
    setDeleteTarget(null);
    invalidate();
  };

  const handleSaveSettings = async () => {
    if (!settingsTarget || !settingsTarget.name?.trim()) return;
    await ApiHelper.post("/lists", [{ ...settingsTarget, name: settingsTarget.name.trim() }], "MembershipApi");
    setSettingsTarget(null);
    invalidate();
  };

  const { grouped, categories } = useMemo(() => {
    const grouped = lists.reduce<Record<string, ListInterface[]>>((acc, list) => {
      const key = list.category?.trim() || "";
      (acc[key] ||= []).push(list);
      return acc;
    }, {});
    const categories = Object.keys(grouped).sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));
    return { grouped, categories };
  }, [lists]);

  return (
    <>
      {lists.length > 0 && (
        <Stack direction="row" useFlexGap flexWrap="wrap" alignItems="center" spacing={1} role="group" aria-label={Locale.label("people.directory.savedLists")}>
          <FilterChip selected={!props.selectedId} onClick={props.onClear} data-testid="saved-list-everyone">
            {Locale.label("people.directory.everyone")}
          </FilterChip>
          {categories.flatMap((category) => [
            category ? <Typography key={"cat-" + category} variant="caption" color="text.secondary" sx={{ fontWeight: 600, ml: 1 }}>{category}</Typography> : null,
            ...grouped[category].map((list) => (
              <Stack key={list.id} direction="row" alignItems="center" spacing={0.5} data-testid="saved-list-row">
                <FilterChip selected={props.selectedId === list.id} onClick={() => props.onSelect(list)}>
                  <Stack direction="row" alignItems="center" spacing={0.5} component="span">
                    <span>{list.name}</span>
                    {list.scope === "private" && <LockIcon sx={{ fontSize: 14, color: "text.secondary" }} />}
                  </Stack>
                </FilterChip>
                {props.canManage && props.selectedId === list.id && (
                  <>
                    <AppIconButton label={Locale.label("people.lists.settings")} icon={<SettingsIcon />} onClick={() => setSettingsTarget({ ...list })} />
                    <AppIconButton intent="remove" label={Locale.label("common.delete")} icon={<DeleteIcon />} onClick={() => setDeleteTarget(list)} />
                  </>
                )}
              </Stack>
            ))
          ])}
        </Stack>
      )}

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
    </>
  );
};
