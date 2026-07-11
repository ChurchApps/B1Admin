import React, { useState } from "react";
import type { SelectChangeEvent } from "@mui/material";
import { Box, Button, FormControl, Grid, Icon, IconButton, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { Locale } from "@churchapps/apphelper";
import { GalleryModal } from "../../../components/gallery";

type Quote = { text: string; author: string; role?: string; photoUrl?: string };

type Props = {
  parsedData: any;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => void;
  handleHtmlChange: (field: string, newValue: any) => void;
};

export function TestimonialEdit({ parsedData, handleChange, handleHtmlChange }: Props) {
  const quotes: Quote[] = Array.isArray(parsedData.quotes) ? parsedData.quotes : [];
  const [pickIndex, setPickIndex] = useState<number | null>(null);

  const updateQuote = (index: number, field: keyof Quote, value: string) => {
    const next = quotes.map((q, i) => (i === index ? { ...q, [field]: value } : q));
    handleHtmlChange("quotes", next);
  };

  const addQuote = () => handleHtmlChange("quotes", [...quotes, { text: "", author: "" }]);
  const removeQuote = (index: number) => handleHtmlChange("quotes", quotes.filter((_, i) => i !== index));
  const onSelectImage = (image: string) => {
    if (pickIndex !== null) updateQuote(pickIndex, "photoUrl", image);
    setPickIndex(null);
  };

  return (
    <>
      <FormControl fullWidth size="small">
        <InputLabel>{Locale.label("site.testimonialEdit.displayMode")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.testimonialEdit.displayMode")} name="displayMode" value={parsedData.displayMode || "single"} onChange={handleChange} data-testid="testimonial-display-mode-select">
          <MenuItem value="single">{Locale.label("site.testimonialEdit.single")}</MenuItem>
          <MenuItem value="rotate">{Locale.label("site.testimonialEdit.rotate")}</MenuItem>
        </Select>
      </FormControl>
      <Typography variant="subtitle2" sx={{ mt: 1 }}>{Locale.label("site.testimonialEdit.quotes")}</Typography>
      {quotes.length === 0 && <Typography variant="body2" color="text.secondary">{Locale.label("site.testimonialEdit.noQuotes")}</Typography>}
      {quotes.map((quote, index) => (
        <Box key={index} sx={{ border: "1px solid var(--border-light)", borderRadius: 1, p: 1, mb: 1 }} data-testid={`testimonial-quote-${index}`}>
          <Grid container spacing={1} alignItems="center">
            <Grid size={{ xs: 10 }}>
              <Button size="small" variant="outlined" onClick={() => setPickIndex(index)} data-testid={`testimonial-select-photo-${index}`}>{Locale.label("site.testimonialEdit.selectPhoto")}</Button>
              {quote.photoUrl && <img src={quote.photoUrl} style={{ maxHeight: 32, marginLeft: 8, verticalAlign: "middle" }} alt={quote.author || ""} />}
            </Grid>
            <Grid size={{ xs: 2 }}>
              <IconButton size="small" onClick={() => removeQuote(index)} aria-label={Locale.label("site.testimonialEdit.removeQuote")} data-testid={`testimonial-remove-quote-${index}`}><Icon>delete</Icon></IconButton>
            </Grid>
          </Grid>
          <TextField fullWidth size="small" multiline minRows={2} sx={{ mt: 1 }} label={Locale.label("site.testimonialEdit.quoteText")} value={quote.text || ""} onChange={(e) => updateQuote(index, "text", e.target.value)} data-testid={`testimonial-text-${index}`} />
          <TextField fullWidth size="small" sx={{ mt: 1 }} label={Locale.label("site.testimonialEdit.author")} value={quote.author || ""} onChange={(e) => updateQuote(index, "author", e.target.value)} data-testid={`testimonial-author-${index}`} />
          <TextField fullWidth size="small" sx={{ mt: 1 }} label={Locale.label("site.testimonialEdit.role")} value={quote.role || ""} onChange={(e) => updateQuote(index, "role", e.target.value)} />
        </Box>
      ))}
      <Button variant="contained" size="small" startIcon={<Icon>add</Icon>} onClick={addQuote} data-testid="testimonial-add-quote">{Locale.label("site.testimonialEdit.addQuote")}</Button>
      {pickIndex !== null && <GalleryModal onClose={() => setPickIndex(null)} onSelect={onSelectImage} aspectRatio={0} />}
    </>
  );
}
