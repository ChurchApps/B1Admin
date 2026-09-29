import React from "react";
import type { SelectChangeEvent } from "@mui/material";
import { Box, Button, FormControl, Grid, Icon, IconButton, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

type Stat = { value: number; prefix?: string; suffix?: string; label: string };

type Props = {
  parsedData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => void;
  handleHtmlChange: (field: string, newValue: any) => void;
};

export function StatsEdit({ parsedData, handleChange, handleHtmlChange }: Props) {
  const items: Stat[] = Array.isArray(parsedData.items) ? parsedData.items : [];

  const updateItem = (index: number, field: keyof Stat, value: string) => {
    const next = items.map((it, i) => {
      if (i !== index) return it;
      return { ...it, [field]: field === "value" ? Number(value) : value };
    });
    handleHtmlChange("items", next);
  };

  const addItem = () => handleHtmlChange("items", [...items, { value: 0, label: "" }]);
  const removeItem = (index: number) => handleHtmlChange("items", items.filter((_, i) => i !== index));

  return (
    <>
      <FormControl fullWidth size="small">
        <InputLabel>{Locale.label("site.statsEdit.columns")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.statsEdit.columns")} name="columns" value={(parsedData.columns ?? 3).toString()} onChange={handleChange} data-testid="stats-columns-select">
          <MenuItem value="2">2</MenuItem>
          <MenuItem value="3">3</MenuItem>
          <MenuItem value="4">4</MenuItem>
        </Select>
      </FormControl>
      <Typography variant="subtitle2" sx={{ mt: 1 }}>{Locale.label("site.statsEdit.items")}</Typography>
      {items.length === 0 && <Typography variant="body2" color="text.secondary">{Locale.label("site.statsEdit.noItems")}</Typography>}
      {items.map((item, index) => (
        <Box key={index} sx={{ border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-control)", p: 1, mb: 1 }} data-testid={`stats-item-${index}`}>
          <Grid container spacing={1}>
            <Grid size={{ xs: 3 }}>
              <TextField fullWidth size="small" label={Locale.label("site.statsEdit.prefix")} value={item.prefix || ""} onChange={(e) => updateItem(index, "prefix", e.target.value)} />
            </Grid>
            <Grid size={{ xs: 4 }}>
              <TextField fullWidth size="small" type="number" label={Locale.label("site.statsEdit.value")} value={item.value ?? 0} onChange={(e) => updateItem(index, "value", e.target.value)} data-testid={`stats-value-${index}`} />
            </Grid>
            <Grid size={{ xs: 3 }}>
              <TextField fullWidth size="small" label={Locale.label("site.statsEdit.suffix")} value={item.suffix || ""} onChange={(e) => updateItem(index, "suffix", e.target.value)} />
            </Grid>
            <Grid size={{ xs: 2 }}>
              <IconButton size="small" onClick={() => removeItem(index)} aria-label={Locale.label("site.statsEdit.removeItem")} data-testid={`stats-remove-item-${index}`}><Icon>delete</Icon></IconButton>
            </Grid>
          </Grid>
          <TextField fullWidth size="small" sx={{ mt: 1 }} label={Locale.label("site.statsEdit.label")} value={item.label || ""} onChange={(e) => updateItem(index, "label", e.target.value)} data-testid={`stats-label-${index}`} />
        </Box>
      ))}
      <Button variant="contained" size="small" startIcon={<Icon>add</Icon>} onClick={addItem} data-testid="stats-add-item">{Locale.label("site.statsEdit.addItem")}</Button>
    </>
  );
}
