import { ArrayHelper, Locale } from "@churchapps/apphelper";
import { DialogContent, FormControl, Grid, InputLabel, MenuItem, Pagination, Select, type SelectChangeEvent, TextField, Table, TableBody, TableCell, TableHead, TableRow, Typography, Box } from "@mui/material";
import { clickableRowSx } from "../../components/ui";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import { useState, useEffect } from "react";
import WebFont from "webfontloader";

interface Props {
  updateValue: (font: string) => void;
  onClose: () => void;
}

export function CustomFontModal(props: Props) {
  const [fonts, setFonts] = useState<{ category: string; family: string }[]>([]);
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const val = e.target.value;
    switch (e.target.name) {
      case "category": setCategory(val); break;
      case "search": setSearch(val); break;
    }
    setPage(1);
  };

  const loadData = () => {
    const key = atob("QUl6YVN5RDlxTkViWDdIQzhvYXZGaC0tR0JrdkxVVkRUSnM4dlZB");
    fetch("https://www.googleapis.com/webfonts/v1/webfonts?sort=popularity&key=" + key)
      .then((response: any) => response.json())
      .then((data: any) => {
        const result: { category: string; family: string }[] = [];
        data.items.forEach((item: any) => { result.push({ family: item.family, category: item.category }); });
        setFonts(result);
      });
  };

  const loadFonts = (fontList: { category: string; family: string }[]) => {
    const fonts: string[] = [];
    fontList.forEach((f: any) => fonts.push(f.family));
    if (fonts.length > 0) WebFont.load({ google: { families: fonts } });
  };

  const getFiltered = () => {
    let filtered: { category: string; family: string }[] = [...fonts];
    if (category) filtered = ArrayHelper.getAll(filtered, "category", category);
    if (search) filtered = filtered.filter((font: any) => font.family.toLowerCase().includes(search.toLowerCase()));
    return filtered;
  };

  const getPages = () => {
    const filtered = getFiltered();
    const pages = Math.ceil(filtered.length / 10);
    return <Pagination count={pages} page={page} onChange={(_, p) => setPage(p)} />;
  };

  const getResults = () => {
    if (fonts) {
      const filtered = getFiltered();
      const start = (page - 1) * 10;
      let num = 10;
      if (start + num > filtered.length) num = filtered.length - start;
      const pageResults = filtered.slice((page - 1) * 10, start + num);
      loadFonts(pageResults);

      return (
        <Table sx={{ minWidth: 650, minHeight: 400 }}>
          <TableHead>
            <TableRow>
              <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("site.customFontModal.name")}</Typography></TableCell>
              <TableCell><Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("site.customFontModal.sample")}</Typography></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageResults.map((f, index) => (
              <TableRow key={index} sx={clickableRowSx} onClick={() => props.updateValue(f.family)}>
                <TableCell><Typography variant="body2" sx={{ color: "primary.main", fontWeight: 500 }}>{f.family}</Typography></TableCell>
                <TableCell><Typography variant="body2" sx={{ fontFamily: f.family, color: "text.secondary" }}>{Locale.label("site.customFontModal.sampleText")}</Typography></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      );
    }
  };

  useEffect(loadData, []);

  return (
    <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="md" scroll="body" PaperProps={{ sx: { borderRadius: 2, minHeight: "70vh" } }}>
      <DialogTitle sx={{ backgroundColor: "primary.light", color: "primary.contrastText", borderRadius: "8px 8px 0 0" }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{Locale.label("site.customFontModal.selectFont")}</Typography>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Box sx={{ mb: 3 }}>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 8 }}>
              <FormControl fullWidth>
                <InputLabel>{Locale.label("site.customFontModal.categoryFilter")}</InputLabel>
                <Select fullWidth label={Locale.label("site.customFontModal.categoryFilter")} name="category" value={category} onChange={handleChange}>
                  <MenuItem value="">{Locale.label("site.customFontModal.all")}</MenuItem>
                  <MenuItem value="serif">{Locale.label("site.customFontModal.serif")}</MenuItem>
                  <MenuItem value="sans-serif">{Locale.label("site.customFontModal.sansSerif")}</MenuItem>
                  <MenuItem value="display">{Locale.label("site.customFontModal.display")}</MenuItem>
                  <MenuItem value="handwriting">{Locale.label("site.customFontModal.handwriting")}</MenuItem>
                  <MenuItem value="monospace">{Locale.label("site.customFontModal.monospace")}</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField fullWidth label={Locale.label("site.customFontModal.search")} name="search" value={search} onChange={handleChange} placeholder={Locale.label("placeholders.font.search")} />
            </Grid>
          </Grid>
        </Box>

        <Box sx={{ mb: 3 }}>{getResults()}</Box>

        <Box sx={{ display: "flex", justifyContent: "center" }}>{getPages()}</Box>
      </DialogContent>
    </Dialog>
  );
}
