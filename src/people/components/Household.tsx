import React from "react";
import { type HouseholdInterface, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, UserHelper, Permissions, UniqueIdHelper, Loading, Locale, PersonAvatar } from "@churchapps/apphelper";
import { Link as RouterLink } from "react-router-dom";
import { Box, Link, Typography } from "@mui/material";
import { RecordHeading, TextAction } from "../../components/ui";

const roleOrder: Record<string, number> = { Head: 0, Spouse: 1, Child: 2 };
const birthTime = (d?: string | Date) => {
  const t = d ? new Date(d).getTime() : NaN;
  return Number.isNaN(t) ? Number.POSITIVE_INFINITY : t;
};
const sortMembers = (list: PersonInterface[]) => [...list].sort((a, b) => ((roleOrder[a.householdRole || ""] ?? 3) - (roleOrder[b.householdRole || ""] ?? 3))
  || (birthTime(a.birthDate) - birthTime(b.birthDate))
  || (a.name?.display || "").localeCompare(b.name?.display || ""));

export const useHousehold = (person: PersonInterface | null) => {
  const [household, setHousehold] = React.useState<HouseholdInterface | null>(null);
  const [members, setMembers] = React.useState<PersonInterface[] | null>(null);

  const loadHousehold = React.useCallback(() => {
    if (!person) return;
    if (!UniqueIdHelper.isMissing(person.householdId)) {
      ApiHelper.get("/households/" + person.householdId, "MembershipApi").then((data: HouseholdInterface) => setHousehold(data));
    } else if (person.id && UserHelper.checkAccess(Permissions.membershipApi.people.edit)) {
      // Nobody is allowed to exist without a household, so heal instead of showing an empty box.
      ApiHelper.post("/households", [{ name: person.name?.last || "" }], "MembershipApi").then((data: HouseholdInterface[]) => {
        person.householdId = data[0].id;
        ApiHelper.post("/people", [person], "MembershipApi").then(() => setHousehold(data[0]));
      });
    } else setMembers([]);
  }, [person]);

  const loadMembers = React.useCallback(() => {
    if (!household?.id) return;
    ApiHelper.get("/people/household/" + household.id, "MembershipApi").then((data: PersonInterface[]) => setMembers(sortMembers(data || [])));
  }, [household?.id]);

  React.useEffect(loadHousehold, [loadHousehold]);
  React.useEffect(loadMembers, [loadMembers, person?.photoUpdated]);

  const reload = React.useCallback(() => {
    loadHousehold();
    loadMembers();
  }, [loadHousehold, loadMembers]);

  return { household, members, reload };
};

interface Props {
  person: PersonInterface;
  household: HouseholdInterface | null;
  members: PersonInterface[] | null;
  editing?: boolean;
  onEdit?: () => void;
}

export const Household: React.FC<Props> = ({ person, household, members, editing, onEdit }) => {
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.people.edit);
  const listLabel = (household?.name || "") + Locale.label("people.household.house");

  const tiles = (members || []).map((m) => {
    const isSelf = m.id === person.id;
    const name = m.name?.display || "";
    const face = (
      <>
        <PersonAvatar person={m} sx={{ width: 56, height: 56, fontSize: 18, fontWeight: 700, borderRadius: "var(--b1-radius-avatar)", bgcolor: m.householdRole === "Child" ? "var(--b1-accent)" : "var(--b1-avatar)", color: m.householdRole === "Child" ? "var(--b1-on-accent)" : "var(--b1-on-avatar)", outline: isSelf ? "2px solid" : "none", outlineColor: "primary.main", outlineOffset: 2 }} />
        <Typography variant="caption" component="span" noWrap sx={{ display: "block", mt: 0.75, color: isSelf ? "text.primary" : "inherit", fontWeight: isSelf ? 600 : 400 }}>{name}</Typography>
        {m.householdRole && <Typography variant="caption" component="span" noWrap sx={{ display: "block", color: "text.secondary" }}>{m.householdRole}</Typography>}
      </>
    );
    const tileSx = { display: "block", width: 72, textAlign: "center", color: "text.primary", textDecoration: "none", borderRadius: "var(--b1-radius-control)" } as const;
    return (
      <Box component="li" key={m.id} sx={{ minWidth: 0 }}>
        {isSelf
          ? <Box aria-current="page" title={name} sx={tileSx}>{face}</Box>
          : <Link component={RouterLink} to={"/people/" + m.id} title={name} aria-label={[name, m.householdRole].filter(Boolean).join(", ")} underline="none" sx={{ ...tileSx, "&:hover .MuiAvatar-root": { opacity: 0.85 } }}>{face}</Link>}
      </Box>
    );
  });

  return (
    <Box component="section" id={editing ? undefined : "householdBox"} aria-labelledby="household-heading">
      <RecordHeading id="household-heading" label={Locale.label("people.personRecord.household", "Household")}>
        {canEdit && !editing && household && members !== null && (
          <TextAction small onClick={onEdit} aria-label={Locale.label("common.edit")}>{Locale.label("common.edit")}</TextAction>
        )}
      </RecordHeading>
      {members === null
        ? <Loading size="sm" />
        : <Box component="ul" aria-label={listLabel} sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, listStyle: "none", m: 0, p: 0 }}>{tiles}</Box>}
    </Box>
  );
};
