import { Loading, Locale } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import { ArrayHelper } from "@churchapps/apphelper";
import { DateHelper } from "@churchapps/apphelper";
import { PageHeader } from "@churchapps/apphelper";
import { ImageEditor } from "../../components/gallery";
import type { SermonInterface, PlaylistInterface } from "@churchapps/helpers";
import { Box, Button, Card, CardContent, Grid, InputAdornment, Menu, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { Add as AddIcon, CalendarMonth as CalendarIcon, CloudUpload as CloudUploadIcon, Edit as EditIcon, LiveTv as LiveTvIcon, PlaylistPlay as PlaylistIcon, Search as SearchIcon, ArrowDropDown as ArrowDropDownIcon, VideoLibrary as VideoLibraryIcon } from "@mui/icons-material";
import React from "react";
import { useNavigate } from "react-router-dom";
import { SermonEdit } from "./SermonEdit";
import { PlaylistEdit } from "./PlaylistEdit";
import { AppIconButton } from "../../components/ui/AppIconButton";

export const Sermons = () => {
  const [sermons, setSermons] = React.useState<SermonInterface[]>([]);
  const [filteredSermons, setFilteredSermons] = React.useState<SermonInterface[]>([]);
  const [playlists, setPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [currentSermon, setCurrentSermon] = React.useState<SermonInterface>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showSermonSearch, setShowSermonSearch] = React.useState<boolean>(false);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  // Playlist panel (right column) state
  const [currentPlaylist, setCurrentPlaylist] = React.useState<PlaylistInterface>(null);
  const [playlistSearch, setPlaylistSearch] = React.useState<string>("");
  const [showPlaylistSearch, setShowPlaylistSearch] = React.useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = React.useState<string>(null);
  const [photoType, setPhotoType] = React.useState<string>(null);
  const imageEditorRef = React.useRef<HTMLDivElement>(null);

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
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        endIcon={<ArrowDropDownIcon />}
        onClick={handleMenuClick}
        data-testid="add-sermon-button"
        sx={{
          color: "#FFF",
          borderColor: "rgba(255,255,255,0.5)",
          "&:hover": {
            borderColor: "#FFF",
            backgroundColor: "rgba(255,255,255,0.1)"
          }
        }}
      >
        {Locale.label("sermons.addSermon")}
      </Button>
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
    setCurrentSermon(v);
    loadData();
  };

  const getPlaylistTitle = (playlistId: string) => {
    let result = "";
    if (playlists) {
      const p: PlaylistInterface = ArrayHelper.getOne(playlists, "id", playlistId);
      if (p) result = p.title;
    }
    return result;
  };

  // ----- Playlist panel handlers -----

  const handlePlaylistUpdated = () => { setCurrentPlaylist(null); loadData(); };

  const showPhotoEditor = (pType: string, url: string) => {
    setPhotoUrl(url);
    setPhotoType(pType);
  };

  const handlePhotoUpdated = (dataUrl: string) => {
    setPhotoUrl(dataUrl);
    setPhotoType(photoType);
  };

  const handleAddPlaylist = () => {
    const v: PlaylistInterface = { churchId: UserHelper.currentUserChurch.church.id, title: Locale.label("sermons.playlists.playlistEdit.newPlaylist"), description: "", publishDate: new Date(), thumbnail: "" };
    setCurrentPlaylist(v);
  };

  const getRows = () => {
    const rows: React.ReactElement[] = [];
    filteredSermons.forEach((video: any) => {
      rows.push(
        <TableRow
          key={video.id}
          sx={{
            "&:hover": { backgroundColor: "action.hover" },
            transition: "background-color 0.2s ease"
          }}
        >
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <PlaylistIcon sx={{ fontSize: 16, color: "text.secondary" }} />
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
              <CalendarIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography variant="body2" color="text.secondary">
                {(video.publishDate) ? DateHelper.prettyDate(DateHelper.toDate(video.publishDate)) : Locale.label("sermons.notScheduled")}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell align="right">
            <AppIconButton
              label={Locale.label("common.edit")}
              icon={<EditIcon />}
              onClick={() => { setCurrentSermon(video); }}
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
        <Table sx={{ minWidth: 650 }}>
          <TableHead
            sx={{
              backgroundColor: "background.paper",
              "& .MuiTableCell-root": {
                borderBottom: "2px solid",
                borderBottomColor: "divider",
                fontWeight: 600
              }
            }}
          >
            <TableRow>
              <TableCell sx={{ width: "25%" }}>{Locale.label("sermons.playlist")}</TableCell>
              <TableCell sx={{ width: "45%" }}>{Locale.label("sermons.sermon")}</TableCell>
              <TableCell sx={{ width: "25%" }}>{Locale.label("sermons.publishDate")}</TableCell>
              <TableCell sx={{ width: "5%" }}></TableCell>
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
        sx={{
          "&:hover": { backgroundColor: "action.hover" },
          transition: "background-color 0.2s ease",
          "&:last-child td": { borderBottom: 0 }
        }}
      >
        <TableCell>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {playlist.title}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <AppIconButton
            label={Locale.label("common.edit")}
            icon={<EditIcon />}
            tone="card"
            onClick={() => setCurrentPlaylist(playlist)}
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

  if (currentSermon !== null) return <SermonEdit currentSermon={currentSermon} updatedFunction={handleUpdated} />;

  if (currentPlaylist !== null) {
    return (
      <>
        {imageEditor}
        <PlaylistEdit
          currentPlaylist={currentPlaylist}
          updatedFunction={handlePlaylistUpdated}
          showPhotoEditor={showPhotoEditor}
          updatedPhoto={(photoType === "playlist" && photoUrl) || null}
        />
      </>
    );
  }

  return (
    <>
      <Box sx={{ mb: 3 }}>
        <PageHeader
          title={Locale.label("sermons.title")}
          subtitle={Locale.label("sermons.subtitle")}
        >
          <Stack
            direction="row"
            spacing={1}
            sx={{
              flexShrink: 0,
              justifyContent: { xs: "flex-start", md: "flex-end" },
              width: { xs: "100%", md: "auto" }
            }}
          >
            {getActionButtons()}
          </Stack>
        </PageHeader>
      </Box>

      {/* Content: sermons (2/3) on the left, playlists (1/3) on the right */}
      <Box sx={{ px: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <Card sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider"
            }}>
              {/* Search Bar */}
              {sermons.length > 0 && (
                <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <LiveTvIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {Locale.label("sermons.title")}
                    </Typography>
                  </Stack>
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
                <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
                  <TextField
                    fullWidth
                    size="small"
                    autoFocus
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
                  />
                </Box>
              )}

              <CardContent sx={{ p: 0 }}>
                {getTable()}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card data-testid="playlists-panel" sx={{
              borderRadius: 2,
              border: "1px solid",
              borderColor: "divider"
            }}>
              <Box sx={{ p: 2, borderBottom: 1, borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <VideoLibraryIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {Locale.label("sermons.playlists.title")}
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={0.5}>
                  <AppIconButton
                    label={Locale.label("common.search")}
                    icon={<SearchIcon />}
                    tone={showPlaylistSearch ? "card" : "default"}
                    onClick={() => setShowPlaylistSearch(!showPlaylistSearch)}
                    data-testid="playlist-search-button"
                  />
                  <AppIconButton
                    intent="add"
                    label={Locale.label("common.add")}
                    icon={<AddIcon />}
                    tone="card"
                    onClick={handleAddPlaylist}
                    data-testid="add-playlist-button"
                  />
                </Stack>
              </Box>

              {showPlaylistSearch && (
                <Box sx={{ p: 1.5, borderBottom: 1, borderColor: "divider" }}>
                  <TextField
                    fullWidth
                    size="small"
                    autoFocus
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
                  />
                </Box>
              )}

              <CardContent sx={{ p: 0 }}>
                {isLoading ? <Loading /> : (
                  <Table size="small">
                    <TableBody>
                      {getPlaylistRows()}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};
