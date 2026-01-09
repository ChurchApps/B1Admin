import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Box, Card, CardContent, Typography, Stack, Avatar, IconButton, InputAdornment, Paper 
} from "@mui/material";
import { Search as SearchIcon, MusicNote as MusicIcon, Person as ArtistIcon, Close as CloseIcon, Add as AddIcon } from "@mui/icons-material";
import React, { useEffect, memo, useCallback, useMemo } from "react";
import { ApiHelper, Locale, Loading } from "@churchapps/apphelper";
import { type SongDetailInterface } from "../../helpers";
import { CreateSongDetail } from "./components/CreateSongDetail";

interface Props {
  searchText?: string;
  onClose: () => void;
  onSelect: (songDetail: SongDetailInterface) => void;
}

export const SongSearchDialog: React.FC<Props> = memo((props) => {
  const [searchText, setSearchText] = React.useState<string>(props.searchText || "");
  const [songDetails, setSongDetails] = React.useState<SongDetailInterface[]>(null);
  const [showCreate, setShowCreate] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);

  useEffect(() => {
    if (props.searchText) handleSearch();
  }, [props.searchText]); //eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) return;
    setIsSearching(true);
    try {
      const data = await ApiHelper.get("/praiseCharts/search?q=" + searchText, "ContentApi");
      setSongDetails(data);
    } catch (error) {
      console.error("Search failed:", error);
      setSongDetails([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<any>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch();
      }
    },
    [handleSearch]
  );

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    e.currentTarget.style.display = "none";
  }, []);

  const handleSongClick = useCallback(
    async (songDetail: SongDetailInterface) => {
      if (!songDetail.id) {
        songDetail = await ApiHelper.post("/songDetails/create", songDetail, "ContentApi");
      }
      props.onSelect(songDetail);
    },
    [props.onSelect]
  );

  const searchResults = useMemo(() => {
    if (isSearching) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <Loading size="sm" />
        </Box>
      );
    }

    if (songDetails === null) {
      return (
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: "grey.50",
            border: "1px dashed",
            borderColor: "grey.300",
          }}>
          <SearchIcon sx={{ fontSize: 48, color: "grey.400", mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {Locale.label("songs.search.enterQuery") || "Enter a search term to find songs."}
          </Typography>
        </Paper>
      );
    }

    if (songDetails.length === 0) {
      return (
        <Paper
          sx={{
            p: 4,
            textAlign: "center",
            backgroundColor: "grey.50",
            border: "1px dashed",
            borderColor: "grey.300",
          }}>
          <MusicIcon sx={{ fontSize: 48, color: "grey.400", mb: 2 }} />
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {Locale.label("songs.search.noResults") || "No songs found for your search."}
          </Typography>
          <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setShowCreate(true)} sx={{ mt: 2 }}>
            {Locale.label("songs.search.createManually") || "Create Manually"}
          </Button>
        </Paper>
      );
    }

    return (
      <Stack spacing={2}>
        {songDetails.map((songDetail, index) => (
          <Card
            key={index}
            sx={{
              cursor: "pointer",
              transition: "all 0.2s ease-in-out",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow: 2,
              },
            }}
            onClick={() => handleSongClick(songDetail)}>
            <CardContent sx={{ py: 2 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={songDetail.thumbnail}
                  sx={{
                    width: 60,
                    height: 60,
                    bgcolor: "primary.light",
                  }}
                  onError={handleImageError}>
                  <MusicIcon sx={{ fontSize: 28, color: "primary.main" }} />
                </Avatar>

                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      fontSize: "1rem",
                      mb: 0.5,
                      color: "primary.main",
                    }}>
                    {songDetail.title}
                  </Typography>

                  {songDetail.artist && (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ArtistIcon sx={{ fontSize: 16, color: "text.secondary" }} />
                      <Typography variant="body2" color="text.secondary">
                        {songDetail.artist}
                      </Typography>
                    </Stack>
                  )}
                </Box>

                <IconButton
                  sx={{
                    color: "primary.main",
                    "&:hover": { backgroundColor: "primary.light" },
                  }}
                  aria-label={`Select ${songDetail.title}`}>
                  <AddIcon />
                </IconButton>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    );
  }, [songDetails, isSearching, handleImageError, handleSongClick]);

  return (
    <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <SearchIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6">{Locale.label("songs.search.title") || "Search for a Song"}</Typography>
          </Stack>
          <IconButton onClick={props.onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pb: 2 }}>
        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label={Locale.label("songs.search.inputLabel") || "Title or Artist"}
            placeholder={Locale.label("songs.search.inputPlaceholder") || "Enter song title or artist name..."}
            value={searchText}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            data-testid="song-search-dialog-input"
            aria-label="Song title or artist"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Button variant="contained" onClick={handleSearch} disabled={!searchText.trim() || isSearching} data-testid="song-search-dialog-button" aria-label="Search songs">
                    {Locale.label("common.search") || "Search"}
                  </Button>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
        </Box>

        <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
          {!showCreate ? (
            <Box>
              {searchResults}

              {songDetails && songDetails.length > 0 && (
                <Box
                  sx={{
                    mt: 3,
                    pt: 2,
                    borderTop: "1px solid",
                    borderColor: "grey.200",
                  }}>
                  <Button variant="text" startIcon={<AddIcon />} onClick={() => setShowCreate(true)} sx={{ color: "text.secondary" }}>
                    {Locale.label("songs.search.createManually") || "Create Manually"}
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            <CreateSongDetail
              onSave={(sd: SongDetailInterface) => {
                props.onSelect(sd);
              }}
            />
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ width: "100%" }}>
          <Typography variant="caption" color="text.secondary">
            Powered by:{" "}
            <a href="https://www.praisecharts.com/?XID=churchapps" target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
              PraiseCharts
            </a>
          </Typography>
          <Button variant="outlined" onClick={props.onClose} data-testid="song-search-dialog-close" aria-label="Close dialog">
            {Locale.label("common.close") || "Close"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
});
