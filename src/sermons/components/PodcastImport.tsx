import { ErrorMessages, Locale, DateHelper, UserHelper } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import type { PlaylistInterface, SermonInterface } from "@churchapps/helpers";
import { Box, Checkbox, FormControl, InputLabel, MenuItem, Select, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import React from "react";
import { FormCard } from "../../components/ui";

interface Props {
  handleDone: () => void;
}

interface PodcastEpisode {
  guid: string;
  title: string;
  pubDate: string;
  description: string;
  audioUrl: string;
  audioType?: string;
  duration: number;
  image: string;
  episodeNumber?: number;
  link?: string;
}

interface PodcastFeed {
  title: string;
  image: string;
  episodes: PodcastEpisode[];
}

export const PodcastImport = (props: Props) => {
  const [feedUrl, setFeedUrl] = React.useState("");
  const [feed, setFeed] = React.useState<PodcastFeed | null>(null);
  const [existingAudioUrls, setExistingAudioUrls] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<string[]>([]);
  const [playlistId, setPlaylistId] = React.useState("");
  const [playlists, setPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [errors, setErrors] = React.useState<string[]>([]);
  const [isFetching, setIsFetching] = React.useState(false);

  const loadData = () => {
    ApiHelper.get("/playlists", "ContentApi").then((data: any) => { setPlaylists(data); });
    ApiHelper.get("/sermons", "ContentApi").then((data: SermonInterface[]) => {
      const urls = new Set<string>();
      (data || []).forEach((s) => { if (s.audioUrl?.trim()) urls.add(s.audioUrl.trim()); });
      setExistingAudioUrls(urls);
    });
  };

  React.useEffect(() => { loadData(); }, []);

  const isImported = (ep: PodcastEpisode) => existingAudioUrls.has(ep.audioUrl.trim());

  const handleCheck = (guid: string, checked: boolean) => {
    if (checked) setSelected([...selected, guid]);
    else setSelected(selected.filter((g) => g !== guid));
  };

  const handleFetch = () => {
    setIsFetching(true);
    setErrors([]);
    ApiHelper.getAnonymous("/podcast/feed?url=" + encodeURIComponent(feedUrl.trim()), "ContentApi")
      .then((data: any) => {
        setIsFetching(false);
        if (!data || data.error || !Array.isArray(data.episodes)) { setErrors([Locale.label("sermons.bulkImport.podcastFetchError")]); return; }
        const episodes: PodcastEpisode[] = data.episodes.filter((ep: PodcastEpisode) => ep.audioUrl);
        if (episodes.length === 0) { setErrors([Locale.label("sermons.bulkImport.noEpisodes")]); return; }
        setFeed({ title: data.title, image: data.image, episodes });
        setSelected(episodes.filter((ep) => !isImported(ep)).map((ep) => ep.guid));
      })
      .catch(() => { setIsFetching(false); setErrors([Locale.label("sermons.bulkImport.podcastFetchError")]); });
  };

  const handleSave = () => {
    if (playlistId === "") setErrors([Locale.label("sermons.bulkImport.selectPlaylist")]);
    else if (selected.length === 0) setErrors([Locale.label("sermons.bulkImport.selectEpisodes")]);
    else {
      setErrors([]);
      const churchId = UserHelper.currentUserChurch.church.id;
      const data = (feed?.episodes || []).filter((ep) => selected.includes(ep.guid)).map((ep) => ({
        churchId,
        playlistId,
        title: ep.title,
        description: ep.description,
        publishDate: new Date(ep.pubDate),
        duration: ep.duration || 0,
        thumbnail: ep.image || "",
        audioUrl: ep.audioUrl,
        videoType: "",
        videoData: "",
        videoUrl: "",
        permanentUrl: false
      }));
      ApiHelper.post("/sermons", data, "ContentApi")
        .then(() => { props.handleDone(); })
        .catch(() => setErrors([Locale.label("common.saveError")]));
    }
  };

  const getRows = () => (feed?.episodes || []).map((ep) => {
    const imported = isImported(ep);
    return (
      <TableRow key={ep.guid}>
        <TableCell>
          <Checkbox onChange={(e) => handleCheck(ep.guid, e.currentTarget.checked)} checked={!imported && selected.includes(ep.guid)} disabled={imported} />
        </TableCell>
        <TableCell>
          {ep.title}
          {imported && <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>{Locale.label("sermons.bulkImport.alreadyImported")}</Typography>}
        </TableCell>
        <TableCell>{ep.pubDate ? DateHelper.prettyDate(new Date(ep.pubDate)) : ""}</TableCell>
      </TableRow>
    );
  });

  if (!feed) {
    return (<>
      <ErrorMessages errors={errors} />
      <FormCard icon="podcasts" title={Locale.label("sermons.bulkImport.import")} saveText={isFetching ? Locale.label("sermons.bulkImport.fetching") : Locale.label("sermons.bulkImport.fetch")} onSave={handleFetch} onCancel={props.handleDone} isSubmitting={isFetching}>
        <TextField fullWidth label={Locale.label("sermons.bulkImport.podcastFeedUrl")} name="feedUrl" value={feedUrl} onChange={(e) => { setFeedUrl(e.target.value); }} placeholder={Locale.label("sermons.bulkImport.podcastFeedPlaceholder")} data-testid="podcast-feed-url-input" />
      </FormCard>
    </>);
  }

  return (<>
    <ErrorMessages errors={errors} />
    <FormCard icon="podcasts" title={Locale.label("sermons.bulkImport.import")} saveText={Locale.label("sermons.bulkImport.import")} onSave={handleSave} onCancel={props.handleDone}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        {feed.image && <Box component="img" src={feed.image} alt="" sx={{ width: 48, height: 48, borderRadius: 1, objectFit: "cover" }} />}
        <Typography variant="h6" component="h3">{feed.title}</Typography>
      </Box>
      <FormControl fullWidth>
        <InputLabel id="import-playlist-label">{Locale.label("sermons.bulkImport.importIntoPlaylist")}</InputLabel>
        <Select fullWidth labelId="import-playlist-label" label={Locale.label("sermons.bulkImport.importIntoPlaylist")} name="playlistId" value={playlistId} onChange={(e) => { setPlaylistId(e.target.value); }}>
          {playlists.map((playlist) => (<MenuItem key={playlist.id} value={playlist.id}>{playlist.title}</MenuItem>))}
        </Select>
      </FormControl>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{Locale.label("sermons.bulkImport.import")}</TableCell>
            <TableCell>{Locale.label("sermons.sermonEdit.title")}</TableCell>
            <TableCell>{Locale.label("sermons.publishDate")}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>{getRows()}</TableBody>
      </Table>
    </FormCard>
  </>);
};
