import React, { useEffect } from "react";
import { ApiHelper, InputBox, Locale } from "@churchapps/apphelper";
import { type SongDetailLinkInterface } from "../../../helpers";
import {
  FormControl, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, type SelectChangeEvent, Stack, Typography, Box, IconButton 
} from "@mui/material";
import { Link as LinkIcon, Done as DoneIcon, Add as AddIcon } from "@mui/icons-material";

interface Props {
  songDetailId: string;
  reload: () => void;
}

export const SongDetailLinksEdit = (props: Props) => {
  const [songDetailLinks, setSongDetailLinks] = React.useState<SongDetailLinkInterface[]>([]);
  const [editLink, setEditLink] = React.useState<SongDetailLinkInterface>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const l = { ...editLink };
    switch (e.target.name) {
      case "serviceKey":
        l.serviceKey = e.target.value;
        break;
      case "service":
        l.service = e.target.value;
        break;
    }
    setEditLink(l);
  };

  const loadData = () => {
    if (props.songDetailId) {
      ApiHelper.get("/songDetailLinks/songDetail/" + props.songDetailId, "ContentApi").then((data) => {
        setSongDetailLinks(data);
      });
    }
  };
  useEffect(() => {
    loadData();
  }, [props.songDetailId]); // eslint-disable-line react-hooks/exhaustive-deps

  const getPlaceholder = (link: SongDetailLinkInterface) => {
    let result = "";
    switch (link.service) {
      case "Apple":
        result = "10-000-reasons-bless-the-lord-10th-anniversary-feat/1618341399";
        break;
      case "CCLI":
        result = "6016351";
        break;
      case "Genius":
        result = "Matt-redman-10000-reasons-bless-the-lord-lyrics";
        break;
      case "Hymnary":
        result = "https://hymnary.org/text/" + link.serviceKey;
        break;
      case "MusicBrainz":
        result = "https://musicbrainz.org/recording/" + link.serviceKey;
        break;
      case "Spotify":
        result = "2I9pjIezpupeJfVM1r9ZIm";
        break;
      case "YouTube":
        result = "XtwIT8JjddM";
        break;
    }
    return result;
  };

  const determineUrl = (link: SongDetailLinkInterface) => {
    let result = "";
    switch (link.service) {
      case "Apple":
        result = "https://music.apple.com/us/album/" + link.serviceKey;
        break;
      case "CCLI":
        result = "https://songselect.ccli.com/Songs/" + link.serviceKey;
        break;
      case "Genius":
        result = "https://genius.com/" + link.serviceKey;
        break;
      case "Hymnary":
        result = "https://hymnary.org/text/" + link.serviceKey;
        break;
      case "MusicBrainz":
        result = "https://musicbrainz.org/recording/" + link.serviceKey;
        break;
      case "Spotify":
        result = "https://open.spotify.com/track/" + link.serviceKey;
        break;
      case "YouTube":
        result = "https://www.youtube.com/watch?v=" + link.serviceKey;
        break;
    }
    return result;
  };

  const handleAdd = () => {
    setEditLink({ songDetailId: props.songDetailId, service: "Apple" });
  };

  const handleDelete = () => {
    ApiHelper.delete("/songDetailLinks/" + editLink.id, "ContentApi").then(() => {
      loadData();
      setEditLink(null);
    });
  };

  const handleSave = () => {
    const l = { ...editLink };
    l.url = determineUrl(l);

    ApiHelper.post("/songDetailLinks", [l], "ContentApi").then(() => {
      loadData();
      setEditLink(null);
      if (l.service === "MusicBrainz") props.reload();
    });
  };

  const getRow = (link: SongDetailLinkInterface) => (
    <TableRow>
      <TableCell>
        <button
          type="button"
          onClick={() => setEditLink(link)}
          style={{ background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer" }}>
          {link.service}
        </button>
      </TableCell>
      <TableCell>{link.serviceKey}</TableCell>
    </TableRow>
  );

  if (editLink) {
    return (
      <InputBox
        headerText={Locale.label("plans.songs.links")}
        headerIcon="link"
        cancelFunction={() => {
          setEditLink(null);
        }}
        saveFunction={handleSave}
        deleteFunction={editLink.id ? handleDelete : null}>
        <FormControl fullWidth size="small">
          <InputLabel>Service</InputLabel>
          <Select size="small" name="service" label="Service" value={editLink.service} onChange={handleChange}>
            <MenuItem value="Apple">Apple</MenuItem>
            <MenuItem value="CCLI">CCLI</MenuItem>
            <MenuItem value="Genius">Genius</MenuItem>
            <MenuItem value="Hymnary">Hymnary</MenuItem>
            <MenuItem value="MusicBrainz">MusicBrainz</MenuItem>
            <MenuItem value="Spotify">Spotify</MenuItem>
            <MenuItem value="YouTube">YouTube</MenuItem>
          </Select>
        </FormControl>
        <TextField size="small" name="serviceKey" placeholder={getPlaceholder(editLink)} fullWidth label="Id" value={editLink.serviceKey} onChange={handleChange} />
      </InputBox>
    );
  } else {
    return (
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <LinkIcon sx={{ color: "primary.main", fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
              External Links
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <IconButton
              onClick={handleAdd}
              size="small"
              sx={{
                color: "primary.main",
                "&:hover": { backgroundColor: "primary.light" },
              }}>
              <AddIcon fontSize="small" />
            </IconButton>
            <IconButton
              onClick={props.reload}
              size="small"
              sx={{
                color: "success.main",
                "&:hover": { backgroundColor: "success.light" },
              }}>
              <DoneIcon fontSize="small" />
            </IconButton>
          </Stack>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Service</TableCell>
              <TableCell>Key</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{songDetailLinks?.map((sd) => getRow(sd))}</TableBody>
        </Table>
      </Box>
    );
  }
};
