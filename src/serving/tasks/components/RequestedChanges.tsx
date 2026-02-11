import React from "react";
import { useNavigate } from "react-router-dom";
import { ApiHelper, DateHelper, Locale, type PersonInterface, type TaskInterface } from "@churchapps/apphelper";
import { Table, TableBody, TableCell, TableHead, TableRow, Card, CardContent, Typography, Stack, Box, Button, Paper, Avatar } from "@mui/material";
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
  const requestedChanges: { field: string; label: string; value: string }[] = JSON.parse(props.task?.data);
  const navigate = useNavigate();

  const getFieldIcon = (field: string) => {
    if (field.includes("name")) return <PersonIcon sx={{ fontSize: 20, color: "primary.main" }} />;
    if (field.includes("email")) return <EmailIcon sx={{ fontSize: 20, color: "info.main" }} />;
    if (field.includes("Phone")) return <PhoneIcon sx={{ fontSize: 20, color: "secondary.main" }} />;
    if (field.includes("address") || field.includes("city") || field.includes("state") || field.includes("zip")) {
      return <AddressIcon sx={{ fontSize: 20, color: "success.main" }} />;
    }
    if (field === "birthDate") return <BirthdayIcon sx={{ fontSize: 20, color: "warning.main" }} />;
    if (field === "familyMember") return <FamilyIcon sx={{ fontSize: 20, color: "error.main" }} />;
    return <ChangesIcon sx={{ fontSize: 20, color: "text.secondary" }} />;
  };

  const getRows = () => {
    const rows: JSX.Element[] = [];
    requestedChanges?.forEach((ch, i) => {
      let val: any = ch.value;
      if (ch.field === "photo") {
        val = (
          <Avatar
            src={ch.value}
            sx={{
              width: 60,
              height: 60,
              border: "2px solid",
              borderColor: "primary.main"
            }}
            alt={Locale.label("tasks.requestedChanges.newProfile")}
          />
        );
      }
      rows.push(
        <TableRow
          key={i}
          sx={{
            "&:hover": { backgroundColor: "action.hover" },
            "& td": { py: 2 }
          }}>
          <TableCell>
            <Stack direction="row" alignItems="center" spacing={1}>
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
    const task: TaskInterface = { ...props.task, status: "Closed", dateClosed: new Date() };
    const person = await ApiHelper.get("/people/" + props.task.associatedWithId, "MembershipApi");
    const p = { ...person } as PersonInterface;
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
        case "birthDate": p.birthDate = DateHelper.toDate(value); break;
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
    <Card
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "grey.200",
        mb: 3,
        transition: "all 0.2s ease-in-out",
        "&:hover": { boxShadow: 2 }
      }}>
      <CardContent>
        <Stack spacing={3}>
          {/* Header */}
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <ChangesIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                {Locale.label("tasks.requestedChanges.requestedChanges")}
              </Typography>
            </Stack>
            {props.task.status !== Locale.label("tasks.taskPage.closed") && (
              <Button
                variant="contained"
                startIcon={<ApplyIcon />}
                onClick={handleApply}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600
                }}>
                {Locale.label("tasks.requestedChanges.apply")}
              </Button>
            )}
          </Box>

          {/* Changes Table */}
          <Paper
            sx={{
              overflow: "hidden",
              border: "1px solid",
              borderColor: "grey.200"
            }}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "grey.50" }}>
                  <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>{Locale.label("tasks.requestedChanges.field")}</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: "text.primary" }}>{Locale.label("tasks.requestedChanges.value")}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>{getRows()}</TableBody>
            </Table>
          </Paper>

          {props.task.status === Locale.label("tasks.taskPage.closed") && (
            <Box
              sx={{
                p: 2,
                backgroundColor: "success.light",
                borderRadius: 1,
                textAlign: "center"
              }}>
              <Typography variant="body2" sx={{ color: "success.dark", fontWeight: 600 }}>
                {Locale.label("tasks.requestedChanges.applied")}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};
