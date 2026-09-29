import React from "react";
import { type CampusInterface } from "./CampusInterface";
import { Locale, Loading } from "@churchapps/apphelper";
import { Box, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Business as BusinessIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { AddBar, SectionListCard, TextAction, clickableRowSx, tableScrollSx } from "../../components/ui";
import { CampusEdit } from "./CampusEdit";

// Campus management (list + inline editor). Shared by the Settings landing's
// Campuses section and the standalone /settings/campuses page.
export const CampusesSection: React.FC = () => {
  const [editCampus, setEditCampus] = React.useState<CampusInterface | null>(null);

  const campuses = useQuery<CampusInterface[]>({
    queryKey: ["/campuses", "MembershipApi"],
    placeholderData: []
  });

  const handleUpdated = () => {
    setEditCampus(null);
    campuses.refetch();
  };

  if (campuses.isLoading) return <Loading />;

  const data = campuses.data || [];
  const selectedCampus = editCampus?.id ? (data.find((c) => c.id === editCampus.id) ?? editCampus) : editCampus;

  const rows = data.map((c) => {
    const location = [c.city, c.state].filter(Boolean).join(", ");
    return (
      <TableRow
        key={c.id}
        sx={clickableRowSx}
        hover
        onClick={() => setEditCampus(c)}
        data-testid={`campus-row-${c.id}`}>
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <BusinessIcon sx={{ color: "text.secondary", fontSize: 20 }} />
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
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: editCampus ? 7 : 12 }}>
        <SectionListCard
          icon={<BusinessIcon />}
          title={Locale.label("settings.campuses.campuses")}
          count={data.length}
          empty={{ icon: <BusinessIcon />, title: Locale.label("settings.campuses.none") }}>
          <Box sx={tableScrollSx} role="region" aria-label={Locale.label("settings.campuses.campuses")} tabIndex={0}>
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
          </Box>
        </SectionListCard>
        <AddBar>
          <Box component="span" data-testid={data.length === 0 ? "add-campus-button-empty" : undefined}>
            <TextAction onClick={() => setEditCampus({})} data-testid="add-campus-button">{Locale.label("settings.campuses.addCampus")}</TextAction>
          </Box>
        </AddBar>
      </Grid>
      {selectedCampus && (
        <Grid size={{ xs: 12, md: 5 }}>
          <CampusEdit campus={selectedCampus} updatedFunction={handleUpdated} />
        </Grid>
      )}
    </Grid>
  );
};
