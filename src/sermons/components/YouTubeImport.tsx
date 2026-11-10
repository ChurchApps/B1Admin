import { ErrorMessages, Locale } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import type { PlaylistInterface, SermonInterface } from "@churchapps/helpers";
import { Checkbox, FormControl, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField } from "@mui/material";
import React from "react";
import { FormCard } from "../../components/ui";

interface Props {
  handleDone: () => void;
}

export const YouTubeImport = (props: Props) => {
  const [selectedSermons, setSelectedSermons] = React.useState<SermonInterface[]>([]);
  const [sermons, setSermons] = React.useState<SermonInterface[] | null>(null);
  const [channelId, setChannelId] = React.useState("");
  const [playlistId, setPlaylistId] = React.useState("");
  const [playlists, setPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isFetching, setIsFetching] = React.useState(false);
  const loadData = () => {
    ApiHelper.get("/playlists", "ContentApi").then((data: any) => { setPlaylists(data); });
  };

  const handleCheck = (sermon:SermonInterface, checked: boolean) => {
    let newSelectedSermons = [...selectedSermons];
    if (checked) newSelectedSermons.push(sermon);
    else newSelectedSermons = newSelectedSermons.filter((s) => s.videoData !== sermon.videoData);
    setSelectedSermons(newSelectedSermons);
  };

  const getRows = () => {
    const rows: React.ReactElement[] = [];
    if (!sermons) return rows;
    sermons.forEach((ser) => {
      const sermon = ser;
      rows.push(<TableRow key={sermon.videoData}>
        <TableCell>
          <Checkbox onChange={(e) => handleCheck(sermon, e.currentTarget.checked)} checked={ selectedSermons.filter((s: any) => s.videoData === sermon.videoData).length > 0 } />
        </TableCell>
        <TableCell>{sermon.title}</TableCell>
      </TableRow>);
    });
    return rows;
  };

  const getTable = () => (
    <Table size="small">
      <TableHead>
        <TableRow>
          <TableCell>{Locale.label("sermons.bulkImport.import")}</TableCell>
          <TableCell>{Locale.label("sermons.sermonEdit.title")}</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>{getRows()}</TableBody>
    </Table>
  );


  React.useEffect(() => { loadData(); }, []);

  const handleFetch = () => {
    setIsFetching(true);
    setErrors([]);
    ApiHelper.get("/sermons/youtubeImport/" + encodeURIComponent(channelId.trim()), "ContentApi")
      .then((data: any) => {
        setIsFetching(false);
        if (!Array.isArray(data) || data.length === 0) setErrors([Locale.label("sermons.bulkImport.noVideos")]);
        else setSermons(data);
      })
      .catch(() => { setIsFetching(false); setErrors([Locale.label("sermons.bulkImport.fetchError")]); });
  };

  const handleSave = () => {
    if (playlistId === "") setErrors([Locale.label("sermons.bulkImport.selectPlaylist")]);
    else if (selectedSermons.length === 0) setErrors([Locale.label("sermons.bulkImport.selectVideos")]);
    else {
      setErrors([]);
      const data = selectedSermons.map((sermon) => ({ ...sermon, playlistId }));
      ApiHelper.post("/sermons", data, "ContentApi")
        .then(() => { props.handleDone(); })
        .catch(() => setErrors([Locale.label("common.saveError")]));
    }
  };

  if (!sermons) {
    return (<>
      <ErrorMessages errors={errors} />
      <FormCard icon="video_library" title={Locale.label("sermons.bulkImport.import")} saveText={isFetching ? Locale.label("sermons.bulkImport.fetching") : Locale.label("sermons.bulkImport.fetch")} onSave={handleFetch} onCancel={props.handleDone} isSubmitting={isFetching}>
        <TextField fullWidth label={Locale.label("sermons.bulkImport.youtubeChannelId")} name="channelId" value={channelId} onChange={(e) => { setChannelId(e.target.value); }} placeholder={Locale.label("sermons.bulkImport.youtubeChannelPlaceholder")} />
      </FormCard>
    </>);
  } else {
    return (<>
      <ErrorMessages errors={errors} />
      <FormCard icon="video_library" title={Locale.label("sermons.bulkImport.import")} saveText={Locale.label("sermons.bulkImport.import")} onSave={handleSave} onCancel={props.handleDone}>
        <FormControl fullWidth>
          <InputLabel id="import-playlist-label">{Locale.label("sermons.bulkImport.importIntoPlaylist")}</InputLabel>
          <Select fullWidth labelId="import-playlist-label" label={Locale.label("sermons.bulkImport.importIntoPlaylist")} name="playlistId" value={playlistId} onChange={(e) => { setPlaylistId(e.target.value); }}>
            {playlists.map((playlist) => (<MenuItem key={playlist.id} value={playlist.id}>{playlist.title}</MenuItem>))}
          </Select>
        </FormControl>
        {getTable()}
      </FormCard>
    </>);
  }
};
