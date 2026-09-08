import React from "react";
import { type PersonFieldInterface } from "../../helpers/Interfaces";
import { Locale, Loading } from "@churchapps/apphelper";
import { Box, Button, Grid, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { ListAlt as ListAltIcon, Add as AddIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { clickableRowSx } from "../../components/ui";
import { CustomFieldEdit } from "./CustomFieldEdit";
import { addBarSx, verbSx, SectionLabel } from "../plated";

// Custom field definition management (list + inline editor). Shared by the Settings
// landing's Custom Fields section and the standalone /settings/custom-fields page.
export const CustomFieldsSection: React.FC = () => {
  const [editField, setEditField] = React.useState<PersonFieldInterface | null>(null);

  const fields = useQuery<PersonFieldInterface[]>({
    queryKey: ["/personfields", "MembershipApi"],
    placeholderData: []
  });

  const handleUpdated = () => {
    setEditField(null);
    fields.refetch();
  };

  if (fields.isLoading) return <Loading />;

  const data = fields.data || [];

  const rows = data.map((f) => (
    <TableRow
      key={f.id}
      sx={clickableRowSx}
      hover
      onClick={() => setEditField(f)}
      data-testid={`custom-field-row-${f.id}`}>
      <TableCell>
        <Stack direction="row" spacing={1} alignItems="center">
          <ListAltIcon sx={{ color: "primary.main", fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>{f.name}</Typography>
        </Stack>
      </TableCell>
      <TableCell>
        <Typography variant="body2" color="text.secondary">{f.fieldType || "—"}</Typography>
      </TableCell>
    </TableRow>
  ));

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: editField ? 7 : 12 }}>
        <SectionLabel sx={{ mt: 0 }}>{Locale.label("settings.customFields.customFields")}</SectionLabel>
        {data.length === 0 ? (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>{Locale.label("settings.customFields.none")}</Typography>
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setEditField({})} data-testid="add-custom-field-button-empty">
              {Locale.label("settings.customFields.addField")}
            </Button>
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("settings.customFieldEdit.name")}</TableCell>
                <TableCell>{Locale.label("settings.customFieldEdit.fieldType")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>{rows}</TableBody>
          </Table>
        )}
        <Box sx={addBarSx}>
          <Box component="button" type="button" onClick={() => setEditField({})} data-testid="add-custom-field-button" sx={verbSx}>
            {Locale.label("settings.customFields.addField")}
          </Box>
        </Box>
      </Grid>
      {editField && (
        <Grid size={{ xs: 12, md: 5 }}>
          <CustomFieldEdit field={editField} updatedFunction={handleUpdated} />
        </Grid>
      )}
    </Grid>
  );
};
