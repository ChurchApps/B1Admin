import React, { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { ApiHelper, InputBox, Locale } from "@churchapps/apphelper";
import { type SongDetailLinkInterface } from "../../../helpers";
import { FormControl, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, Stack, Typography, Box } from "@mui/material";
import { Link as LinkIcon, Done as DoneIcon, Add as AddIcon } from "@mui/icons-material";
import { AppIconButton } from "../../../components/ui/AppIconButton";

interface Props {
  songDetailId: string;
  reload: () => void;
}

type AnyRecord = Record<string, any>;

export const SongDetailLinksEdit = (props: Props) => {
  const [songDetailLinks, setSongDetailLinks] = React.useState<SongDetailLinkInterface[]>([]);
  const [editLink, setEditLink] = React.useState<SongDetailLinkInterface>(null);

  const { control, register, handleSubmit, reset, watch } = useForm<AnyRecord>({ defaultValues: { service: "Apple", serviceKey: "" } });
  const watchedService = watch("service");

  const loadData = () => {
    if (props.songDetailId) {
      ApiHelper.get("/songDetailLinks/songDetail/" + props.songDetailId, "ContentApi").then((data) => {
        setSongDetailLinks(data);
      });
    }
  };

  useEffect(() => {
    loadData();
  }, [props.songDetailId]);

  useEffect(() => {
    if (editLink) reset({ service: editLink.service ?? "Apple", serviceKey: editLink.serviceKey ?? "" });
  }, [editLink, reset]);

  const getPlaceholder = (service: string) => {
    switch (service) {
      case "Apple": return "10-000-reasons-bless-the-lord-10th-anniversary-feat/1618341399";
      case "CCLI": return "6016351";
      case "Genius": return "Matt-redman-10000-reasons-bless-the-lord-lyrics";
      case "Hymnary": return "https://hymnary.org/text/";
      case "MusicBrainz": return "https://musicbrainz.org/recording/";
      case "Spotify": return "2I9pjIezpupeJfVM1r9ZIm";
      case "YouTube": return "XtwIT8JjddM";
      default: return "";
    }
  };

  const determineUrl = (service: string, serviceKey: string) => {
    switch (service) {
      case "Apple": return "https://music.apple.com/us/album/" + serviceKey;
      case "CCLI": return "https://songselect.ccli.com/Songs/" + serviceKey;
      case "Genius": return "https://genius.com/" + serviceKey;
      case "Hymnary": return "https://hymnary.org/text/" + serviceKey;
      case "MusicBrainz": return "https://musicbrainz.org/recording/" + serviceKey;
      case "Spotify": return "https://open.spotify.com/track/" + serviceKey;
      case "YouTube": return "https://www.youtube.com/watch?v=" + serviceKey;
      default: return "";
    }
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

  const onValid = (values: AnyRecord) => {
    const l: SongDetailLinkInterface = { ...editLink, service: values.service, serviceKey: values.serviceKey };
    l.url = determineUrl(values.service, values.serviceKey);
    ApiHelper.post("/songDetailLinks", [l], "ContentApi").then(() => {
      loadData();
      setEditLink(null);
      if (values.service === "MusicBrainz") props.reload();
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
        cancelFunction={() => { setEditLink(null); }}
        saveFunction={handleSubmit(onValid)}
        deleteFunction={editLink.id ? handleDelete : null}>
        <FormControl fullWidth size="small">
          <InputLabel>{Locale.label("songs.songDetailLinksEdit.service")}</InputLabel>
          <Controller name="service" control={control} render={({ field }) => (
            <Select {...field} size="small" label={Locale.label("songs.songDetailLinksEdit.service")}>
              <MenuItem value="Apple">Apple</MenuItem>
              <MenuItem value="CCLI">CCLI</MenuItem>
              <MenuItem value="Genius">Genius</MenuItem>
              <MenuItem value="Hymnary">Hymnary</MenuItem>
              <MenuItem value="MusicBrainz">MusicBrainz</MenuItem>
              <MenuItem value="Spotify">Spotify</MenuItem>
              <MenuItem value="YouTube">YouTube</MenuItem>
            </Select>
          )} />
        </FormControl>
        <TextField size="small" placeholder={getPlaceholder(watchedService)} fullWidth label={Locale.label("songs.songDetailLinksEdit.id")} {...register("serviceKey")} />
      </InputBox>
    );
  } else {
    return (
      <Box>
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <LinkIcon sx={{ color: "primary.main", fontSize: 20 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
              {Locale.label("songs.songDetailLinksEdit.externalLinks")}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1}>
            <AppIconButton label={Locale.label("common.add")} icon={<AddIcon />} tone="card" intent="add" onClick={handleAdd} />
            <AppIconButton label={Locale.label("common.done")} icon={<DoneIcon />} tone="card" onClick={props.reload} />
          </Stack>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("songs.songDetailLinksEdit.service")}</TableCell>
              <TableCell>{Locale.label("songs.songDetailLinksEdit.key")}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{songDetailLinks?.map((sd) => getRow(sd))}</TableBody>
        </Table>
      </Box>
    );
  }
};
