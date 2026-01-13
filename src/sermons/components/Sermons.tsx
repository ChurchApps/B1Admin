import { Loading, Locale } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import { ArrayHelper } from "@churchapps/apphelper";
import { DateHelper } from "@churchapps/apphelper";
import { PageHeader } from "@churchapps/apphelper";
import type { SermonInterface, PlaylistInterface } from "@churchapps/helpers";
import {
  Box, Button, Card, CardContent, Icon, IconButton, InputAdornment, Menu, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import { Add as AddIcon, CalendarMonth as CalendarIcon, LiveTv as LiveTvIcon, PlaylistPlay as PlaylistIcon, Search as SearchIcon, ArrowDropDown as ArrowDropDownIcon } from "@mui/icons-material";
import React from "react";
import { SermonEdit } from "./SermonEdit";

export const Sermons = () => {
  const [sermons, setSermons] = React.useState<SermonInterface[]>([]);
  const [filteredSermons, setFilteredSermons] = React.useState<SermonInterface[]>([]);
  const [playlists, setPlaylists] = React.useState<PlaylistInterface[]>([]);
  const [currentSermon, setCurrentSermon] = React.useState<SermonInterface>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

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

  const getActionButtons = () => (
    <>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        endIcon={<ArrowDropDownIcon />}
        onClick={handleMenuClick}
        data-testid="add-sermon-button"
        sx={{
          color: '#FFF',
          borderColor: 'rgba(255,255,255,0.5)',
          '&:hover': {
            borderColor: '#FFF',
            backgroundColor: 'rgba(255,255,255,0.1)'
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
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
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
            <LiveTvIcon fontSize="small" sx={{ color: 'error.main' }} />
            <Typography>{Locale.label("sermons.addPermanentLiveUrl")}</Typography>
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
    const v: SermonInterface = {
      churchId: UserHelper.currentUserChurch.church.id, duration: 5400, videoType: "youtube", videoData: "", title: Locale.label("sermons.sermonEdit.newSermon"), permanentUrl
    };
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


  const getRows = () => {
    const rows: React.ReactElement[] = [];
    filteredSermons.forEach((video: any) => {
      rows.push(
        <TableRow
          key={video.id}
          sx={{
            '&:hover': { backgroundColor: 'action.hover' },
            transition: 'background-color 0.2s ease'
          }}
        >
          <TableCell>
            <Stack direction="row" spacing={1} alignItems="center">
              <PlaylistIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
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
              <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {(video.publishDate) ? DateHelper.prettyDate(DateHelper.toDate(video.publishDate)) : Locale.label("sermons.notScheduled")}
              </Typography>
            </Stack>
          </TableCell>
          <TableCell align="right">
            <Tooltip title={Locale.label("common.edit")}>
              <IconButton
                size="small"
                onClick={() => { setCurrentSermon(video); }}
                data-testid={`edit-sermon-${video.id}`}
                aria-label={`Edit ${video.title}`}
                sx={{ color: 'primary.main' }}
              >
                <Icon>edit</Icon>
              </IconButton>
            </Tooltip>
          </TableCell>
        </TableRow>
      );
    });
    return rows;
  };

  const getEmptyState = () => (
    <TableRow>
      <TableCell colSpan={4} sx={{ textAlign: 'center', py: 8 }}>
        <Stack spacing={2} alignItems="center">
          <LiveTvIcon sx={{ fontSize: 64, color: 'text.secondary' }} />
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
              backgroundColor: 'var(--bg-card)',
              '& .MuiTableCell-root': {
                borderBottom: '2px solid',
                borderBottomColor: 'divider',
                fontWeight: 600
              }
            }}
          >
            <TableRow>
              <TableCell sx={{ width: '25%' }}>{Locale.label("sermons.playlist")}</TableCell>
              <TableCell sx={{ width: '45%' }}>{Locale.label("sermons.sermon")}</TableCell>
              <TableCell sx={{ width: '25%' }}>{Locale.label("sermons.publishDate")}</TableCell>
              <TableCell sx={{ width: '5%' }}></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredSermons.length === 0 ? getEmptyState() : getRows()}
          </TableBody>
        </Table>
      );
    }
  };

  React.useEffect(() => { loadData(); }, []);

  if (currentSermon !== null) return <SermonEdit currentSermon={currentSermon} updatedFunction={handleUpdated} />;
  else {
    return (
      <>
        <Box sx={{ mb: 3 }}>
          <PageHeader
            icon={<LiveTvIcon />}
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

        {/* Content */}
        <Box sx={{ px: 3 }}>
          <Card sx={{
            borderRadius: 2,
            border: '1px solid',
            borderColor: 'var(--border-light)'
          }}>
            {/* Search Bar */}
            {sermons.length > 0 && (
              <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                <TextField
                  fullWidth
                  placeholder={Locale.label("sermons.searchPlaceholder")}
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                  sx={{ maxWidth: 400 }}
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
  }
};
