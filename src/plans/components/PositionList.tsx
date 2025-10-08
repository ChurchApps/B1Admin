import React from "react";
import { Badge, Table, TableBody, TableCell, TableHead, TableRow, Avatar } from "@mui/material";
import {
  type AssignmentInterface,
  type PersonInterface,
  type PositionInterface,
} from "@churchapps/helpers";
import {
  ArrayHelper,
  Locale,
  PersonHelper,
  UserHelper,
  Permissions,
} from "@churchapps/apphelper";

interface Props {
  positions: PositionInterface[];
  assignments: AssignmentInterface[];
  people: PersonInterface[];
  onSelect?: (position: PositionInterface) => void;
  onAssignmentSelect?: (position: PositionInterface, assignment: AssignmentInterface) => void;
}

export const PositionList = (props: Props) => {
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.plans.edit);
  const colorList = [
    "#FFF8E7", "#E7F2FA", "#E7F4E7", "#F7E7F4", "#F7F4E7", "#E7F7F4", "#F4E7F7", "#F4F7E7", "#E7F7F7", "#F7E7F7", "#F7F7E7", "#E7E7F7", "#F4F4F7", "#F7F4F4", "#F4F7F4", "#F4F4F4"
  ];

  const getPersonLink = (assignment: AssignmentInterface, position: PositionInterface) => {
    const person = ArrayHelper.getOne(props.people, "id", assignment.personId);
    if (person) {
      const image = (
        <span>
          <Avatar src={PersonHelper.getPhotoUrl(person)} sx={{ width: 32, height: 32 }} />
        </span>
      );
      let wrappedImage = image;
      if (assignment.status === "Accepted") {
        wrappedImage = (
          <Badge color="success" variant="dot">
            {image}
          </Badge>
        );
      } else if (assignment.status === "Declined") {
        wrappedImage = (
          <Badge color="error" variant="dot">
            {image}
          </Badge>
        );
      }
      if (canEdit) {
        return (
          <button
            type="button"
            onClick={() => props.onAssignmentSelect(position, assignment || { positionId: position.id })}
            style={{ background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            {wrappedImage}
            {person.name.display}
          </button>
        );
      } else {
        return (
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {wrappedImage}
            {person.name.display}
          </span>
        );
      }
    } else return Locale.label("plans.positionList.load");
  };

  const getPeopleLinks = (position: PositionInterface) => {
    const assignments = ArrayHelper.getAll(props.assignments || [], "positionId", position.id);
    const result: JSX.Element[] = [];
    assignments.forEach((assignment) => result.push(<div key={assignment.id} style={{ margin: "2px 0" }}>{getPersonLink(assignment, position)}</div>));
    const remaining = position.count - assignments.length;
    if (remaining > 0 && canEdit) {
      const label = remaining === 1 ? Locale.label("plans.positionList.persNeed") : remaining.toString() + Locale.label("plans.positionList.pplNeed");
      result.push(
        <button
          type="button"
          onClick={() => props.onAssignmentSelect(position, { positionId: position.id })}
          style={{ background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer" }}>
          {label}
        </button>
      );
    }
    return result;
  };

  const getPositionRow = (position: PositionInterface, color: string, first: boolean) => {
    const assignments = ArrayHelper.getAll(props.assignments || [], "positionId", position.id);
    const hasPeople = assignments.length > 0;
    return (
      <TableRow style={{ backgroundColor: color }}>
        <TableCell style={{ paddingLeft: 10, paddingTop: 10, paddingBottom: 10, fontWeight: "bold", verticalAlign: "top" }}>{first ? position.categoryName : ""}</TableCell>
        <TableCell style={{ paddingTop: 10, paddingBottom: 10, verticalAlign: "top" }}>
          {canEdit ? (
            <button
              type="button"
              onClick={() => props.onSelect(position)}
              style={{ background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer" }}>
              {position.name}
            </button>
          ) : (
            <span>{position.name}</span>
          )}
        </TableCell>
        <TableCell style={{ paddingTop: hasPeople ? 2 : 10, paddingBottom: hasPeople ? 2 : 10, verticalAlign: "top" }}>{getPeopleLinks(position)}</TableCell>
      </TableRow>
    );
  };

  const getPositions = () => {
    let colorIndex = -1;
    const result: JSX.Element[] = [];
    let lastCategory = "";
    for (let i = 0; i < props.positions.length; i++) {
      const position = props.positions[i];
      if (position.categoryName !== lastCategory) {
        colorIndex++;
        lastCategory = position.categoryName;
        result.push(getPositionRow(position, colorList[colorIndex], true));
      } else result.push(getPositionRow(position, colorList[colorIndex], false));
    }
    return result;
  };

  return (
    <>
      <Table size="small" className="positionsTable">
        <TableHead>
          <TableRow>
            <TableCell>
              <b>{Locale.label("plans.positionList.team")}</b>
            </TableCell>
            <TableCell>
              <b>{Locale.label("plans.positionList.pos")}</b>
            </TableCell>
            <TableCell>
              <b>{Locale.label("plans.positionList.ppl")}</b>
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{getPositions()}</TableBody>
      </Table>
    </>
  );
};
