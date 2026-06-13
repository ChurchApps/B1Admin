import React, { memo, useMemo } from "react";
import { HouseholdEdit } from ".";
import { type GroupMemberInterface, type PersonInterface, type VisitInterface } from "@churchapps/helpers";
import { DisplayBox, ApiHelper, UserHelper, Permissions, UniqueIdHelper, Loading, PersonHelper, Locale, PersonAvatar, DateHelper } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Table, TableBody, TableRow, TableCell, Typography, Stack, Box, Chip } from "@mui/material";
import { Edit as EditIcon, Email as EmailIcon, Phone as PhoneIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";

interface Props {
  person: PersonInterface;
  reload: any;
}

export const Household: React.FC<Props> = memo((props) => {
  const [household, setHousehold] = React.useState(null);
  const [members, setMembers] = React.useState<PersonInterface[]>(null);
  const [memberGroups, setMemberGroups] = React.useState<Record<string, string[]>>({});
  const [memberLastActivity, setMemberLastActivity] = React.useState<Record<string, string>>({});
  const [mode, setMode] = React.useState("display");
  const [, setPhoto] = React.useState("");

  const handleEdit = () => setMode("edit");
  const handleUpdate = () => {
    loadData();
    loadMembers();
    setMode("display");
  };
  const loadData = () => {
    if (!UniqueIdHelper.isMissing(props.person?.householdId)) {
      ApiHelper.get("/households/" + props?.person.householdId, "MembershipApi").then((data: any) => setHousehold(data));
    }
  };
  const loadMembers = () => {
    if (household != null) {
      ApiHelper.get("/people/household/" + household.id, "MembershipApi").then((data: any) => setMembers(data));
    }
  };
  const getEditContent = () => (UserHelper.checkAccess(Permissions.membershipApi.people.edit)
    ? <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} tone="card" onClick={handleEdit} />
    : undefined);
  React.useEffect(loadData, [props.person]);
  React.useEffect(() => {
    setPhoto(PersonHelper.getPhotoUrl(props.person));
  }, [props.person]);
  React.useEffect(loadMembers, [household]);
  React.useEffect(() => {
    let active = true;

    const loadMemberSummaries = async () => {
      if (!members?.length) {
        setMemberGroups({});
        setMemberLastActivity({});
        return;
      }

      const memberIds = members.map((m) => m.id).filter(Boolean) as string[];
      const canViewGroups = UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view);
      const canViewAttendance = UserHelper.checkAccess(Permissions.attendanceApi.attendance.view);

      const groupEntries = canViewGroups
        ? await Promise.all(memberIds.map(async (personId) => {
          try {
            const groupMembers: GroupMemberInterface[] = await ApiHelper.get("/groupmembers?personId=" + personId, "MembershipApi");
            const groupNames = (groupMembers || []).map((gm) => gm.group?.name).filter(Boolean) as string[];
            return [personId, groupNames] as const;
          } catch {
            return [personId, []] as const;
          }
        }))
        : [];

      const activityEntries = canViewAttendance
        ? await Promise.all(memberIds.map(async (personId) => {
          try {
            const visits: VisitInterface[] = await ApiHelper.get("/visits?personId=" + personId, "AttendanceApi");
            const latest = (visits || [])
              .map((visit) => visit.visitDate ? DateHelper.toDate(visit.visitDate) : null)
              .filter((date): date is Date => !!date && !Number.isNaN(date.getTime()))
              .sort((a, b) => b.getTime() - a.getTime())[0];
            return [personId, latest ? DateHelper.prettyDate(latest) : ""] as const;
          } catch {
            return [personId, ""] as const;
          }
        }))
        : [];

      if (!active) return;
      setMemberGroups(Object.fromEntries(groupEntries));
      setMemberLastActivity(Object.fromEntries(activityEntries.filter(([, date]) => !!date)));
    };

    loadMemberSummaries();
    return () => { active = false; };
  }, [members]);

  const getRows = useMemo(() => {
    if (!members) return [];

    return members
      .filter((m) => m.id !== props.person.id)
      .map((m) => {
        const age = m.birthDate ? PersonHelper.getAge(new Date(m.birthDate)) : null;
        const email = m.contactInfo?.email;
        const phone = m.contactInfo?.mobilePhone || m.contactInfo?.homePhone || m.contactInfo?.workPhone;
        const groups = m.id ? memberGroups[m.id] || [] : [];
        const lastActivity = m.id ? memberLastActivity[m.id] : "";

        return (
          <TableRow key={m.id} sx={{ "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" } }}>
            <TableCell sx={{ width: "120px", p: 3 }}>
              <PersonAvatar person={m} size="large" />
            </TableCell>
            <TableCell sx={{ p: 3, width: "30%" }}>
              <Box>
                <Stack direction="row" spacing={3} alignItems="center" mb={2}>
                  <Link to={"/people/" + m.id} style={{ textDecoration: "none" }}>
                    <Typography variant="h5" sx={{ color: "primary.main", "&:hover": { textDecoration: "underline" } }}>
                      {m.name.display}
                    </Typography>
                  </Link>
                  {m.householdRole && <Chip label={m.householdRole} size="medium" variant="outlined" sx={{ fontSize: "0.875rem" }} />}
                </Stack>

                {age && (
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                    {Locale.label("people.household.age")} {age}
                  </Typography>
                )}

                {m.membershipStatus && (
                  <Typography variant="body2" color="text.secondary">
                    {Locale.label("people.household.status")} {m.membershipStatus}
                  </Typography>
                )}
              </Box>
            </TableCell>
            <TableCell sx={{ p: 3, width: "40%" }}>
              <Stack spacing={2}>
                {email && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <EmailIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                    <Typography variant="body1" color="text.secondary">
                      {email}
                    </Typography>
                  </Stack>
                )}
                {phone && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PhoneIcon sx={{ fontSize: 20, color: "text.secondary" }} />
                    <Typography variant="body1" color="text.secondary">
                      {phone}
                    </Typography>
                  </Stack>
                )}
                {!email && !phone && (
                  <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
                    {Locale.label("people.household.noContactInfo")}
                  </Typography>
                )}
              </Stack>
            </TableCell>
            <TableCell sx={{ p: 3, width: "30%" }}>
              <Stack spacing={1}>
                {groups.length > 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    {Locale.label("people.household.groups")} {groups.join(", ")}
                  </Typography>
                )}
                {lastActivity && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
                    {Locale.label("people.household.lastActivity")} {lastActivity}
                  </Typography>
                )}
              </Stack>
            </TableCell>
          </TableRow>
        );
      });
  }, [memberGroups, memberLastActivity, members, props.person.id]);

  const getTable = () => {
    if (!members) return <Loading size="sm" />;
    else {
      return (
        <Table id="household" sx={{ "& .MuiTableCell-root": { border: "none" } }}>
          <TableBody>{getRows}</TableBody>
        </Table>
      );
    }
  };

  if (mode === "display") {
    return (
      <DisplayBox id="householdBox" headerIcon="group" headerText={(household?.name || "") + Locale.label("people.household.house")} editContent={getEditContent()}>
        {getTable()}
      </DisplayBox>
    );
  } else return <HouseholdEdit household={household} currentMembers={members} updatedFunction={handleUpdate} currentPerson={props.person} />;
});
