import React from "react";
import { type CampusInterface } from "./CampusInterface";
import { Locale, Loading } from "@churchapps/apphelper";
import { Box, Button, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Business as BusinessIcon, Add as AddIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { clickableRowSx } from "../../components/ui";
import { CampusEdit } from "./CampusEdit";
import { addBarSx, verbSx, SectionLabel } from "../plated";

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
            <BusinessIcon sx={{ color: "primary.main", fontSize: 20 }} />
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
        <SectionLabel sx={{ mt: 0 }}>{Locale.label("settings.campuses.campuses")}</SectionLabel>
        {data.length === 0 ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>{Locale.label("settings.campuses.none")}</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setEditCampus({})} data-testid="add-campus-button-empty">
              {Locale.label("settings.campuses.addCampus")}
            </Button>
          </Box>
        ) : (
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
        )}
        <Box sx={addBarSx}>
          <Box component="button" type="button" onClick={() => setEditCampus({})} data-testid="add-campus-button" sx={verbSx}>
            {Locale.label("settings.campuses.addCampus")}
          </Box>
        </Box>
      </Grid>
      {selectedCampus && (
        <Grid size={{ xs: 12, md: 5 }}>
          <CampusEdit campus={selectedCampus} updatedFunction={handleUpdated} />
        </Grid>
      )}
    </Grid>
  );
};
