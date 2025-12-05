import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { type GroupInterface, type GroupMemberInterface, type PersonInterface } from "@churchapps/helpers";
import {
  ApiHelper, DisplayBox, Loading, Locale, PersonAvatar 
} from "@churchapps/apphelper";
import { Table, TableBody, TableRow, TableCell, TableHead } from "@mui/material";
import { SmallButton } from "@churchapps/apphelper";

interface Props {
  group: GroupInterface;
  addFunction: (person: PersonInterface) => void;
  hiddenPeople?: string[];
}

export const MembersAdd: React.FC<Props> = (props) => {
  const [groupMembers, setGroupMembers] = React.useState<GroupMemberInterface[]>([]);
  const isSubscribed = useRef(true);

  const loadData = React.useCallback(() => {
    ApiHelper.get("/groupmembers?groupId=" + props.group.id, "MembershipApi").then((data) => {
      if (isSubscribed.current) {
        setGroupMembers(data);
      }
    });
  }, [props.group, isSubscribed]);
  const addMember = (gm: GroupMemberInterface) => {
    const members = groupMembers;
    const idx = members.indexOf(gm);
    const person = members[idx].person;
    setGroupMembers(members);
    props.addFunction(person);
  };

  const getRows = () => {
    const rows: JSX.Element[] = [];
    const filtered: GroupMemberInterface[] = [];
    groupMembers.forEach((d: GroupMemberInterface) => {
      if (!props.hiddenPeople || props.hiddenPeople.indexOf(d.personId) === -1) {
        filtered.push(d);
      }
    });
    if (filtered.length === 0) {
      rows.push(
        <TableRow key="0">
          <TableCell>{Locale.label("groups.membersAdd.noMem")}</TableCell>
        </TableRow>
      );
      return rows;
    }
    for (let i = 0; i < filtered.length; i++) {
      const gm = filtered[i];
      const personName = gm.person?.name?.display || "Unknown";
      rows.push(
        <TableRow key={gm.personId}>
          <TableCell>
            <PersonAvatar person={gm.person} size="small" />
          </TableCell>
          <TableCell>
            <Link to={"/people/" + gm.personId}>{personName}</Link>
          </TableCell>
          <TableCell>
            <SmallButton icon="person_add" text={Locale.label("common.add")} onClick={() => addMember(gm)} color="success" data-testid="add-member-button" ariaLabel="Add member to group" />
          </TableCell>
        </TableRow>
      );
    }
    return rows;
  };

  const getTableHeader = () => {
    const rows: JSX.Element[] = [];
    if (groupMembers.length === 0) return rows;
    rows.push(
      <TableRow key="0">
        <th></th>
        <th>{Locale.label("common.name")}</th>
        <th></th>
      </TableRow>
    );
    return rows;
  };

  React.useEffect(() => {
    if (props.group !== null) loadData();
    return () => {
      isSubscribed.current = false;
    };
  }, [props.group, loadData]);

  let content = <Loading />;
  if (groupMembers) {
    content = (
      <Table className="personSideTable">
        <TableHead>{getTableHeader()}</TableHead>
        <TableBody>{getRows()}</TableBody>
      </Table>
    );
  }

  return (
    <DisplayBox headerIcon="person" headerText={Locale.label("groups.membersAdd.availableMem")} data-cy="available-group-members">
      {content}
    </DisplayBox>
  );
};
