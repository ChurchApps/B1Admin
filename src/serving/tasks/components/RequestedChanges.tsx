import React from "react";
import { useNavigate } from "react-router-dom";
import { ApiHelper, Locale, type PersonInterface } from "@churchapps/apphelper";
import { type TaskInterface } from "@churchapps/helpers";
import { Table, TableBody, TableCell, TableHead, TableRow, Typography, Stack, Box, Button, Avatar } from "@mui/material";
import { CountChip, StatusBadge, Surface, tableScrollSx } from "../../../components/ui";
import {
  AssignmentReturn as ChangesIcon,
  CheckCircle as ApplyIcon,
  Person as PersonIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Home as AddressIcon,
  Cake as BirthdayIcon,
  FamilyRestroom as FamilyIcon
} from "@mui/icons-material";

interface Props {
  task: TaskInterface;
}

export const RequestedChanges = (props: Props) => {
  const requestedChanges: { field: string; label: string; value: string }[] = React.useMemo(() => {
    try {
      const parsed = JSON.parse(props.task?.data || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [props.task?.data]);
  const [applying, setApplying] = React.useState(false);
  const navigate = useNavigate();

  const getFieldIcon = (field: string) => {
    if (field.includes("name")) return <PersonIcon />;
    if (field.includes("email")) return <EmailIcon />;
    if (field.includes("Phone")) return <PhoneIcon />;
    if (field.includes("address") || field.includes("city") || field.includes("state") || field.includes("zip")) {
      return <AddressIcon />;
    }
    if (field === "birthDate") return <BirthdayIcon />;
    if (field === "familyMember") return <FamilyIcon />;
    return <ChangesIcon />;
  };

  const getRows = () => {
    const rows: JSX.Element[] = [];
    requestedChanges?.forEach((ch, i) => {
      let val: any = ch.value;
      if (ch.field === "photo") {
        val = (
          <Avatar
            src={ch.value}
            sx={{ width: 48, height: 48 }}
            alt={Locale.label("tasks.requestedChanges.newProfile")}
          />
        );
      }
      rows.push(
        <TableRow key={i}>
          <TableCell>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ "& .MuiSvgIcon-root": { fontSize: 20, color: "text.secondary" } }}>
              {getFieldIcon(ch.field)}
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {ch.label}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell>
            <Typography variant="body2" color="text.secondary">
              {val}
            </Typography>
          </TableCell>
        </TableRow>
      );
    });
    return rows;
  };

  const handleApply = async () => {
    if (applying || props.task.status === "Closed") return;
    setApplying(true);
    try {
      await applyChanges();
    } finally {
      setApplying(false);
    }
  };

  const applyChanges = async () => {
    const task: TaskInterface = { ...props.task, status: "Closed", dateClosed: new Date() };
    const person = await ApiHelper.get("/people/" + props.task.associatedWithId, "MembershipApi");
    const p = { ...person, name: { ...(person?.name || {}) }, contactInfo: { ...(person?.contactInfo || {}) } } as PersonInterface;
    const peopleArray = [p];

    requestedChanges.forEach((change) => {
      const value = change.value;
      switch (change.field) {
        case "name.first": p.name.first = value; break;
        case "name.middle": p.name.middle = value; break;
        case "name.last": p.name.last = value; break;
        case "photo": {
          p.photo = value;
          const getTime = value.split("?dt=")[1];
          p.photoUpdated = new Date(+getTime);
          break;
        }
        case "birthDate": p.birthDate = value; break;
        case "contactInfo.email": p.contactInfo.email = value; break;
        case "contactInfo.address1": p.contactInfo.address1 = value; break;
        case "contactInfo.address2": p.contactInfo.address2 = value; break;
        case "contactInfo.city": p.contactInfo.city = value; break;
        case "contactInfo.state": p.contactInfo.state = value; break;
        case "contactInfo.zip": p.contactInfo.zip = value; break;
        case "contactInfo.homePhone": p.contactInfo.homePhone = value; break;
        case "contactInfo.mobilePhone": p.contactInfo.mobilePhone = value; break;
        case "contactInfo.workPhone": p.contactInfo.workPhone = value; break;
        case "familyMember": {
          const newPerson: PersonInterface = { name: { first: value, last: p.name.last }, contactInfo: {}, householdId: p.householdId };
          peopleArray.push(newPerson);
        }
      }
    });

    await ApiHelper.post("/people", peopleArray, "MembershipApi");
    await ApiHelper.post("/tasks", [task], "DoingApi");
    navigate("/serving/tasks");
  };

  return (
    <Surface sx={{ mb: 3 }}>
      <Stack spacing={3}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="h3" component="h2">
              {Locale.label("tasks.requestedChanges.requestedChanges")}
            </Typography>
            {(requestedChanges?.length || 0) > 0 && <CountChip count={requestedChanges.length} />}
          </Stack>
          {props.task.status !== "Closed" && (
            <Button
              variant="contained"
              startIcon={<ApplyIcon />}
              onClick={handleApply}
              disabled={applying}>
              {Locale.label("tasks.requestedChanges.apply")}
            </Button>
          )}
        </Stack>

        <Box sx={tableScrollSx} role="region" aria-label={Locale.label("tasks.requestedChanges.requestedChanges")} tabIndex={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("tasks.requestedChanges.field")}</TableCell>
                <TableCell>{Locale.label("tasks.requestedChanges.value")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{getRows()}</TableBody>
          </Table>
        </Box>

        {props.task.status === "Closed" && (
          <StatusBadge tone="success">{Locale.label("tasks.requestedChanges.applied")}</StatusBadge>
        )}
      </Stack>
    </Surface>
  );
};
