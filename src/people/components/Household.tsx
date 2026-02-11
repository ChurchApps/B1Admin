import React, { memo, useMemo } from "react";
import { HouseholdEdit } from ".";
import { type PersonInterface } from "@churchapps/helpers";
import { DisplayBox, ApiHelper, UserHelper, Permissions, UniqueIdHelper, Loading, PersonHelper, Locale, PersonAvatar } from "@churchapps/apphelper";
import { Link } from "react-router-dom";
import { Table, TableBody, TableRow, TableCell, Typography, Stack, Box, Chip } from "@mui/material";
import { Email as EmailIcon, Phone as PhoneIcon } from "@mui/icons-material";

interface Props {
  person: PersonInterface;
  reload: any;
}

export const Household: React.FC<Props> = memo((props) => {
  const [household, setHousehold] = React.useState(null);
  const [members, setMembers] = React.useState<PersonInterface[]>(null);
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
      ApiHelper.get("/households/" + props?.person.householdId, "MembershipApi").then((data) => setHousehold(data));
    }
  };
  const loadMembers = () => {
    if (household != null) {
      ApiHelper.get("/people/household/" + household.id, "MembershipApi").then((data) => setMembers(data));
    }
  };
  const getEditFunction = () => (UserHelper.checkAccess(Permissions.membershipApi.people.edit) ? handleEdit : undefined);
  React.useEffect(loadData, [props.person]);
  React.useEffect(() => {
    setPhoto(PersonHelper.getPhotoUrl(props.person));
  }, [props.person]);
  React.useEffect(loadMembers, [household]);

  const getRows = useMemo(() => {
    if (!members) return [];

    return members
      .filter((m) => m.id !== props.person.id)
      .map((m) => {
        const age = m.birthDate ? PersonHelper.getAge(m.birthDate) : null;
        const email = m.contactInfo?.email;
        const phone = m.contactInfo?.mobilePhone || m.contactInfo?.homePhone || m.contactInfo?.workPhone;

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
                    Age: {age}
                  </Typography>
                )}

                {m.membershipStatus && (
                  <Typography variant="body2" color="text.secondary">
                    Status: {m.membershipStatus}
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
                    No contact information
                  </Typography>
                )}
              </Stack>
            </TableCell>
            <TableCell sx={{ p: 3, width: "30%" }}>
              <Stack spacing={1}>
                {/* Placeholder for groups/involvement - can be expanded later */}
                <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
                  Groups: Youth Ministry, Worship Team
                </Typography>
                <Typography variant="body2" color="text.disabled" sx={{ fontStyle: "italic" }}>
                  Last Activity: Nov 24, 2024
                </Typography>
              </Stack>
            </TableCell>
          </TableRow>
        );
      });
  }, [members]);

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
      <DisplayBox id="householdBox" headerIcon="group" headerText={(household?.name || "") + Locale.label("people.household.house")} editFunction={getEditFunction()} ariaLabel="editHousehold">
        {getTable()}
      </DisplayBox>
    );
  } else return <HouseholdEdit household={household} currentMembers={members} updatedFunction={handleUpdate} currentPerson={props.person} />;
});
