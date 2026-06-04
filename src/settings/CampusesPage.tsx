import React from "react";
import { type CampusInterface } from "./components/CampusInterface";
import { UserHelper, Permissions, Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { Box, Button, Card, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Business as BusinessIcon, Add as AddIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { PermissionDenied } from "../components";
import { CampusEdit } from "./components";

export const CampusesPage: React.FC = () => {
  const [editCampus, setEditCampus] = React.useState<CampusInterface | null>(null);
  const hasAccess = UserHelper.checkAccess(Permissions.membershipApi.settings.edit);

  const campuses = useQuery<CampusInterface[]>({
    queryKey: ["/campuses", "MembershipApi"],
    placeholderData: [],
    enabled: hasAccess
  });

  const handleUpdated = () => {
    setEditCampus(null);
    campuses.refetch();
  };

  if (!hasAccess) return <PermissionDenied permissions={[Permissions.membershipApi.settings.edit]} />;
  if (campuses.isLoading) return <Loading />;

  const data = campuses.data || [];

  const rows = data.map((c) => {
    const location = [c.city, c.state].filter(Boolean).join(", ");
    return (
      <TableRow
        key={c.id}
        sx={{ cursor: "pointer", "&:hover": { backgroundColor: "action.hover" }, transition: "background-color 0.2s ease" }}
        hover
        onClick={() => setEditCampus(c)}
        data-testid={`campus-row-${c.id}`}>
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <BusinessIcon sx={{ color: "primary.light", fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>{c.name}</Typography>
          </Stack>
        </TableCell>
        <TableCell>
          <Typography variant="body2" color={location ? "text.primary" : "text.secondary"}>{location || "—"}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2" color={c.timezone ? "text.primary" : "text.secondary"}>{c.timezone || "—"}</Typography>
        </TableCell>
      </TableRow>
    );
  });

  return (
    <>
      <PageHeader title={Locale.label("settings.campuses.campuses")} subtitle={Locale.label("settings.campuses.subtitle")}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => setEditCampus({})}
          data-testid="add-campus-button"
          sx={{
            color: "#FFF",
            borderColor: "rgba(255,255,255,0.5)",
            "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" }
          }}>
          {Locale.label("settings.campuses.addCampus")}
        </Button>
      </PageHeader>

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: editCampus ? 8 : 12 }}>
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <BusinessIcon sx={{ color: "primary.main" }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>{Locale.label("settings.campuses.campuses")}</Typography>
                </Stack>
              </Box>
              {rows.length > 0 ? (
                <Table>
                  <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 600 }}>{Locale.label("settings.campusEdit.name")}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{Locale.label("settings.campuses.location")}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{Locale.label("settings.campusEdit.timezone")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>{rows}</TableBody>
                </Table>
              ) : (
                <Box sx={{ p: 5, textAlign: "center" }}>
                  <BusinessIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
                  <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("settings.campuses.none")}</Typography>
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setEditCampus({})} data-testid="add-campus-button-empty">
                    {Locale.label("settings.campuses.addCampus")}
                  </Button>
                </Box>
              )}
            </Card>
          </Grid>
          {editCampus && (
            <Grid size={{ xs: 12, md: 4 }}>
              <CampusEdit campus={editCampus} updatedFunction={handleUpdated} />
            </Grid>
          )}
        </Grid>
      </Box>
    </>
  );
};
