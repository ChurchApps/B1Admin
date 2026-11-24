import { Loading, Locale } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import { ArrayHelper } from "@churchapps/apphelper";
import { DateHelper } from "@churchapps/apphelper";
import { ImageEditor } from "@churchapps/apphelper";
import type { SermonInterface, PlaylistInterface } from "@churchapps/helpers";
import { Alert, Box, Button, Checkbox, Grid, IconButton, Menu, MenuItem, Snackbar, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { Add as AddIcon, CalendarMonth as CalendarIcon, CloudUpload as CloudUploadIcon, ContentCopy as ContentCopyIcon, DeleteOutline as DeleteIcon, LiveTv as LiveTvIcon, PlaylistPlay as PlaylistIcon, ArrowDropDown as ArrowDropDownIcon, VideoLibrary as VideoLibraryIcon } from "@mui/icons-material";
import React from "react";
import { useNavigate } from "react-router-dom";
import { SermonEdit } from "./SermonEdit";
import { PlaylistEdit } from "./PlaylistEdit";
import { CountChip, HeaderPrimaryButton, ResultsBar, SearchField, Surface, TextAction, tableScrollSx } from "../../components/ui";
import { hoverRowSx } from "../../components/ui/tableStyles";
import { useConfirmDelete } from "../../hooks";
import { SermonChrome } from "./SermonChrome";

export const Sermons = () => {
  const [sermons, setSermons] = React.useState<SermonInterface[]>([]);
  const [playlists, setPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [currentSermon, setCurrentSermon] = React.useState<SermonInterface | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const latestSermonRequest = React.useRef<Promise<SermonInterface[]> | null>(null);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedSermonIds, setSelectedSermonIds] = React.useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState(false);
  const [isMoving, setIsMoving] = React.useState(false);
  const [moveAnchor, setMoveAnchor] = React.useState<null | HTMLElement>(null);
  const [moveError, setMoveError] = React.useState(false);
  const [moveSnackbar, setMoveSnackbar] = React.useState<string | null>(null);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  const [currentPlaylist, setCurrentPlaylist] = React.useState<PlaylistInterface | null>(null);
  const [playlistSearch, setPlaylistSearch] = React.useState<string>("");
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
      <HeaderPrimaryButton
        startIcon={<AddIcon />}
        endIcon={<ArrowDropDownIcon />}
        onClick={handleMenuClick}
        disabled={isDeleting}
        data-testid="add-sermon-button"
      >
        {Locale.label("sermons.addSermon")}
      </HeaderPrimaryButton>
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

  const loadSermons = async () => {
    const request: Promise<SermonInterface[]> = ApiHelper.get("/sermons", "ContentApi");
    latestSermonRequest.current = request;
    const data = await request;
    if (latestSermonRequest.current === request) {
      setSermons(data);
      setIsLoading(false);
    }
  };

  const loadData = () => {
    ApiHelper.get("/playlists", "ContentApi").then((data: PlaylistInterface[]) => { setPlaylists(data); });
    void loadSermons();
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setSelectedSermonIds(new Set());
    setDeleteError(false);
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

  const getPlaylistTitle = (playlistId: string | undefined) => {
    let result = "";
    if (playlists) {
      const p: PlaylistInterface = ArrayHelper.getOne(playlists, "id", playlistId);
      if (p) result = p.title || "";
    }
    return result;
  };

  const searchText = searchTerm.toLowerCase();
  const filteredSermons = searchText ? sermons.filter((sermon) => {
    const playlistTitle = getPlaylistTitle(sermon.playlistId) || Locale.label("sermons.noPlaylist");
    return (sermon.title || "").toLowerCase().includes(searchText) || playlistTitle.toLowerCase().includes(searchText);
  }) : sermons;
  const selectableIds = filteredSermons.flatMap((sermon) => sermon.id && !sermon.permanentUrl ? [sermon.id] : []);
  const selectedIds = selectableIds.filter((id) => selectedSermonIds.has(id));
  const allSelected = selectableIds.length > 0 && selectedIds.length === selectableIds.length;
  const selectionDisabled = isDeleting || isMoving || currentSermon !== null || currentPlaylist !== null;

  const toggleSelected = (id: string, checked: boolean) => {
    setSelectedSermonIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleDeleteSelected = async () => {
    if (selectionDisabled || selectedIds.length === 0) return;
    const message = selectedIds.length === 1
      ? Locale.label("sermons.bulkDelete.confirmOne")
      : Locale.label("sermons.bulkDelete.confirmMany").replace("{count}", String(selectedIds.length));
    if (!(await confirm(message, { title: Locale.label("sermons.bulkDelete.title") }))) return;

    setIsDeleting(true);
    setDeleteError(false);
    try {
      const results = await Promise.allSettled(selectedIds.map((id) => ApiHelper.delete("/sermons/" + id, "ContentApi")));
      const deletedIds = new Set(selectedIds.filter((_, index) => results[index].status === "fulfilled"));
      setSermons((current) => current.filter((sermon) => !sermon.id || !deletedIds.has(sermon.id)));
      setSelectedSermonIds((current) => new Set([...current].filter((id) => !deletedIds.has(id))));
      setDeleteError(deletedIds.size !== selectedIds.length);
      await loadSermons().catch(() => { /* Keep the confirmed deletions reflected if the refresh fails. */ });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveSelected = async (playlistId: string) => {
    setMoveAnchor(null);
    if (selectionDisabled || selectedIds.length === 0) return;
    const targets = sermons.filter((s) => s.id && selectedIds.includes(s.id));
    const count = targets.length;
    const playlistTitle = getPlaylistTitle(playlistId) || Locale.label("sermons.noPlaylist");
    setIsMoving(true);
    setMoveError(false);
    try {
      // SermonRepo.update writes every column, so send the whole sermon with the new playlist.
      await ApiHelper.post("/sermons", targets.map((s) => ({ ...s, playlistId: playlistId || null })), "ContentApi");
      setSelectedSermonIds(new Set());
      setMoveSnackbar(Locale.label("sermons.bulkMove.done").replace("{count}", String(count)).replace("{playlist}", playlistTitle));
      await loadSermons().catch(() => { /* The save succeeded; the next load catches up. */ });
    } catch {
      setMoveError(true);
    } finally {
      setIsMoving(false);
    }
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
    filteredSermons.forEach((video) => {
      const id = video.id;
      const selected = !!id && selectedSermonIds.has(id);
      rows.push(
        <TableRow
          key={id}
          selected={selected}
          sx={hoverRowSx}
        >
          <TableCell padding="checkbox">
            {id && !video.permanentUrl && (
              <Checkbox
                checked={selected}
                disabled={selectionDisabled}
                onChange={(_, checked) => toggleSelected(id, checked)}
                slotProps={{ input: { "aria-label": Locale.label("sermons.bulkDelete.selectOne").replace("{title}", video.title || Locale.label("sermons.sermon")) } }}
              />
            )}
          </TableCell>
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
            <TextAction small disabled={isDeleting} onClick={() => { setCurrentPlaylist(null); setCurrentSermon(video); }} data-testid={`edit-sermon-${video.id}`}>
              {Locale.label("common.edit")}
            </TextAction>
          </TableCell>
        </TableRow>
      );
    });
    return rows;
  };

  const getEmptyState = () => (
    <TableRow>
      <TableCell colSpan={5} sx={{ textAlign: "center", py: 8 }}>
        <Stack spacing={2} alignItems="center">
          <LiveTvIcon sx={{ fontSize: 40, color: "text.secondary" }} />
          <Typography variant="h3" color="text.secondary">
            {searchTerm ? Locale.label("sermons.noSermonsFound") : Locale.label("sermons.noSermonsYet")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {searchTerm ? Locale.label("sermons.adjustSearchTerms") : Locale.label("sermons.getStarted")}
          </Typography>
          {!searchTerm && (
            <TextAction disabled={isDeleting} onClick={() => handleAdd(false)} data-testid="add-first-sermon-button">
              {Locale.label("sermons.addFirstSermon")}
            </TextAction>
          )}
        </Stack>
      </TableCell>
    </TableRow>
  );

  const getTable = () => {
    if (isLoading) return <Loading data-testid="sermons-loading" />;
    else {
      return (
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={allSelected}
                  indeterminate={!allSelected && selectedIds.length > 0}
                  disabled={selectionDisabled || selectableIds.length === 0}
                  onChange={(_, checked) => setSelectedSermonIds(new Set(checked ? selectableIds : []))}
                  slotProps={{ input: { "aria-label": Locale.label("sermons.bulkDelete.selectAll") } }}
                />
              </TableCell>
              <TableCell sx={{ width: "25%" }}>{Locale.label("sermons.playlist")}</TableCell>
              <TableCell>{Locale.label("sermons.sermon")}</TableCell>
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
      ? playlists.filter((p) =>
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
                <TextAction small disabled={isDeleting} onClick={handleAddPlaylist} data-testid="add-first-playlist-button">
                  {Locale.label("sermons.playlists.createFirstPlaylist")}
                </TextAction>
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
          <TextAction small disabled={isDeleting} onClick={() => { setCurrentSermon(null); setCurrentPlaylist(playlist); }} data-testid={`edit-playlist-${playlist.id}`}>
            {Locale.label("common.edit")}
          </TextAction>
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

  const playlistTitle = (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="h3" component="h2">{Locale.label("sermons.playlists.title")}</Typography>
        {playlists.length > 0 && <CountChip count={playlists.length} />}
      </Stack>
      <Button variant="outlined" size="small" startIcon={<AddIcon />} disabled={isDeleting} onClick={handleAddPlaylist} data-testid="add-playlist-button">{Locale.label("sermons.playlists.addPlaylist", "Add playlist")}</Button>
    </Stack>
  );

  return (
    <>
      <SermonChrome selected="sermons" actions={getActionButtons()}>
        {ConfirmDialogElement}
        <Grid container spacing={3} alignItems="flex-start">
          <Grid size={{ xs: 12, lg: 8 }}>
            {currentSermon !== null && (
              <Box sx={{ mb: 3 }}>
                <SermonEdit currentSermon={currentSermon} updatedFunction={handleUpdated} />
              </Box>
            )}
            <Surface>
              <Stack spacing={3}>
                {sermons.length > 0 && <SearchField value={searchTerm} onChange={handleSearch} label={Locale.label("sermons.searchPlaceholder")} data-testid="sermon-search-input" />}
                {sermons.length > 0 && (
                  <ResultsBar>
                    <Typography variant="body2" color="text.secondary">
                      {Locale.label("sermons.resultCount", "{shown} of {total} sermons").replace("{shown}", filteredSermons.length.toString()).replace("{total}", sermons.length.toString())}
                    </Typography>
                    {(selectedIds.length > 0 || isDeleting || isMoving) && (
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" startIcon={<PlaylistIcon />} endIcon={<ArrowDropDownIcon />} disabled={selectionDisabled} onClick={(e) => setMoveAnchor(e.currentTarget)} data-testid="bulk-move-button">
                          {isMoving ? Locale.label("sermons.bulkMove.moving") : Locale.label("sermons.bulkMove.action").replace("{count}", String(selectedIds.length))}
                        </Button>
                        <Menu anchorEl={moveAnchor} open={Boolean(moveAnchor)} onClose={() => setMoveAnchor(null)}>
                          <MenuItem onClick={() => handleMoveSelected("")}>{Locale.label("sermons.noPlaylist")}</MenuItem>
                          {playlists.map((p) => <MenuItem key={p.id} onClick={() => handleMoveSelected(p.id || "")}>{p.title}</MenuItem>)}
                        </Menu>
                        <Button size="small" color="error" variant="outlined" startIcon={<DeleteIcon />} disabled={selectionDisabled} onClick={handleDeleteSelected}>
                          {isDeleting ? Locale.label("sermons.bulkDelete.deleting") : Locale.label("sermons.bulkDelete.action").replace("{count}", String(selectedIds.length))}
                        </Button>
                      </Stack>
                    )}
                  </ResultsBar>
                )}
                {deleteError && <Alert severity="error" onClose={() => setDeleteError(false)}>{Locale.label("sermons.bulkDelete.error")}</Alert>}
                {moveError && <Alert severity="error" onClose={() => setMoveError(false)}>{Locale.label("sermons.bulkMove.error")}</Alert>}
                <Box sx={tableScrollSx} role="region" aria-label={Locale.label("sermons.title")} tabIndex={0}>
                  {getTable()}
                </Box>
              </Stack>
            </Surface>
          </Grid>

          <Grid size={{ xs: 12, lg: 4 }}>
            <Stack spacing={3}>
              {currentPlaylist !== null && (
                <Box>
                  {imageEditor}
                  <PlaylistEdit
                    currentPlaylist={currentPlaylist}
                    updatedFunction={handlePlaylistUpdated}
                    showPhotoEditor={showPhotoEditor}
                    updatedPhoto={(photoType === "playlist" && photoUrl) || null}
                  />
                </Box>
              )}
              <Surface data-testid="playlists-panel">
                {playlistTitle}
                {playlists.length > 5 && <Box sx={{ mb: 1 }}><SearchField size="small" value={playlistSearch} onChange={setPlaylistSearch} label={Locale.label("sermons.playlists.searchPlaceholder")} data-testid="playlist-search-input" /></Box>}
                {isLoading ? <Loading /> : (
                  <Table size="small">
                    <TableBody>{getPlaylistRows()}</TableBody>
                  </Table>
                )}
              </Surface>
              {podcastFeedUrl && (
                <Surface data-testid="podcast-feed-url">
                  <Typography variant="h3" component="h2" sx={{ mb: 1 }}>{Locale.label("sermons.podcast.title")}</Typography>
                  <Stack direction="row" spacing={0.5} alignItems="flex-start">
                    <Typography variant="body2" component="code" sx={{ wordBreak: "break-all", fontFamily: "monospace", flex: 1 }}>{podcastFeedUrl}</Typography>
                    <IconButton size="small" onClick={copyFeedUrl} aria-label={Locale.label("sermons.podcast.copyFeedUrl")} data-testid="copy-podcast-feed-url">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>{Locale.label("sermons.podcast.hint")}</Typography>
                </Surface>
              )}
            </Stack>
          </Grid>
        </Grid>
      </SermonChrome>
      <Snackbar open={copySnackbar} autoHideDuration={2500} onClose={() => setCopySnackbar(false)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" variant="filled" onClose={() => setCopySnackbar(false)}>{Locale.label("sermons.podcast.feedUrlCopied")}</Alert>
      </Snackbar>
      <Snackbar open={moveSnackbar !== null} autoHideDuration={4000} onClose={() => setMoveSnackbar(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        <Alert severity="success" variant="filled" onClose={() => setMoveSnackbar(null)}>{moveSnackbar}</Alert>
      </Snackbar>
    </>
  );
};
