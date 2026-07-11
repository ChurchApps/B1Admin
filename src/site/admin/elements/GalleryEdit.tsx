import React, { useState } from "react";
import type { SelectChangeEvent } from "@mui/material";
import { Box, Button, FormControl, Grid, Icon, IconButton, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { GalleryModal } from "../../../components/gallery";

type Photo = { url: string; alt?: string; caption?: string };

type Props = {
  parsedData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => void;
  handleHtmlChange: (field: string, newValue: any) => void;
};

export function GalleryEdit({ parsedData, handleChange, handleHtmlChange }: Props) {
  const photos: Photo[] = Array.isArray(parsedData.photos) ? parsedData.photos : [];
  const [pickIndex, setPickIndex] = useState<number | null>(null);

  const updatePhoto = (index: number, field: keyof Photo, value: string) => {
    const next = photos.map((p, i) => (i === index ? { ...p, [field]: value } : p));
    handleHtmlChange("photos", next);
  };

  const addPhoto = () => handleHtmlChange("photos", [...photos, { url: "" }]);
  const removePhoto = (index: number) => handleHtmlChange("photos", photos.filter((_, i) => i !== index));
  const onSelectImage = (image: string) => {
    if (pickIndex !== null) updatePhoto(pickIndex, "url", image);
    setPickIndex(null);
  };

  return (
    <>
      <FormControl fullWidth size="small">
        <InputLabel>{Locale.label("site.galleryEdit.layout")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.galleryEdit.layout")} name="layout" value={parsedData.layout || "grid"} onChange={handleChange} data-testid="gallery-layout-select">
          <MenuItem value="grid">{Locale.label("site.galleryEdit.grid")}</MenuItem>
          <MenuItem value="masonry">{Locale.label("site.galleryEdit.masonry")}</MenuItem>
          <MenuItem value="square">{Locale.label("site.galleryEdit.square")}</MenuItem>
          <MenuItem value="wide">{Locale.label("site.galleryEdit.wide")}</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth size="small">
        <InputLabel>{Locale.label("site.galleryEdit.columns")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.galleryEdit.columns")} name="columns" value={(parsedData.columns ?? 3).toString()} onChange={handleChange} data-testid="gallery-columns-select">
          <MenuItem value="2">2</MenuItem>
          <MenuItem value="3">3</MenuItem>
          <MenuItem value="4">4</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth size="small">
        <InputLabel>{Locale.label("site.galleryEdit.spacing")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.galleryEdit.spacing")} name="spacing" value={parsedData.spacing || "medium"} onChange={handleChange} data-testid="gallery-spacing-select">
          <MenuItem value="small">{Locale.label("site.galleryEdit.small")}</MenuItem>
          <MenuItem value="medium">{Locale.label("site.galleryEdit.medium")}</MenuItem>
          <MenuItem value="large">{Locale.label("site.galleryEdit.large")}</MenuItem>
        </Select>
      </FormControl>
      <Typography variant="subtitle2" sx={{ mt: 1 }}>{Locale.label("site.galleryEdit.photos")}</Typography>
      {photos.length === 0 && <Typography variant="body2" color="text.secondary">{Locale.label("site.galleryEdit.noPhotos")}</Typography>}
      {photos.map((photo, index) => (
        <Box key={index} sx={{ border: "1px solid var(--border-light)", borderRadius: 1, p: 1, mb: 1 }} data-testid={`gallery-photo-${index}`}>
          <Grid container spacing={1} alignItems="center">
            <Grid size={{ xs: 3 }}>
              {photo.url
                ? <img src={photo.url} style={{ maxHeight: 48, maxWidth: "100%", width: "auto", display: "block" }} alt={photo.alt || ""} />
                : <Box sx={{ height: 48, background: "var(--bg-sub)", borderRadius: 1 }} />}
            </Grid>
            <Grid size={{ xs: 7 }}>
              <Button size="small" variant="outlined" onClick={() => setPickIndex(index)} data-testid={`gallery-select-image-${index}`}>{Locale.label("site.galleryEdit.selectImage")}</Button>
            </Grid>
            <Grid size={{ xs: 2 }}>
              <IconButton size="small" onClick={() => removePhoto(index)} aria-label={Locale.label("site.galleryEdit.removePhoto")} data-testid={`gallery-remove-photo-${index}`}><Icon>delete</Icon></IconButton>
            </Grid>
          </Grid>
          <TextField fullWidth size="small" sx={{ mt: 1 }} label={Locale.label("site.galleryEdit.imageUrl")} value={photo.url || ""} onChange={(e) => updatePhoto(index, "url", e.target.value)} />
          <TextField fullWidth size="small" sx={{ mt: 1 }} label={Locale.label("site.galleryEdit.altText")} value={photo.alt || ""} onChange={(e) => updatePhoto(index, "alt", e.target.value)} />
          <TextField fullWidth size="small" sx={{ mt: 1 }} label={Locale.label("site.galleryEdit.caption")} value={photo.caption || ""} onChange={(e) => updatePhoto(index, "caption", e.target.value)} />
        </Box>
      ))}
      <Button variant="contained" size="small" startIcon={<Icon>add</Icon>} onClick={addPhoto} data-testid="gallery-add-photo">{Locale.label("site.galleryEdit.addPhoto")}</Button>
      {pickIndex !== null && <GalleryModal onClose={() => setPickIndex(null)} onSelect={onSelectImage} aspectRatio={0} />}
    </>
  );
}
