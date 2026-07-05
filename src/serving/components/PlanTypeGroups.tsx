import React from "react";
import { Box, Button, Typography, Stack, Paper, Table, TableBody, TableCell, TableRow, TableHead, Select, MenuItem, Autocomplete, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from "@mui/material";
import { Add as AddIcon, Groups as GroupsIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { ApiHelper, Locale, Loading } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { useQuery } from "@tanstack/react-query";
import { type GroupInterface } from "@churchapps/helpers";
import { type AssociatedGroupInterface, hasPlansEditAccess } from "../../helpers";
import { CountChip, EmptyState } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";

interface Props {
  planTypeId: string;
  ministryId?: string;
}

type TimeFilter = "past" | "future" | "both";
const CONTENT_TYPE = "planType";

export const PlanTypeGroups = React.memo(({ planTypeId, ministryId }: Props) => {
  const hasPlansEdit = hasPlansEditAccess();

  const myMinistriesQuery = useQuery<GroupInterface[]>({
    queryKey: ["/groups/my/ministry", "MembershipApi"],
    enabled: !hasPlansEdit && !!ministryId,
    placeholderData: []
  });

  const isMinistryMember = !hasPlansEdit && !!ministryId && (myMinistriesQuery.data || []).some((g) => g.id === ministryId);
  const canEdit = hasPlansEdit || isMinistryMember;
  const [showPicker, setShowPicker] = React.useState(false);
  const [pickerValue, setPickerValue] = React.useState<GroupInterface | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const associations = useQuery<AssociatedGroupInterface[]>({
    queryKey: [`/associatedGroups/content/${CONTENT_TYPE}/${planTypeId}`, "MembershipApi"],
    enabled: !!planTypeId,
    placeholderData: []
  });

  const groups = useQuery<GroupInterface[]>({
    queryKey: ["/groups/tag/standard", "MembershipApi"],
    placeholderData: []
  });

  const groupById = React.useMemo(() => {
    const map = new Map<string, GroupInterface>();
    (groups.data || []).forEach((g) => { if (g.id) map.set(g.id, g); });
    return map;
  }, [groups.data]);

  const associationsList = associations.data || [];

  const availableGroups = React.useMemo(() => {
    const taken = new Set(associationsList.map((a) => a.groupId));
    return (groups.data || []).filter((g) => g.id && !taken.has(g.id));
  }, [groups.data, associationsList]);

  const handleAdd = React.useCallback(async () => {
    if (!pickerValue?.id) return;
    const item: AssociatedGroupInterface = { contentType: CONTENT_TYPE, contentId: planTypeId, groupId: pickerValue.id, settings: "both" };
    await ApiHelper.post("/associatedGroups", [item], "MembershipApi");
    setPickerValue(null);
    setShowPicker(false);
    associations.refetch();
  }, [pickerValue, planTypeId, associations]);

  const handleTimeFilterChange = React.useCallback(async (assoc: AssociatedGroupInterface, value: TimeFilter) => {
    await ApiHelper.post("/associatedGroups", [{ ...assoc, settings: value }], "MembershipApi");
    associations.refetch();
  }, [associations]);

  const handleRemove = React.useCallback(async (assoc: AssociatedGroupInterface) => {
    if (!assoc.id) return;
    if (!(await confirm(Locale.label("plans.planTypeGroups.removeConfirm")))) return;
    await ApiHelper.delete("/associatedGroups/" + assoc.id, "MembershipApi");
    associations.refetch();
  }, [associations, confirm]);

  if (associations.isLoading || groups.isLoading) return <Loading />;

  const renderRow = (assoc: AssociatedGroupInterface) => {
    const group = assoc.groupId ? groupById.get(assoc.groupId) : null;
    const filter = (assoc.settings as TimeFilter) || "both";
    return (
      <TableRow key={assoc.id} hover sx={{ "&:last-child td": { border: 0 } }}>
        <TableCell>
          <Typography sx={{ fontWeight: 500 }}>{group?.name || assoc.groupId}</Typography>
          {group?.categoryName && (
            <Typography variant="body2" color="text.secondary">{group.categoryName}</Typography>
          )}
        </TableCell>
        <TableCell sx={{ width: 200 }}>
          {canEdit ? (
            <Select
              size="small"
              value={filter}
              onChange={(e) => handleTimeFilterChange(assoc, e.target.value as TimeFilter)}
              fullWidth
            >
              <MenuItem value="past">{Locale.label("plans.planTypeGroups.timeFilter.past")}</MenuItem>
              <MenuItem value="future">{Locale.label("plans.planTypeGroups.timeFilter.future")}</MenuItem>
              <MenuItem value="both">{Locale.label("plans.planTypeGroups.timeFilter.both")}</MenuItem>
            </Select>
          ) : (
            <Typography variant="body2">{Locale.label(`plans.planTypeGroups.timeFilter.${filter}`)}</Typography>
          )}
        </TableCell>
        {canEdit && (
          <TableCell align="right" className="rowActions">
            <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} intent="remove" onClick={() => handleRemove(assoc)} />
          </TableCell>
        )}
      </TableRow>
    );
  };

  return (
    <Box>
      {ConfirmDialogElement}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <GroupsIcon sx={{ color: "primary.main", fontSize: 20 }} />
          <Typography variant="h6">
            {Locale.label("plans.planTypeGroups.heading")}
          </Typography>
          {associationsList.length > 0 && <CountChip count={associationsList.length} />}
        </Stack>
        {canEdit && associationsList.length > 0 && availableGroups.length > 0 && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowPicker(true)} size="small">
            {Locale.label("plans.planTypeGroups.addGroup")}
          </Button>
        )}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {Locale.label("plans.planTypeGroups.description")}
      </Typography>

      {associationsList.length === 0 ? (
        <EmptyState
          icon={<GroupsIcon />}
          title={Locale.label("plans.planTypeGroups.noGroups")}
          description={Locale.label("plans.planTypeGroups.noGroupsDescription")}
          action={canEdit && availableGroups.length > 0 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setShowPicker(true)}>
              {Locale.label("plans.planTypeGroups.addGroup")}
            </Button>
          )}
        />
      ) : (
        <Paper sx={{ width: "100%", overflow: "hidden" }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>{Locale.label("common.name")}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>{Locale.label("plans.planTypeGroups.showsLabel")}</TableCell>
                {canEdit && <TableCell align="right" sx={{ width: 50 }} />}
              </TableRow>
            </TableHead>
            <TableBody>
              {associationsList.map(renderRow)}
            </TableBody>
          </Table>
        </Paper>
      )}

      <Dialog open={showPicker} onClose={() => { setShowPicker(false); setPickerValue(null); }} maxWidth="sm" fullWidth>
        <DialogTitle>{Locale.label("plans.planTypeGroups.addGroup")}</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <Autocomplete
              options={availableGroups}
              value={pickerValue}
              onChange={(_, v) => setPickerValue(v)}
              getOptionLabel={(g) => g.name || ""}
              isOptionEqualToValue={(o, v) => o.id === v.id}
              renderInput={(params) => (
                <TextField {...params} label={Locale.label("plans.planTypeGroups.selectGroup")} fullWidth />
              )}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setShowPicker(false); setPickerValue(null); }}>
            {Locale.label("common.cancel")}
          </Button>
          <Button onClick={handleAdd} variant="contained" disabled={!pickerValue}>
            {Locale.label("common.add")}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
});
