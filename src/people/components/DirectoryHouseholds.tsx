import React, { useMemo } from "react";
import { Link as RouterLink } from "react-router-dom";
import { type PersonInterface } from "@churchapps/helpers";
import { Locale, PersonHelper } from "@churchapps/apphelper";
import { Avatar, AvatarGroup, Box, Checkbox, Link, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { clickableRowSx, tableScrollSx } from "../../components/ui";

export interface DirectoryHousehold {
  key: string;
  name: string;
  letter: string;
  sortName: string;
  head: PersonInterface;
  members: PersonInterface[];
}

const roleRank = (role?: string) => ({ head: 0, spouse: 1 } as Record<string, number>)[(role || "").toLowerCase()] ?? 2;

const birthTime = (birthDate?: string | Date) => {
  const t = birthDate ? new Date(birthDate).getTime() : NaN;
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};

const sortMembers = (members: PersonInterface[]) => [...members].sort((a, b) => roleRank(a.householdRole) - roleRank(b.householdRole)
  || birthTime(a.birthDate) - birthTime(b.birthDate)
  || (a.name?.display || "").localeCompare(b.name?.display || ""));

export const groupHouseholds = (people: PersonInterface[], householdNames: Map<string, string>): DirectoryHousehold[] => {
  const groups = new Map<string, PersonInterface[]>();
  people.forEach((p) => {
    const key = p.householdId || `person-${p.id}`;
    const list = groups.get(key);
    if (list) list.push(p);
    else groups.set(key, [p]);
  });

  const result: DirectoryHousehold[] = [];
  groups.forEach((list, key) => {
    const members = sortMembers(list);
    const head = members[0];
    // Stored names vary ("Smith", "Smith Family", "The Smith Family"); normalize to the bare surname.
    const surname = (householdNames.get(key) || head.name?.last || "").trim().replace(/^the\s+/i, "").replace(/\s+family$/i, "");
    const single = members.length === 1 || !surname;
    const name = single ? head.name?.display || "" : Locale.label("people.directory.family").replace("{name}", surname);
    const sortName = (single ? `${head.name?.last || head.name?.display || ""} ${head.name?.first || ""}` : surname).trim().toLowerCase();
    const first = sortName.charAt(0).toUpperCase();
    result.push({ key, name, head, members, sortName, letter: /[A-Z]/.test(first) ? first : "#" });
  });
  return result.sort((a, b) => a.sortName.localeCompare(b.sortName));
};

const photoUrl = (p: PersonInterface) => {
  const url = PersonHelper.getPhotoUrl(p);
  return url && url !== "/images/sample-profile.png" ? url : undefined;
};

const srOnly = { position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap", border: 0, p: 0, m: "-1px" } as const;

const initial = (p: PersonInterface) => (p.name?.nick || p.name?.first || p.name?.display || "?").trim().charAt(0).toUpperCase();

interface Props {
  households: DirectoryHousehold[];
  canSelect: boolean;
  selectedPersonIds: string[];
  currentPersonId: string;
  onOpen: (person: PersonInterface) => void;
  onToggleHousehold: (members: PersonInterface[]) => void;
}

export const DirectoryHouseholds = (props: Props) => {
  const selected = useMemo(() => new Set(props.selectedPersonIds), [props.selectedPersonIds]);
  const colSpan = props.canSelect ? 3 : 2;

  const rows: React.ReactNode[] = [];
  let letter = "";
  props.households.forEach((h) => {
    if (h.letter !== letter) {
      letter = h.letter;
      rows.push(
        <TableRow key={`letter-${letter}`} sx={{ "&:hover": { bgcolor: "transparent" } }}>
          <TableCell colSpan={colSpan} sx={{ pt: 3, pb: 1, height: "auto", borderBottom: 1, borderColor: "divider" }}>
            <Typography variant="h3" component="h3" color="primary">{letter}</Typography>
          </TableCell>
        </TableRow>
      );
    }

    const selectable = h.members.filter((m) => m.id && m.id !== props.currentPersonId);
    const selectedCount = selectable.filter((m) => selected.has(m.id as string)).length;
    const allSelected = selectable.length > 0 && selectedCount === selectable.length;

    rows.push(
      <TableRow key={h.key} sx={clickableRowSx} onClick={() => props.onOpen(h.head)} data-testid="household-row">
        {props.canSelect && (
          <TableCell padding="checkbox" sx={{ borderBottom: 0 }}>
            <Checkbox
              checked={allSelected}
              indeterminate={!allSelected && selectedCount > 0}
              disabled={selectable.length === 0}
              onClick={(e) => e.stopPropagation()}
              onChange={() => props.onToggleHousehold(selectable)}
              slotProps={{ input: { "aria-label": Locale.label("people.directory.selectHousehold").replace("{name}", h.name) } }}
            />
          </TableCell>
        )}
        <TableCell sx={{ width: 168, borderBottom: 0, py: 1.5 }}>
          <AvatarGroup max={4} aria-hidden sx={{ justifyContent: "flex-end", "& .MuiAvatar-root": { width: 40, height: 40, borderColor: "background.paper", bgcolor: "var(--b1-selected)", color: "var(--b1-on-selected)" } }}>
            {h.members.map((m) => <Avatar key={m.id} src={photoUrl(m)} alt="">{initial(m)}</Avatar>)}
          </AvatarGroup>
        </TableCell>
        <TableCell sx={{ borderBottom: 0, py: 1.5 }}>
          <Link component={RouterLink} to={"/people/" + h.head.id} onClick={(e: React.MouseEvent) => e.stopPropagation()} underline="hover" sx={{ fontWeight: 600, typography: "body1" }}>
            {h.name}
          </Link>
          {h.members.length > 1 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {h.members.map((m, i) => (
                <React.Fragment key={m.id}>
                  {i > 0 && ", "}
                  <Link component={RouterLink} to={"/people/" + m.id} onClick={(e: React.MouseEvent) => e.stopPropagation()} color="inherit" underline="hover">
                    {m.name?.display}
                  </Link>
                </React.Fragment>
              ))}
            </Typography>
          )}
        </TableCell>
      </TableRow>
    );
  });

  return (
    <Box sx={tableScrollSx} role="region" aria-label={Locale.label("people.directory.households")} tabIndex={0}>
      <Table id="peopleTable" size="small">
        <TableHead sx={srOnly}>
          <TableRow>
            {props.canSelect && <TableCell>{Locale.label("people.directory.selectAll")}</TableCell>}
            <TableCell>{Locale.label("people.peoplePage.photo")}</TableCell>
            <TableCell>{Locale.label("people.directory.households")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{rows}</TableBody>
      </Table>
    </Box>
  );
};
