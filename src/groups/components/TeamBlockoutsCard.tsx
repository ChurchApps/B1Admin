import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography } from "@mui/material";
import { Delete as DeleteIcon, EventBusy as EventBusyIcon } from "@mui/icons-material";
import { type BlockoutDateInterface, type GroupInterface, type GroupMemberInterface } from "@churchapps/helpers";
import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { CardWithHeader, TextAction } from "../../components/ui";
import { AppDatePicker } from "../../components";
import { hasPlansEditAccess } from "../../helpers";
import { useConfirmDelete } from "../../hooks";
import { loadUpcomingBlockouts } from "../../serving/helpers/blockoutHelper";

interface Props {
  group: GroupInterface;
}

const prettyDay = (d: Date | string | undefined) => DateHelper.prettyDate(DateHelper.toDate(d || 0));

// Staff record block-outs here for volunteers who won't enter their own in the app.
export const TeamBlockoutsCard = (props: Props) => {
  const canEdit = hasPlansEditAccess();
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const [adding, setAdding] = React.useState(false);
  const [personId, setPersonId] = React.useState("");
  const today = DateHelper.formatHtml5Date(new Date());
  const [startDate, setStartDate] = React.useState(today);
  const [endDate, setEndDate] = React.useState(today);
  const [error, setError] = React.useState("");

  const members = useQuery<GroupMemberInterface[]>({ queryKey: [`/groupmembers?groupId=${props.group?.id}`, "MembershipApi"], enabled: !!props.group?.id });
  const blockouts = useQuery<BlockoutDateInterface[]>({ queryKey: ["/blockoutDates/upcoming", "DoingApi"], queryFn: loadUpcomingBlockouts });

  const memberList = React.useMemo(() => [...(members.data || [])].sort((a, b) => (a.person?.name?.display || "").localeCompare(b.person?.name?.display || "")), [members.data]);
  const nameFor = (id?: string) => memberList.find((m) => m.personId === id)?.person?.name?.display || Locale.label("person.unknown");

  const rows = React.useMemo(() => {
    const ids = new Set(memberList.map((m) => m.personId));
    return (blockouts.data || [])
      .filter((b) => ids.has(b.personId || ""))
      .sort((a, b) => DateHelper.toDate(a.startDate || 0).getTime() - DateHelper.toDate(b.startDate || 0).getTime());
  }, [blockouts.data, memberList]);

  const openAdd = () => {
    setPersonId("");
    setStartDate(today);
    setEndDate(today);
    setError("");
    setAdding(true);
  };

  const handleSave = async () => {
    if (!personId) return setError(Locale.label("plans.blockouts.memberRequired", "Choose a team member."));
    if (!startDate || !endDate || endDate < startDate) return setError(Locale.label("plans.blockouts.dateOrder", "The end date can't be before the start date."));
    try {
      await ApiHelper.post("/blockoutDates", [{ personId, startDate, endDate }], "DoingApi");
      setAdding(false);
      blockouts.refetch();
    } catch {
      setError(Locale.label("common.saveError"));
    }
  };

  const handleRemove = async (b: BlockoutDateInterface) => {
    if (!(await confirm(Locale.label("plans.blockouts.confirmRemove", "Remove this block-out date?")))) return;
    await ApiHelper.delete("/blockoutDates/" + b.id, "DoingApi");
    blockouts.refetch();
  };

  const actions = canEdit && <TextAction onClick={openAdd} data-testid="team-blockouts-add">{Locale.label("plans.blockouts.add", "Add block-out")}</TextAction>;

  return (
    <div data-testid="team-blockouts">
      {ConfirmDialogElement}
      <CardWithHeader title={Locale.label("plans.blockouts.title", "Block-out dates")} icon={<EventBusyIcon />} count={rows.length} actions={actions}>
        {rows.length === 0 ? (
          <Typography variant="body2" color="text.secondary">{Locale.label("plans.blockouts.none", "No upcoming block-out dates.")}</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("plans.blockouts.member", "Team member")}</TableCell>
                <TableCell>{Locale.label("plans.blockouts.from", "From")}</TableCell>
                <TableCell>{Locale.label("plans.blockouts.to", "To")}</TableCell>
                {canEdit && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((b) => (
                <TableRow key={b.id} data-testid={"team-blockout-" + b.personId}>
                  <TableCell>{nameFor(b.personId)}</TableCell>
                  <TableCell>{prettyDay(b.startDate)}</TableCell>
                  <TableCell>{prettyDay(b.endDate)}</TableCell>
                  {canEdit && (
                    <TableCell align="right">
                      <Tooltip title={Locale.label("plans.blockouts.remove", "Remove")}>
                        <IconButton size="small" aria-label={Locale.label("plans.blockouts.remove", "Remove")} onClick={() => handleRemove(b)} data-testid={"team-blockout-remove-" + b.id}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardWithHeader>

      <Dialog open={adding} onClose={() => setAdding(false)} maxWidth="xs" fullWidth data-testid="team-blockout-dialog">
        <DialogTitle>{Locale.label("plans.blockouts.add", "Add block-out")}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField select label={Locale.label("plans.blockouts.member", "Team member")} value={personId} onChange={(e) => setPersonId(e.target.value)} fullWidth data-testid="team-blockout-member">
              {memberList.map((m) => <MenuItem key={m.personId} value={m.personId}>{m.person?.name?.display}</MenuItem>)}
            </TextField>
            <AppDatePicker label={Locale.label("plans.blockouts.from", "From")} value={startDate} onChange={(e) => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value); }} fullWidth inputProps={{ "data-testid": "team-blockout-start" }} />
            <AppDatePicker label={Locale.label("plans.blockouts.to", "To")} value={endDate} onChange={(e) => setEndDate(e.target.value)} fullWidth inputProps={{ "data-testid": "team-blockout-end" }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdding(false)}>{Locale.label("common.cancel")}</Button>
          <Button variant="contained" onClick={handleSave} data-testid="team-blockout-save">{Locale.label("common.save")}</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
