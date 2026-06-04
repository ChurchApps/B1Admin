import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiHelper, DisplayBox, Locale } from "@churchapps/apphelper";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { PlaylistPlay as ListIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { type SearchCondition } from "@churchapps/helpers";
import { type ActiveFilter } from "./AdvancedPeopleSearch";

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
}

interface Props {
  // Loads the selected list's saved query; the search then re-runs live.
  onSelect: (conditions: ListConditions) => void;
  canManage: boolean;
}

export const SavedLists = (props: Props) => {
  const queryClient = useQueryClient();
  const { data: lists = [] } = useQuery<ListInterface[]>({ queryKey: ["/lists", "MembershipApi"], placeholderData: [] });
  const [deleteTarget, setDeleteTarget] = useState<ListInterface | null>(null);
  const [renameTarget, setRenameTarget] = useState<ListInterface | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["/lists", "MembershipApi"] });

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    await ApiHelper.delete("/lists/" + deleteTarget.id, "MembershipApi");
    setDeleteTarget(null);
    invalidate();
  };

  const handleRename = async () => {
    if (!renameTarget || !renameValue.trim()) return;
    await ApiHelper.post("/lists", [{ ...renameTarget, name: renameValue.trim() }], "MembershipApi");
    setRenameTarget(null);
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
                <Stack key={list.id} direction="row" alignItems="center" spacing={0.5}>
                  <Button
                    fullWidth
                    onClick={() => props.onSelect(list.conditions || {})}
                    startIcon={<ListIcon fontSize="small" />}
                    sx={{ justifyContent: "flex-start", textTransform: "none", textAlign: "left", flex: 1, minWidth: 0 }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{list.name}</Typography>
                      {list.createdByPersonName && (
                        <Typography variant="caption" color="text.secondary" noWrap sx={{ display: "block" }}>
                          {Locale.label("people.lists.createdBy").replace("{name}", list.createdByPersonName)}
                        </Typography>
                      )}
                    </Box>
                  </Button>
                  {props.canManage && (
                    <>
                      <Tooltip title={Locale.label("people.lists.rename")}>
                        <IconButton size="small" onClick={() => { setRenameTarget(list); setRenameValue(list.name || ""); }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={Locale.label("people.lists.delete")}>
                        <IconButton size="small" onClick={() => setDeleteTarget(list)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
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

      <Dialog open={!!renameTarget} onClose={() => setRenameTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>{Locale.label("people.lists.rename")}</DialogTitle>
        <DialogContent>
          <TextField fullWidth autoFocus sx={{ mt: 1 }} label={Locale.label("people.lists.name")} value={renameValue} onChange={(e) => setRenameValue(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameTarget(null)}>{Locale.label("common.cancel")}</Button>
          <Button onClick={handleRename} variant="contained" disabled={!renameValue.trim()}>{Locale.label("common.save")}</Button>
        </DialogActions>
      </Dialog>
    </DisplayBox>
  );
};
