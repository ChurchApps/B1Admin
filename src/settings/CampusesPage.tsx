import React from "react";
import { type CampusInterface } from "./components/CampusInterface";
import { ApiHelper, UserHelper, Permissions, Locale, Loading, PageHeader, SmallButton } from "@churchapps/apphelper";
import { Box, Card, Grid, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Business as BusinessIcon } from "@mui/icons-material";
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

  const rows = (campuses.data || []).map((c) => {
    const location = [c.city, c.state].filter(Boolean).join(", ");
    return (
      <TableRow key={c.id} sx={{ cursor: "pointer" }} hover onClick={() => setEditCampus(c)} data-testid={`campus-row-${c.id}`}>
        <TableCell>{c.name}</TableCell>
        <TableCell>{location}</TableCell>
        <TableCell>{c.timezone}</TableCell>
      </TableRow>
    );
  });

  return (
    <>
      <PageHeader title={Locale.label("settings.campuses.campuses")} subtitle={Locale.label("settings.campuses.subtitle")}>
        <SmallButton icon="add" text={Locale.label("settings.campuses.addCampus")} onClick={() => setEditCampus({})} data-testid="add-campus-button" />
      </PageHeader>

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: editCampus ? 8 : 12 }}>
            <Card>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
                <BusinessIcon />
                <Typography variant="h6">{Locale.label("settings.campuses.campuses")}</Typography>
              </Box>
              {rows.length > 0 ? (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{Locale.label("settings.campusEdit.name")}</TableCell>
                      <TableCell>{Locale.label("settings.campuses.location")}</TableCell>
                      <TableCell>{Locale.label("settings.campusEdit.timezone")}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>{rows}</TableBody>
                </Table>
              ) : (
                <Box sx={{ p: 3 }}>
                  <Typography color="text.secondary">{Locale.label("settings.campuses.none")}</Typography>
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
