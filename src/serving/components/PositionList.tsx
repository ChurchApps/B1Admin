import { Badge, Box, Table, TableBody, TableCell, TableHead, TableRow, Avatar } from "@mui/material";
import { StatusBadge } from "../../components/ui";
import {
  type AssignmentInterface,
  type GroupInterface,
  type PersonInterface,
  type PositionInterface
} from "@churchapps/helpers";
import {
  ArrayHelper,
  Locale,
  PersonHelper
} from "@churchapps/apphelper";

interface Props {
  positions: PositionInterface[];
  assignments: AssignmentInterface[];
  people: PersonInterface[];
  groups: GroupInterface[];
  canEdit: boolean;
  onSelect?: (position: PositionInterface) => void;
  onAssignmentSelect?: (position: PositionInterface, assignment: AssignmentInterface) => void;
}

export const PositionList = (props: Props) => {
  const { canEdit } = props;
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
      const personName = person?.name?.display || Locale.label("person.unknown");
      if (canEdit) {
        return (
          <button
            type="button"
            onClick={() => props.onAssignmentSelect?.(position, assignment || { positionId: position.id })}
            style={{ background: "none", border: 0, padding: 0, color: "var(--b1-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            {wrappedImage}
            {personName}
          </button>
        );
      } else {
        return (
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {wrappedImage}
            {personName}
          </span>
        );
      }
    } else return Locale.label("plans.positionList.load");
  };

  const getPeopleLinks = (position: PositionInterface) => {
    const assignments = ArrayHelper.getAll(props.assignments || [], "positionId", position.id);
    const result: JSX.Element[] = [];
    assignments.forEach((assignment) => result.push(<div key={assignment.id} style={{ margin: "2px 0" }}>{getPersonLink(assignment, position)}</div>));
    const remaining = (position.count ?? 0) - assignments.length;
    if (remaining > 0 && canEdit) {
      const label = remaining === 1 ? Locale.label("plans.positionList.persNeed") : remaining.toString() + Locale.label("plans.positionList.pplNeed");
      result.push(
        <button
          key="remaining"
          type="button"
          onClick={() => props.onAssignmentSelect?.(position, { positionId: position.id })}
          style={{ background: "none", border: 0, padding: 0, color: "var(--b1-primary)", cursor: "pointer" }}>
          {label}
        </button>
      );
    }
    return result;
  };

  const getPositionRow = (position: PositionInterface, first: boolean) => {
    const assignments = ArrayHelper.getAll(props.assignments || [], "positionId", position.id);
    const hasPeople = assignments.length > 0;
    const group = position.groupId && Array.isArray(props.groups) ? ArrayHelper.getOne(props.groups, "id", position.groupId) : null;
    return (
      <TableRow key={position.id} sx={first ? { "& td": { borderTop: "1px solid var(--b1-border)" } } : undefined}>
        <TableCell style={{ paddingTop: 10, paddingBottom: 10, fontWeight: 600, verticalAlign: "top" }}>{first ? position.categoryName : ""}</TableCell>
        <TableCell style={{ paddingTop: 10, paddingBottom: 10, verticalAlign: "top" }}>
          {canEdit ? (
            <button
              type="button"
              onClick={() => props.onSelect?.(position)}
              style={{ background: "none", border: 0, padding: 0, color: "var(--b1-primary)", cursor: "pointer" }}>
              {position.name}
              {group && <span style={{ color: "var(--b1-muted)", marginLeft: "8px" }}>({group.name})</span>}
            </button>
          ) : (
            <span>
              {position.name}
              {group && <span style={{ color: "var(--b1-muted)", marginLeft: "8px" }}>({group.name})</span>}
            </span>
          )}
          <Box component="span" sx={{ ml: 1 }}><StatusBadge tone={assignments.length >= (position.count || 0) ? "success" : "neutral"}>{assignments.length + "/" + (position.count || 0) + (position.allowSelfSignup ? " " + Locale.label("plans.positionList.signupSuffix") : "")}</StatusBadge></Box>
        </TableCell>
        <TableCell style={{ paddingTop: hasPeople ? 2 : 10, paddingBottom: hasPeople ? 2 : 10, verticalAlign: "top" }}>{getPeopleLinks(position)}</TableCell>
      </TableRow>
    );
  };

  const getPositions = () => {
    let lastCategory: string | null = null;
    return props.positions.map((position) => {
      const first = position.categoryName !== lastCategory;
      lastCategory = position.categoryName || "";
      return getPositionRow(position, first);
    });
  };

  return (
    <>
      <Table size="small" className="positionsTable">
        <TableHead>
          <TableRow>
            <TableCell>{Locale.label("plans.positionList.team")}</TableCell>
            <TableCell>{Locale.label("plans.positionList.pos")}</TableCell>
            <TableCell>{Locale.label("plans.positionList.ppl")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{getPositions()}</TableBody>
      </Table>
    </>
  );
};
