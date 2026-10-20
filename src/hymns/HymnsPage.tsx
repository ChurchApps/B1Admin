import React from "react";
import { ApiHelper, Loading, PageHeader, Permissions, UserHelper } from "@churchapps/apphelper";
import type { HymnInterface, HymnVerseInterface } from "@churchapps/helpers";
import { Add as AddIcon, MenuBook as HymnsIcon, Archive as ArchiveIcon, Edit as EditIcon, Publish as PublishIcon } from "@mui/icons-material";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { useRequirePermission } from "../hooks";

const emptyHymn = (): HymnInterface => ({
  number: 1,
  title: "",
  language: "English",
  verses: [{ order: 1, text: "" }],
  chorus: "",
  category: "",
  published: false,
  archived: false
});

const HymnEdit = ({ hymn, onClose, onSaved }: { hymn: HymnInterface; onClose: () => void; onSaved: () => void }) => {
  const [value, setValue] = React.useState<HymnInterface>({ ...hymn, verses: hymn.verses?.length ? hymn.verses.map((verse) => ({ ...verse })) : [{ order: 1, text: "" }] });
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const update = (field: keyof HymnInterface, fieldValue: unknown) => setValue((current) => ({ ...current, [field]: fieldValue }));
  const updateVerse = (index: number, field: keyof HymnVerseInterface, fieldValue: unknown) => setValue((current) => ({
    ...current,
    verses: (current.verses || []).map((verse, verseIndex) => (
      verseIndex === index ? { ...verse, [field]: fieldValue } : verse
    ))
  }));
  const addVerse = () => setValue((current) => ({ ...current, verses: [...(current.verses || []), { order: (current.verses?.length || 0) + 1, text: "" }] }));
  const removeVerse = (index: number) => setValue((current) => ({ ...current, verses: (current.verses || []).filter((_, verseIndex) => verseIndex !== index).map((verse, verseIndex) => ({ ...verse, order: verseIndex + 1 })) }));
  const save = async () => {
    if (!Number.isInteger(value.number) || value.number < 1) { setError("Enter a whole hymn number greater than zero."); return; }
    if (!value.title?.trim()) { setError("Enter a hymn title."); return; }
    if (!value.verses?.length || value.verses.some((verse) => !verse.text?.trim())) { setError("Add at least one verse and enter its text."); return; }
    setSaving(true);
    setError("");
    try {
      await ApiHelper.post("/hymns", [{ ...value, verses: (value.verses || []).map((verse, index) => ({ ...verse, order: index + 1 })) }], "ContentApi");
      onSaved();
    } catch {
      setError("The hymn could not be saved.");
    } finally {
      setSaving(false);
    }
  };
  const field = (label: string, key: keyof HymnInterface) => <TextField label={label} value={(value[key] as string | number | undefined) ?? ""} onChange={(event) => update(key, key === "number" ? Number(event.target.value) : event.target.value)} type={key === "number" ? "number" : "text"} inputProps={key === "number" ? { min: 1, step: 1 } : undefined} required={key === "number" || key === "title"} fullWidth />;
  return <Dialog open fullWidth maxWidth="md" onClose={onClose}>
    <DialogTitle>{value.id ? "Edit hymn" : "New hymn"}</DialogTitle>
    <DialogContent>
      <Stack spacing={2} sx={{ pt: 1 }}>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>{field("Hymn number", "number")}{field("Title", "title")}</Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <FormControl fullWidth>
            <InputLabel id="hymn-language-label">Language</InputLabel>
            <Select labelId="hymn-language-label" label="Language" value={value.language || "English"} onChange={(event) => update("language", event.target.value)}>
              <MenuItem value="English">English</MenuItem><MenuItem value="Yoruba">Yoruba</MenuItem><MenuItem value="Bilingual">Bilingual</MenuItem>
            </Select>
          </FormControl>
          {field("Category", "category")}
        </Stack>
        {(value.verses || []).map((verse, index) => <Stack direction={{ xs: "column", sm: "row" }} spacing={1} key={index} alignItems="flex-start"><TextField label={`Verse ${index + 1} label`} value={verse.label || ""} onChange={(event) => updateVerse(index, "label", event.target.value)} sx={{ minWidth: { sm: 180 } }} /><TextField label="Verse text" value={verse.text} onChange={(event) => updateVerse(index, "text", event.target.value)} required multiline minRows={3} fullWidth /><Button color="error" onClick={() => removeVerse(index)}>Remove</Button></Stack>)}
        <Button onClick={addVerse} startIcon={<AddIcon />}>Add verse</Button>
        {field("Chorus / refrain", "chorus")}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>{field("Author", "author")}{field("Composer", "composer")}</Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>{field("Translator", "translator")}{field("Tune", "tune")}</Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>{field("Source", "source")}{field("Copyright", "copyright")}</Stack>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>{field("License", "license")}{field("Attribution", "attribution")}</Stack>
      </Stack>
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={save} disabled={saving}>{saving ? "Saving..." : "Save"}</Button></DialogActions>
  </Dialog>;
};

export const HymnsPage = () => {
  const denied = useRequirePermission(Permissions.contentApi.content.edit);
  const [hymns, setHymns] = React.useState<HymnInterface[]>([]);
  const [editing, setEditing] = React.useState<HymnInterface | null>(null);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const churchId = UserHelper.currentUserChurch?.church?.id;
  const load = React.useCallback(async () => {
    if (!churchId) return;
    setLoading(true);
    try { setHymns(await ApiHelper.get("/hymns", "ContentApi")); } catch { setError("The hymns could not be loaded."); } finally { setLoading(false); }
  }, [churchId]);
  React.useEffect(() => { load(); }, [load]);
  if (denied) return denied;
  if (loading) return <Loading />;
  const filtered = hymns.filter((hymn) => `${hymn.number} ${hymn.title} ${hymn.category}`.toLowerCase().includes(search.toLowerCase()));
  const setPublished = async (hymn: HymnInterface) => { await ApiHelper.post(`/hymns/${hymn.id}/${hymn.published ? "unpublish" : "publish"}`, {}, "ContentApi"); load(); };
  const archive = async (hymn: HymnInterface) => { await ApiHelper.delete(`/hymns/${hymn.id}`, "ContentApi"); load(); };
  return <>
    <PageHeader icon={<HymnsIcon />} title="Hymns" subtitle="Manage your church's hymn collection"><Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditing(emptyHymn())}>Add hymn</Button></PageHeader>
    <Box sx={{ p: 3 }}>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TextField label="Search hymns" value={search} onChange={(event) => setSearch(event.target.value)} sx={{ mb: 2, minWidth: 300 }} />
      <Table><TableHead><TableRow><TableCell>Number</TableCell><TableCell>Title</TableCell><TableCell>Language</TableCell><TableCell>Category</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead><TableBody>{filtered.map((hymn) => <TableRow key={hymn.id}><TableCell>{hymn.number}</TableCell><TableCell>{hymn.title}</TableCell><TableCell>{hymn.language}</TableCell><TableCell>{hymn.category}</TableCell><TableCell>{hymn.archived ? "Archived" : hymn.published ? "Published" : "Draft"}</TableCell><TableCell align="right"><IconButton aria-label="Edit hymn" onClick={() => setEditing(hymn)}><EditIcon /></IconButton><IconButton aria-label={hymn.published ? "Unpublish hymn" : "Publish hymn"} onClick={() => setPublished(hymn)}><PublishIcon /></IconButton><IconButton aria-label="Archive hymn" onClick={() => archive(hymn)}><ArchiveIcon /></IconButton></TableCell></TableRow>)}</TableBody></Table>
      {!filtered.length && <Typography sx={{ p: 4 }} color="text.secondary">No hymns found.</Typography>}
    </Box>
    {editing && <HymnEdit hymn={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
  </>;
};
