import React, { useEffect } from "react";
import { Box, Table, TableBody, TableCell, TableContainer, TableRow, Avatar, IconButton, TextField, Tooltip, Typography } from "@mui/material";
import { Tune as TuneIcon } from "@mui/icons-material";
import { type AssignmentInterface, type BlockoutDateInterface, type GroupMemberInterface, type PositionInterface } from "@churchapps/helpers";
import { ApiHelper, Locale, PersonHelper } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { PersonAdd } from "../../components";
import { useConfirmDelete } from "../../hooks";
import { SchedulingPreferenceEdit } from "./SchedulingPreferenceEdit";
import { UnavailableBadge } from "./UnavailableBadge";
import { findBlockout } from "../helpers/blockoutHelper";

interface Props {
  assignment: AssignmentInterface;
  position: PositionInterface;
  peopleNeeded: number;
  updatedFunction: (done: boolean) => void;
  assignedPersonIds?: string[];
  blockoutDates?: BlockoutDateInterface[];
  serviceDate?: Date | string;
}

export const AssignmentEdit = (props: Props) => {
  const [groupMembers, setGroupMembers] = React.useState<GroupMemberInterface[]>([]);
  const [searchText, setSearchText] = React.useState("");
  const [preferencePerson, setPreferencePerson] = React.useState<{ id: string; name: string } | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  // Positions without a Volunteer Group can be filled by anyone in the church.
  const useSearch = !props.position?.groupId;

  const handleSave = () => {
    props.updatedFunction(true);
  };

  const handleDelete = async () => {
    if (!(await confirm(Locale.label("plans.assignmentEdit.confirmDelete")))) return;
    ApiHelper.delete("/assignments/" + props.assignment.id, "DoingApi").then(() => props.updatedFunction(true));
  };

  const loadData = () => {
    if (!props.position?.groupId) return;
    ApiHelper.get("/groupmembers?groupId=" + props.position.groupId, "MembershipApi").then((data: any) => {
      setGroupMembers(data);
    });
  };

  const selectPersonId = (personId: string) => {
    const a = { ...props.assignment } as AssignmentInterface;
    a.personId = personId;
    ApiHelper.post("/assignments", [a], "DoingApi").then(() => {
      props.updatedFunction(props.peopleNeeded <= 1);
    });
  };

  const selectPerson = (gm: GroupMemberInterface) => selectPersonId(gm.personId);

  const getMembers = () => {
    const rows: JSX.Element[] = [];
    // Someone already in this position can't fill a second spot in it.
    const assigned = props.assignedPersonIds || [];
    // Blocked-out members stay selectable but sort last, flagged.
    const blockoutFor = (gm: GroupMemberInterface) => findBlockout(props.blockoutDates, gm.personId, props.serviceDate);
    const term = searchText.trim().toLowerCase();
    const available = groupMembers.filter((gm) => !assigned.includes(gm.personId))
      .filter((gm) => !term || (gm.person?.name?.display || "").toLowerCase().includes(term))
      .map((gm) => ({ gm, blockout: blockoutFor(gm) }))
      .sort((a, b) => (a.blockout ? 1 : 0) - (b.blockout ? 1 : 0));
    if (available.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell>{Locale.label("plans.assignmentEdit.noMem")}</TableCell>
        </TableRow>
      );
      return rows;
    }

    for (let i = 0; i < available.length; i++) {
      const { gm, blockout } = available[i];
      const personName = gm.person?.name?.display || Locale.label("person.unknown");
      rows.push(
        <TableRow key={i}>
          <TableCell>
            <Avatar src={PersonHelper.getPhotoUrl(gm.person!)} sx={{ width: 32, height: 32 }} />
          </TableCell>
          <TableCell style={{ width: "80%" }}>
            <button
              type="button"
              onClick={() => selectPerson(gm)}
              style={{ background: "none", border: 0, padding: 0, color: "var(--link)", cursor: "pointer" }}>
              {personName}
            </button>
            {blockout && <Box component="span" sx={{ ml: 1 }}><UnavailableBadge blockout={blockout} /></Box>}
          </TableCell>
          <TableCell align="right" className="rowActions">
            <Tooltip title={Locale.label("plans.schedulingPreference.title") || "Scheduling Preferences"}>
              <IconButton
                size="small"
                onClick={() => setPreferencePerson({ id: gm.personId, name: personName })}
                data-testid={"preferences-button-" + gm.personId}>
                <TuneIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </TableCell>
        </TableRow>
      );
    }
    return rows;
  };

  useEffect(() => {
    setPreferencePerson(null);
    loadData();
  }, [props.position?.id, props.position?.groupId, props.assignment?.id]);

  return (
    <>
      {ConfirmDialogElement}
      <FormCard
        title={props.assignment?.id ? Locale.label("plans.assignmentEdit.editAssign") : Locale.label("plans.assignmentEdit.assignPos")}
        icon="assignment"
        onSave={handleSave}
        onCancel={() => props.updatedFunction(true)}
        onDelete={props.assignment.id ? handleDelete : undefined}
        saveText={Locale.label("plans.assignmentEdit.done")}>
        {useSearch ? (
          <>
            <Typography variant="body2" sx={{ color: "var(--text-muted)", mb: 1 }}>{Locale.label("plans.assignmentEdit.searchAnyone")}</Typography>
            <PersonAdd
              getPhotoUrl={PersonHelper.getPhotoUrl}
              addFunction={(p) => selectPersonId(p.id!)}
              actionLabel={Locale.label("plans.assignmentEdit.assignPos")}
              filterList={props.assignedPersonIds || []}
            />
          </>
        ) : (
          <>
            <TextField
              fullWidth
              size="small"
              label={Locale.label("plans.assignmentEdit.searchTeam")}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
            {/* The FormCard clips overflow, so a long team scrolls here and Done stays in view. */}
            <TableContainer sx={{ maxHeight: "max(200px, calc(100vh - 380px))" }}>
              <Table size="small"><TableBody>{getMembers()}</TableBody></Table>
            </TableContainer>
          </>
        )}
      </FormCard>
      {preferencePerson && <SchedulingPreferenceEdit personId={preferencePerson?.id} personName={preferencePerson?.name} onClose={() => setPreferencePerson(null)} />}
    </>
  );
};
