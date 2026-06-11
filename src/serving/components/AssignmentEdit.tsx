import React, { useEffect } from "react";
import { Table, TableCell, TableRow, Avatar, IconButton, Tooltip } from "@mui/material";
import { Tune as TuneIcon } from "@mui/icons-material";
import { type AssignmentInterface, type GroupMemberInterface, type PositionInterface } from "@churchapps/helpers";
import { ApiHelper, Locale, PersonHelper } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { SchedulingPreferenceEdit } from "./SchedulingPreferenceEdit";

interface Props {
  assignment: AssignmentInterface;
  position: PositionInterface;
  peopleNeeded: number;
  updatedFunction: (done: boolean) => void;
}

export const AssignmentEdit = (props: Props) => {
  const [groupMembers, setGroupMembers] = React.useState<GroupMemberInterface[]>([]);
  const [preferencePerson, setPreferencePerson] = React.useState<{ id: string; name: string }>(null);

  const handleSave = () => {
    props.updatedFunction(true);
  };

  const handleDelete = () => {
    ApiHelper.delete("/assignments/" + props.assignment.id, "DoingApi").then(() => props.updatedFunction(true));
  };

  const loadData = () => {
    if (!props.position?.groupId) return;
    ApiHelper.get("/groupmembers?groupId=" + props.position.groupId, "MembershipApi").then((data: any) => {
      setGroupMembers(data);
    });
  };

  const selectPerson = (gm: GroupMemberInterface) => {
    const a = { ...props.assignment } as AssignmentInterface;
    a.personId = gm.personId;
    ApiHelper.post("/assignments", [a], "DoingApi").then(() => {
      props.updatedFunction(props.peopleNeeded <= 1);
    });
  };

  const getMembers = () => {
    const rows: JSX.Element[] = [];
    if (groupMembers.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell>{Locale.label("plans.assignmentEdit.noMem")}</TableCell>
        </TableRow>
      );
      return rows;
    }

    for (let i = 0; i < groupMembers.length; i++) {
      const gm = groupMembers[i];
      const personName = gm.person?.name?.display || Locale.label("person.unknown");
      rows.push(
        <TableRow key={i}>
          <TableCell>
            <Avatar src={PersonHelper.getPhotoUrl(gm.person)} sx={{ width: 32, height: 32 }} />
          </TableCell>
          <TableCell style={{ width: "80%" }}>
            <button
              type="button"
              onClick={() => selectPerson(gm)}
              style={{ background: "none", border: 0, padding: 0, color: "var(--link)", cursor: "pointer" }}>
              {personName}
            </button>
          </TableCell>
          <TableCell align="right">
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
    loadData();
  }, [props.position?.groupId]);

  return (
    <>
      <FormCard
        title={props.assignment?.id ? Locale.label("plans.assignmentEdit.editAssign") : Locale.label("plans.assignmentEdit.assignPos")}
        icon="assignment"
        onSave={handleSave}
        onCancel={() => props.updatedFunction(true)}
        onDelete={props.assignment.id ? handleDelete : undefined}
        saveText={Locale.label("plans.assignmentEdit.done")}>
        <Table size="small">{getMembers()}</Table>
      </FormCard>
      {preferencePerson && <SchedulingPreferenceEdit personId={preferencePerson.id} personName={preferencePerson.name} onClose={() => setPreferencePerson(null)} />}
    </>
  );
};
