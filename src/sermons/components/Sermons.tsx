import { Loading, Locale } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import { ArrayHelper } from "@churchapps/apphelper";
import { DateHelper } from "@churchapps/apphelper";
import { ImageEditor } from "@churchapps/apphelper";
import type { SermonInterface, PlaylistInterface } from "@churchapps/helpers";
import { Alert, Box, Button, IconButton, InputAdornment, Menu, MenuItem, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { Add as AddIcon, CalendarMonth as CalendarIcon, CloudUpload as CloudUploadIcon, ContentCopy as ContentCopyIcon, Edit as EditIcon, LiveTv as LiveTvIcon, PlaylistPlay as PlaylistIcon, Search as SearchIcon, VideoLibrary as VideoLibraryIcon } from "@mui/icons-material";
import React from "react";
import { useNavigate } from "react-router-dom";
import { SermonEdit } from "./SermonEdit";
import { PlaylistEdit } from "./PlaylistEdit";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { hoverRowSx } from "../../components/ui/tableStyles";
import { AddBlock, SectionLabel, Verb, plainTableSx } from "./plate";
import { SermonChrome } from "./SermonChrome";

export const Sermons = () => {
  const [sermons, setSermons] = React.useState<SermonInterface[]>([]);
  const [filteredSermons, setFilteredSermons] = React.useState<SermonInterface[]>([]);
  const [playlists, setPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [currentSermon, setCurrentSermon] = React.useState<SermonInterface | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showSermonSearch, setShowSermonSearch] = React.useState<boolean>(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  const [currentPlaylist, setCurrentPlaylist] = React.useState<PlaylistInterface | null>(null);
  const [playlistSearch, setPlaylistSearch] = React.useState<string>("");
  const [showPlaylistSearch, setShowPlaylistSearch] = React.useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [photoType, setPhotoType] = React.useState<string | null>(null);
  const imageEditorRef = React.useRef<HTMLDivElement>(null);
  const [copySnackbar, setCopySnackbar] = React.useState(false);

  const podcastFeedUrl = React.useMemo(() => {
    const base = ApiHelper.getConfig("ContentApi")?.url?.replace(/\/+$/, "") || "";
    const churchId = UserHelper.currentUserChurch?.church?.id;
    return (base && churchId) ? base + "/sermons/rss/" + churchId : "";
  }, []);

  const copyFeedUrl = () => {
    navigator.clipboard.writeText(podcastFeedUrl).then(() => setCopySnackbar(true)).catch(() => {});
  };

  const handleUpdated = () => { setCurrentSermon(null); loadData(); };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleAddSermon = () => {
    handleMenuClose();
    handleAdd(false);
  };

  const handleAddPermanentLiveUrl = () => {
    handleMenuClose();
    handleAdd(true);
  };

  const handleBulkImport = () => {
    handleMenuClose();
    navigate("/sermons/bulk");
  };

  const getActionButtons = () => (
    <>
      <Verb onClick={handleMenuClick} testId="add-sermon-button">{Locale.label("sermons.addSermon")}</Verb>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right"
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right"
        }}
      >
        <MenuItem onClick={handleAddSermon}>
          <Stack direction="row" spacing={1} alignItems="center">
            <LiveTvIcon fontSize="small" />
            <Typography>{Locale.label("sermons.addSermon")}</Typography>
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleAddPermanentLiveUrl}>
          <Stack direction="row" spacing={1} alignItems="center">
            <LiveTvIcon fontSize="small" sx={{ color: "error.main" }} />
            <Typography>{Locale.label("sermons.addPermanentLiveUrl")}</Typography>
          </Stack>
        </MenuItem>
        <MenuItem onClick={handleBulkImport} data-testid="bulk-import-menu-item">
          <Stack direction="row" spacing={1} alignItems="center">
            <CloudUploadIcon fontSize="small" />
            <Typography>{Locale.label("sermons.bulkImport.title")}</Typography>
          </Stack>
        </MenuItem>
      </Menu>
    </>
  );

  const loadData = () => {
    ApiHelper.get("/playlists", "ContentApi").then((data: any) => { setPlaylists(data); });
    ApiHelper.get("/sermons", "ContentApi").then((data: any) => {
      setSermons(data);
      setFilteredSermons(data);
      setIsLoading(false);
    });
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    if (value === "") {
      setFilteredSermons(sermons);
    } else {
      const filtered = sermons.filter((sermon: any) => {
        const playlistTitle = getPlaylistTitle(sermon.playlistId);
        return (
          sermon.title.toLowerCase().includes(value.toLowerCase())
          || playlistTitle.toLowerCase().includes(value.toLowerCase())
        );
      });
      setFilteredSermons(filtered);
    }
  };

  const handleAdd = (permanentUrl: boolean) => {
    const v: SermonInterface = { churchId: UserHelper.currentUserChurch.church.id, duration: 5400, videoType: "youtube", videoData: "", title: Locale.label("sermons.sermonEdit.newSermon"), permanentUrl };
    if (permanentUrl) {
      v.videoType = "youtube_channel";
      v.videoData = Locale.label("sermons.sermonEdit.channelIdPlaceholder");
      v.title = Locale.label("sermons.sermonEdit.currentLiveService");
    }
    setCurrentPlaylist(null);
    setCurrentSermon(v);
    loadData();
  };

  const getPlaylistTitle = (playlistId: string) => {
    let result = "";
    if (playlists) {
      const p: PlaylistInterface = ArrayHelper.getOne(playlists, "id", playlistId);
      if (p) result = p.title || "";
    }
    return result;
  };

  const handlePlaylistUpdated = () => { setCurrentPlaylist(null); loadData(); };

  const showPhotoEditor = (pType: string, url: string | null) => {
    setPhotoUrl(url);
    setPhotoType(pType);
  };

  const handlePhotoUpdated = (dataUrl?: string) => {
    setPhotoUrl(dataUrl ?? null);
    setPhotoType(photoType);
  };

  const handleAddPlaylist = () => {
    const v: PlaylistInterface = { churchId: UserHelper.currentUserChurch.church.id, title: Locale.label("sermons.playlists.playlistEdit.newPlaylist"), description: "", publishDate: new Date(), thumbnail: "" };
    setCurrentSermon(null);
    setCurrentPlaylist(v);
  };

  const getRows = () => {
    const rows: React.ReactElement[] = [];
    filteredSermons.forEach((video: any) => {
      rows.push(
        <TableRow
          key={video.id}
          sx={hoverRowSx}
        >
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <PlaylistIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2">
                {getPlaylistTitle(video.playlistId) || Locale.label("sermons.noPlaylist")}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell>
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              {video.title}
            </Typography>
          </TableCell>
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <CalendarIcon sx={{ fontSize: 18, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {(video.publishDate) ? DateHelper.prettyDate(DateHelper.toDate(video.publishDate)) : Locale.label("sermons.notScheduled")}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell align="right" className="rowActions">
            <AppIconButton
              label={Locale.label("common.edit")}
              icon={<EditIcon />}
              onClick={() => { setCurrentPlaylist(null); setCurrentSermon(video); }}
              data-testid={`edit-sermon-${video.id}`}
            />
          </TableCell>
        </TableRow>
      );
    });
    return rows;
  };

  const getEmptyState = () => (
    <TableRow>
      <TableCell colSpan={4} sx={{ textAlign: "center", py: 8 }}>
        <Stack spacing={2} alignItems="center">
          <LiveTvIcon sx={{ fontSize: 64, color: "text.secondary" }} />
          <Typography variant="h6" color="text.secondary">
            {searchTerm ? Locale.label("sermons.noSermonsFound") : Locale.label("sermons.noSermonsYet")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? Locale.label("sermons.adjustSearchTerms") : Locale.label("sermons.getStarted")}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => handleAdd(false)}
            >
              {Locale.label("sermons.addFirstSermon")}
            </Button>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );

  const getTable = () => {
    if (isLoading) return <Loading data-testid="sermons-loading" />;
    else {
      return (
        <Table sx={plainTableSx}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: "25%" }}>{Locale.label("sermons.playlist")}</TableCell>
              <TableCell sx={{ width: "45%" }}>{Locale.label("sermons.sermon")}</TableCell>
              <TableCell sx={{ width: "25%" }}>{Locale.label("sermons.publishDate")}</TableCell>
              <TableCell sx={{ width: "5%" }} align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSermons.length === 0 ? getEmptyState() : getRows()}
          </TableBody>
        </Table>
      );
    }
  };

  const getPlaylistRows = () => {
    const displayed = playlistSearch
      ? playlists.filter((p: any) =>
        p.title?.toLowerCase().includes(playlistSearch.toLowerCase())
        || p.description?.toLowerCase().includes(playlistSearch.toLowerCase()))
      : playlists;

    if (displayed.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={2} sx={{ textAlign: "center", py: 4, borderBottom: 0 }}>
            <Stack spacing={1.5} alignItems="center">
              <VideoLibraryIcon sx={{ fontSize: 40, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {playlistSearch ? Locale.label("sermons.playlists.noPlaylistsMatch") : Locale.label("sermons.playlists.noPlaylistsFound")}
              </Typography>
              {!playlistSearch && (
                <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={handleAddPlaylist} data-testid="add-first-playlist-button">
                  {Locale.label("sermons.playlists.createFirstPlaylist")}
                </Button>
              )}
            </Stack>
          </TableCell>
        </TableRow>
      );
    }

    return displayed.map((playlist) => (
      <TableRow
        key={playlist.id}
        sx={{ ...hoverRowSx, "&:last-child td": { borderBottom: 0 } }}
      >
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {playlist.title}
          </Typography>
        </TableCell>
        <TableCell align="right" className="rowActions">
          <AppIconButton
            label={Locale.label("common.edit")}
            icon={<EditIcon />}
            tone="card"
            onClick={() => { setCurrentSermon(null); setCurrentPlaylist(playlist); }}
          />
        </TableCell>
      </TableRow>
    ));
  };

  React.useEffect(() => { loadData(); }, []);

  React.useEffect(() => {
    if ((photoUrl || photoUrl === "") && imageEditorRef.current) {
      imageEditorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [photoUrl]);

  const imageEditor = (photoUrl || photoUrl === "") && (
    <div ref={imageEditorRef}>
      <ImageEditor
        aspectRatio={16 / 9}
        outputWidth={640}
        outputHeight={360}
        photoUrl={photoUrl}
        onCancel={() => { setPhotoUrl(null); setPhotoType(null); }}
        onUpdate={handlePhotoUpdated}
      />
    </div>
  );

  return (
    <>
      <SermonChrome selected="sermons" extraVerbs={getActionButtons()}>
        {currentSermon !== null && (
          <Box sx={{ mb: 3 }}>
            <SermonEdit currentSermon={currentSermon} updatedFunction={handleUpdated} />
          </Box>
        )}

        {sermons.length > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <SectionLabel>{Locale.label("sermons.title")}</SectionLabel>
            <AppIconButton
              label={Locale.label("common.search")}
              icon={<SearchIcon />}
              tone={showSermonSearch ? "card" : "default"}
              onClick={() => setShowSermonSearch(!showSermonSearch)}
              data-testid="sermon-search-button"
            />
          </Box>
        )}

        {sermons.length > 0 && showSermonSearch && (
          <TextField
            fullWidth
            size="small"
            autoFocus
            variant="standard"
            placeholder={Locale.label("sermons.searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />
        )}

        {getTable()}

        {podcastFeedUrl && (
          <Box sx={{ mt: 2 }} data-testid="podcast-feed-url">
            <Typography variant="subtitle2">{Locale.label("sermons.podcast.title")}</Typography>
            <Typography variant="body2" color="text.secondary">
              <code style={{ wordBreak: "break-all" }}>{podcastFeedUrl}</code>
              <IconButton size="small" onClick={copyFeedUrl} aria-label={Locale.label("sermons.podcast.copyFeedUrl")} data-testid="copy-podcast-feed-url" sx={{ ml: 0.5, verticalAlign: "middle" }}>
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Typography>
            <Typography variant="caption" color="text.secondary">{Locale.label("sermons.podcast.hint")}</Typography>
          </Box>
        )}

        <SectionLabel>{Locale.label("sermons.playlists.title")}</SectionLabel>
        {currentPlaylist !== null && (
          <Box sx={{ mb: 3 }}>
            {imageEditor}
            <PlaylistEdit
              currentPlaylist={currentPlaylist}
              updatedFunction={handlePlaylistUpdated}
              showPhotoEditor={showPhotoEditor}
              updatedPhoto={(photoType === "playlist" && photoUrl) || null}
            />
          </Box>
        )}
        <Box data-testid="playlists-panel">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2" color="text.secondary">{playlists.length}</Typography>
            <Stack direction="row" spacing={2}>
              <Verb onClick={() => setShowPlaylistSearch(!showPlaylistSearch)} testId="playlist-search-button">{Locale.label("common.search")}</Verb>
              <Verb onClick={handleAddPlaylist} testId="add-playlist-button">{Locale.label("common.add")}</Verb>
            </Stack>
          </Box>
          {showPlaylistSearch && (
            <TextField
              fullWidth
              size="small"
              autoFocus
              variant="standard"
              placeholder={Locale.label("sermons.playlists.searchPlaceholder")}
              value={playlistSearch}
              onChange={(e) => setPlaylistSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />
          )}
          {isLoading ? <Loading /> : (
            <Table size="small" sx={plainTableSx}>
              <TableBody>
                {getPlaylistRows()}
              </TableBody>
            </Table>
          )}
        </Box>

        <AddBlock>
          <Verb onClick={() => handleAdd(false)}>{Locale.label("sermons.addFirstSermon")}</Verb>
        </AddBlock>
      </SermonChrome>
      <Snackbar open={copySnackbar} autoHideDuration={2500} onClose={() => setCopySnackbar(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" variant="filled" onClose={() => setCopySnackbar(false)}>{Locale.label("sermons.podcast.feedUrlCopied")}</Alert>
      </Snackbar>
    </>
  );
};
