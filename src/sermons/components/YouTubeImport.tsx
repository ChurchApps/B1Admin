import { ErrorMessages, Locale } from "@churchapps/apphelper";
import { InputBox } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import type { PlaylistInterface, SermonInterface } from "@churchapps/helpers";
import {
  Checkbox, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField 
} from "@mui/material";
import React from "react";

interface Props {
  handleDone: () => void;
}

export const YouTubeImport = (props: Props) => {
  const [selectedSermons, setSelectedSermons] = React.useState<SermonInterface[]>([]);
  const [sermons, setSermons] = React.useState<SermonInterface[]>(null);
  const [channelId, setChannelId] = React.useState("");
  const [playlistId, setPlaylistId] = React.useState("");
  const [playlists, setPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [errors, setErrors] = React.useState([]);
  const [isFetching, setIsFetching] = React.useState(false);
  const [autoImportSermons, setAutoImportSermons] = React.useState<boolean>(false);
  const [autoImportSettings, setAutoImportSettings] = React.useState(null);

  const loadData = () => {
    ApiHelper.get("/playlists", "ContentApi").then((data: any) => { setPlaylists(data); });
  };

  const loadSettings = () => {
    if (playlistId && channelId) {
      ApiHelper.get(`/settings/imports?type=youtube&playlistId=${playlistId}&channelId=${channelId}`, "ContentApi").then((data: any) => {
        if (data.length === 1) { setAutoImportSettings(data[0]); setAutoImportSermons(true); } else { setAutoImportSettings(null); setAutoImportSermons(false); }
      });
    }
  };

  const handleCheck = (sermon:SermonInterface, checked: boolean) => {
    let newSelectedSermons = [...selectedSermons];
    if (checked) newSelectedSermons.push(sermon);
    else newSelectedSermons = newSelectedSermons.filter((s) => s.videoData !== sermon.videoData);
    setSelectedSermons(newSelectedSermons);
  };

  const getRows = () => {
    const rows: React.ReactElement[] = [];
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
  React.useEffect(() => { loadSettings(); }, [channelId, playlistId]);

  const handleFetch = () => {
    setIsFetching(true);
    ApiHelper.get("/sermons/youtubeImport/" + channelId, "ContentApi").then((data: any) => { setSermons(data); setIsFetching(false); });
  };

  const handleSave = () => {
    if (playlistId === "") setErrors([Locale.label("sermons.bulkImport.selectPlaylist")]);
    else {
      if (autoImportSettings && autoImportSermons === false) {
        ApiHelper.post("/settings", [{ ...autoImportSettings, value: "", public: 1 }], "ContentApi");
      }
      if (!autoImportSettings && autoImportSermons === true) {
        ApiHelper.post("/settings", [{ keyName: "youtubeChannelId", value: channelId, public: 1 }], "ContentApi").then((data: any) => {
          ApiHelper.post("/settings", [{ keyName: "autoImportSermons", value: `${playlistId}|#${data[0].id}`, public: 1 }], "ContentApi");
        });
      }
      const data = [...selectedSermons];
      data.forEach((sermon) => { sermon.playlistId = playlistId; });
      ApiHelper.post("/sermons", data, "ContentApi").then(() => { props.handleDone(); });
    }
  };

  if (!sermons) {
    return (<>
      <ErrorMessages errors={errors} />
      <InputBox headerIcon="video_library" headerText={Locale.label("sermons.bulkImport.import")} saveText={isFetching ? Locale.label("sermons.bulkImport.fetching") : Locale.label("sermons.bulkImport.fetch")} saveFunction={handleFetch} cancelFunction={props.handleDone} isSubmitting={isFetching}>
        <TextField fullWidth label={Locale.label("sermons.bulkImport.youtubeChannelId")} name="channelId" value={channelId} onChange={(e) => { setChannelId(e.target.value); }} placeholder={Locale.label("sermons.bulkImport.youtubeChannelPlaceholder")} />
      </InputBox>
    </>);
  } else {
    return (<>
      <ErrorMessages errors={errors} />
      <InputBox headerIcon="video_library" headerText={Locale.label("sermons.bulkImport.import")} saveText={Locale.label("sermons.bulkImport.import")} saveFunction={handleSave} cancelFunction={props.handleDone}>
        <FormControl fullWidth>
          <InputLabel>{Locale.label("sermons.bulkImport.importIntoPlaylist")}</InputLabel>
          <Select fullWidth label={Locale.label("sermons.bulkImport.importIntoPlaylist")} name="playlistId" value={playlistId} onChange={(e) => { setPlaylistId(e.target.value); }}>
            {playlists.map((playlist) => (<MenuItem key={playlist.id} value={playlist.id}>{playlist.title}</MenuItem>))}
          </Select>
        </FormControl>
        <FormControlLabel sx={{ marginLeft: 0 }} control={<Checkbox onChange={(e) => { setAutoImportSermons(e.target.checked); }} checked={ autoImportSermons === true ? true : false } />} name="autoImportSermons" label={Locale.label("sermons.bulkImport.autoImportNewVideos")} />
        <br />
        <br />
        {getTable()}
      </InputBox>
    </>);
  }
};
