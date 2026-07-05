import React from "react";
import { Box, Stack, TextField, Button, Typography } from "@mui/material";
import { Add as AddIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type CommerceEventInterface, type RegistrationSelectionInterface } from "../registrationCommerce";
import { useEditableRowList, toNum } from "./useEditableRowList";

interface Props {
  event: CommerceEventInterface;
}

export const RegistrationSelectionsEdit: React.FC<Props> = ({ event }) => {
  const { rows, saving, update, addRow, removeRow, save } = useEditableRowList<RegistrationSelectionInterface>({
    loadUrl: `/registrations/selections/event/${event.id}?churchId=${event.churchId}`,
    saveUrl: "/registrations/selections",
    deleteUrlPrefix: "/registrations/selections/",
    api: "ContentApi",
    enabled: !!event.id,
    sortBy: "sort",
    newRow: (current) => ({ name: "", description: "", price: null, capacity: null, maxQuantity: null, sort: current.length + 1, active: true }),
    filter: (r) => !!(r.name || "").trim(),
    coerce: (r) => ({ ...r, eventId: event.id, price: toNum(r.price), capacity: toNum(r.capacity), maxQuantity: toNum(r.maxQuantity), sort: toNum(r.sort) })
  });

  return (
    <Stack spacing={1.5}>
      {rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">{Locale.label("registrations.commerce.noSelections")}</Typography>
      )}
      {rows.map((row, i) => (
        <Box key={row.id || i} data-testid="registration-selection-row" sx={{ p: 1, border: "1px solid", borderColor: "grey.200", borderRadius: 1 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center" useFlexGap>
              <TextField label={Locale.label("registrations.commerce.name")} size="small" value={row.name || ""} onChange={(e) => update(i, "name", e.target.value)} data-testid="selection-name" sx={{ flex: "1 1 140px" }} />
              <TextField label={Locale.label("registrations.commerce.price")} type="number" size="small" value={row.price ?? ""} onChange={(e) => update(i, "price", e.target.value)} data-testid="selection-price" sx={{ flex: "1 1 90px" }} />
              <AppIconButton intent="remove" label={Locale.label("common.delete")} icon={<DeleteIcon />} onClick={() => removeRow(i)} />
            </Stack>
            <TextField label={Locale.label("registrations.commerce.description")} size="small" fullWidth value={row.description || ""} onChange={(e) => update(i, "description", e.target.value)} data-testid="selection-description" />
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <TextField label={Locale.label("registrations.commerce.capacity")} type="number" size="small" value={row.capacity ?? ""} onChange={(e) => update(i, "capacity", e.target.value)} data-testid="selection-capacity" sx={{ flex: "1 1 90px" }} />
              <TextField label={Locale.label("registrations.commerce.maxQuantity")} type="number" size="small" value={row.maxQuantity ?? ""} onChange={(e) => update(i, "maxQuantity", e.target.value)} data-testid="selection-max-quantity" sx={{ flex: "1 1 90px" }} />
            </Stack>
          </Stack>
        </Box>
      ))}
      <Stack direction="row" spacing={1}>
        <Button size="small" startIcon={<AddIcon />} onClick={addRow} data-testid="add-registration-selection">{Locale.label("registrations.commerce.addSelection")}</Button>
        <Button size="small" variant="contained" onClick={save} disabled={saving} data-testid="save-registration-selections">{saving ? Locale.label("common.saving") : Locale.label("common.save")}</Button>
      </Stack>
    </Stack>
  );
};
