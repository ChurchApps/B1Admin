import React from "react";
import { Box, Stack, TextField, Button, Typography } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type CommerceEventInterface, type RegistrationTypeInterface } from "../registrationCommerce";
import { useEditableRowList, toNum } from "./useEditableRowList";

interface Props {
  event: CommerceEventInterface;
}

export const RegistrationTypesEdit: React.FC<Props> = ({ event }) => {
  const { rows, saving, update, addRow, removeRow, save } = useEditableRowList<RegistrationTypeInterface>({
    loadUrl: `/registrations/types/event/${event.id}?churchId=${event.churchId}`,
    saveUrl: "/registrations/types",
    deleteUrlPrefix: "/registrations/types/",
    api: "ContentApi",
    enabled: !!event.id,
    sortBy: "sort",
    newRow: (current) => ({ name: "", price: null, capacity: null, sort: current.length + 1, active: true }),
    filter: (r) => !!(r.name || "").trim(),
    coerce: (r) => ({ ...r, eventId: event.id, price: toNum(r.price), capacity: toNum(r.capacity), sort: toNum(r.sort) })
  });

  return (
    <Stack spacing={1.5}>
      {rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">{Locale.label("registrations.commerce.noTypes")}</Typography>
      )}
      {rows.map((row, i) => (
        <Box key={row.id || i} data-testid="registration-type-row" sx={{ p: 1, border: "1px solid", borderColor: "grey.200", borderRadius: 1 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
            <TextField label={Locale.label("registrations.commerce.name")} size="small" value={row.name || ""} onChange={(e) => update(i, "name", e.target.value)} data-testid="type-name" sx={{ flex: "1 1 140px" }} />
            <TextField label={Locale.label("registrations.commerce.price")} type="number" size="small" value={row.price ?? ""} onChange={(e) => update(i, "price", e.target.value)} data-testid="type-price" sx={{ flex: "1 1 90px" }} />
            <TextField label={Locale.label("registrations.commerce.capacity")} type="number" size="small" value={row.capacity ?? ""} onChange={(e) => update(i, "capacity", e.target.value)} data-testid="type-capacity" sx={{ flex: "1 1 90px" }} />
            <TextField label={Locale.label("registrations.commerce.sort")} type="number" size="small" value={row.sort ?? ""} onChange={(e) => update(i, "sort", e.target.value)} data-testid="type-sort" sx={{ flex: "0 1 70px" }} />
            <AppIconButton intent="remove" label={Locale.label("common.delete")} icon={<DeleteIcon />} onClick={() => removeRow(i)} />
          </Stack>
        </Box>
      ))}
      <Stack direction="row" spacing={1}>
        <Button size="small" startIcon={<AddIcon />} onClick={addRow} data-testid="add-registration-type">{Locale.label("registrations.commerce.addType")}</Button>
        <Button size="small" variant="contained" onClick={save} disabled={saving} data-testid="save-registration-types">{saving ? Locale.label("common.saving") : Locale.label("common.save")}</Button>
      </Stack>
    </Stack>
  );
};
