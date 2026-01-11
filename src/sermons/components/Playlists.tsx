import { Loading, Locale } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import { PageHeader } from "@churchapps/apphelper";
import { ImageEditor } from "@churchapps/apphelper";
import type { PlaylistInterface } from "@churchapps/helpers";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  TextField,
  Box,
  Tooltip
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  VideoLibrary as VideoLibraryIcon,
  Search as SearchIcon
} from "@mui/icons-material";
import React from "react";
import { PlaylistEdit } from "./PlaylistEdit";

export const Playlists = () => {
  const [playlists, setPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [filteredPlaylists, setFilteredPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [currentPlaylist, setCurrentPlaylist] = React.useState<PlaylistInterface>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [showSearch, setShowSearch] = React.useState<boolean>(false);
  const [photoUrl, setPhotoUrl] = React.useState<string>(null);
  const [photoType, setPhotoType] = React.useState<string>(null);
  const imageEditorRef = React.useRef<HTMLDivElement>(null);

  const handleUpdated = () => {
    setCurrentPlaylist(null);
    loadData();
  };

  const showPhotoEditor = (pType: string, url: string) => {
    setPhotoUrl(url);
    setPhotoType(pType);
  };

  const handlePhotoUpdated = (dataUrl: string) => {
    setPhotoUrl(dataUrl);
    setPhotoType(photoType);
  };

  const loadData = () => {
    ApiHelper.get("/playlists", "ContentApi").then((data: any) => {
      setPlaylists(data);
      setFilteredPlaylists(data);
      setIsLoading(false);
    });
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const term = event.target.value.toLowerCase();
    setSearchTerm(term);

    if (term === "") {
      setFilteredPlaylists(playlists);
    } else {
      const filtered = playlists.filter((playlist: any) =>
        playlist.title.toLowerCase().includes(term)
        || (playlist.description && playlist.description.toLowerCase().includes(term)));
      setFilteredPlaylists(filtered);
    }
  };

  const handleAdd = () => {
    const v: PlaylistInterface = { churchId: UserHelper.currentUserChurch.church.id, title: Locale.label("sermons.playlists.playlistEdit.newPlaylist"), description: "", publishDate: new Date(), thumbnail: "" };
    setCurrentPlaylist(v);
    loadData();
  };

  const getTableRows = () => filteredPlaylists.map((playlist) => (
    <TableRow
      key={playlist.id}
      sx={{
        '&:hover': { backgroundColor: 'action.hover' },
        transition: 'background-color 0.2s ease',
        '&:last-child td': {
          borderBottom: 0
        }
      }}
    >
      <TableCell>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          {playlist.title}
        </Typography>
        {playlist.description && (
          <Typography variant="body2" color="text.secondary">
            {playlist.description}
          </Typography>
        )}
      </TableCell>
      <TableCell align="right">
        <Tooltip title={Locale.label("sermons.playlists.editPlaylist")} arrow>
          <IconButton
            size="small"
            onClick={() => setCurrentPlaylist(playlist)}
            sx={{
              color: 'primary.main',
              '&:hover': {
                backgroundColor: 'primary.main',
                color: 'white',
                transform: 'scale(1.05)'
              },
              transition: 'all 0.2s ease-in-out'
            }}
          >
            <EditIcon />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  ));

  const getEmptyState = () => {
    const isSearching = searchTerm.length > 0;

    return (
      <TableRow>
        <TableCell colSpan={2} sx={{ textAlign: 'center', py: 6, borderBottom: 0 }}>
          <Stack spacing={2} alignItems="center">
            <VideoLibraryIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
            <Typography variant="h6" color="text.secondary">
              {isSearching ? Locale.label("sermons.playlists.noPlaylistsMatch") : Locale.label("sermons.playlists.noPlaylistsFound")}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {isSearching ? Locale.label("sermons.playlists.adjustSearchTerms") : Locale.label("sermons.playlists.getStarted")}
            </Typography>
            {!isSearching && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAdd}
                data-testid="add-playlist-button"
              >
                {Locale.label("sermons.playlists.createFirstPlaylist")}
              </Button>
            )}
          </Stack>
        </TableCell>
      </TableRow>
    );
  };

  const getTable = () => {
    if (isLoading) return <Loading />;

    return (
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead
            sx={{
              backgroundColor: 'var(--bg-card)',
              '& .MuiTableCell-root': {
                borderBottom: '2px solid',
                borderBottomColor: 'divider'
              }
            }}
          >
            <TableRow>
              <TableCell>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {Locale.label("sermons.playlist")}
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {Locale.label("sermons.playlists.actions")}
                </Typography>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredPlaylists.length === 0 ? getEmptyState() : getTableRows()}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  React.useEffect(() => {
    loadData();
  }, []);

  React.useEffect(() => {
    if (searchTerm === "") {
      setFilteredPlaylists(playlists);
    }
  }, [playlists, searchTerm]);

  React.useEffect(() => {
    if (!showSearch) {
      setSearchTerm("");
      setFilteredPlaylists(playlists);
    }
  }, [showSearch, playlists]);

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

  if (currentPlaylist !== null) {
    return (
      <>
        {imageEditor}
        <PlaylistEdit
          currentPlaylist={currentPlaylist}
          updatedFunction={handleUpdated}
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
          icon={<VideoLibraryIcon />}
          title={Locale.label("sermons.playlists.title")}
          subtitle={Locale.label("sermons.playlists.subtitle")}
        >
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<SearchIcon />}
              onClick={() => setShowSearch(!showSearch)}
              sx={{
                color: '#FFF',
                borderColor: showSearch ? '#FFF' : 'rgba(255,255,255,0.5)',
                backgroundColor: showSearch ? 'rgba(255,255,255,0.1)' : 'transparent',
                '&:hover': {
                  borderColor: '#FFF',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              {Locale.label("sermons.playlists.search")}
            </Button>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAdd}
              data-testid="add-playlist-button"
              sx={{
                color: '#FFF',
                borderColor: 'rgba(255,255,255,0.5)',
                '&:hover': {
                  borderColor: '#FFF',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              {Locale.label("sermons.playlists.addPlaylist")}
            </Button>
          </Stack>
        </PageHeader>
      </Box>

      {/* Content */}
      <Box sx={{ p: 3 }}>
        {imageEditor}
        <Card sx={{
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'var(--border-light)'
        }}>
          {/* Search Bar - Conditionally Rendered */}
          {showSearch && (
            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
              <TextField
                fullWidth
                variant="outlined"
                placeholder={Locale.label("sermons.playlists.searchPlaceholder")}
                value={searchTerm}
                onChange={handleSearch}
                size="small"
                autoFocus
                InputProps={{
                  startAdornment: (
                    <SearchIcon sx={{ color: 'text.secondary', mr: 1 }} />
                  )
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'var(--bg-card)'
                  }
                }}
              />
            </Box>
          )}

          <CardContent sx={{ p: 0 }}>
            {getTable()}
          </CardContent>
        </Card>
      </Box>
    </>
  );
};
