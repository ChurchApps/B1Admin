import React, { memo, useMemo, useCallback } from "react";
import { ApiHelper, Loading, Locale, PageHeader, UserHelper, Permissions } from "@churchapps/apphelper";
import { Link, Navigate } from "react-router-dom";
import { Button, Box, Card, CardContent, Typography, Stack, Avatar, Paper, Chip, IconButton, TextField, InputAdornment } from "@mui/material";
import { MusicNote as MusicIcon, LibraryMusic as LibraryIcon, Add as AddIcon, Search as SearchIcon, PlayCircle as PlayIcon, Timer as TimerIcon, Person as ArtistIcon } from "@mui/icons-material";
import { SongSearchDialog } from "./SongSearchDialog";
import { type ArrangementInterface, type ArrangementKeyInterface, type SongDetailInterface, type SongInterface } from "../../helpers";
import { useQuery } from "@tanstack/react-query";

export const SongsPage = memo(() => {
  const [showSearch, setShowSearch] = React.useState(false);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [redirect, setRedirect] = React.useState("");
  const [searchFilter, setSearchFilter] = React.useState("");
  const [showSearchField, setShowSearchField] = React.useState(false);
  const [failedImages, setFailedImages] = React.useState<Set<string>>(new Set());

  const songs = useQuery<SongDetailInterface[]>({
    queryKey: ["/songDetails", "ContentApi"],
    placeholderData: []
  });

  const handleAdd = useCallback(
    async (songDetail: SongDetailInterface) => {
      let selectedSong = null;
      if (!songDetail.id) {
        songDetail = await ApiHelper.post("/songDetails/create", songDetail, "ContentApi");
      }

      const existing = await ApiHelper.get("/arrangements/songDetail/" + songDetail.id, "ContentApi");
      if (existing.length > 0) {
        const song = await ApiHelper.get("/songs/" + existing[0].songId, "ContentApi");
        selectedSong = song;
      } else {
        const s: SongInterface = { name: songDetail.title, dateAdded: new Date() };
        const songs = await ApiHelper.post("/songs", [s], "ContentApi");
        const a: ArrangementInterface = {
          songId: songs[0].id,
          songDetailId: songDetail.id,
          name: "(Default)",
          lyrics: ""
        };
        const arrangements = await ApiHelper.post("/arrangements", [a], "ContentApi");
        if (songDetail.keySignature) {
          const key: ArrangementKeyInterface = {
            arrangementId: arrangements[0].id,
            keySignature: songDetail.keySignature,
            shortDescription: "Default"
          };
          await ApiHelper.post("/arrangementKeys", [key], "ContentApi");
        }
        selectedSong = songs[0];
      }

      songs.refetch();
      setShowSearch(false);
      setRedirect("/serving/songs/" + selectedSong.id);
    },
    [songs]
  );

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const imgSrc = e.currentTarget.src;
    setFailedImages((prev) => new Set(prev).add(imgSrc));
  }, []);

  const formatSeconds = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }, []);

  const filteredSongs = useMemo(() => {
    if (!songs.data) return null;
    if (!searchFilter.trim()) return songs.data;

    const filter = searchFilter.toLowerCase();
    return songs.data.filter((song) => song.title?.toLowerCase().includes(filter) || song.artist?.toLowerCase().includes(filter));
  }, [songs.data, searchFilter]);

  const songsContent = useMemo(() => {
    if (songs.isLoading) return <Loading size="sm" />;

    if (songs.data.length === 0) {
      return (
        <Paper sx={{ p: 6, textAlign: "center", backgroundColor: "var(--bg-sub)", border: "1px dashed", borderColor: "var(--border-main)" }}>
          <LibraryIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            {Locale.label("songs.library.empty.title") || "No Songs Found"}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            {Locale.label("songs.library.empty.message") || "Get started by adding your first song to the library."}
          </Typography>
          {canEdit && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setShowSearch(true)} size="large">
              {Locale.label("songs.library.empty.action") || "Add First Song"}
            </Button>
          )}
        </Paper>
      );
    }

    if (filteredSongs && filteredSongs.length === 0) {
      return (
        <Paper sx={{ p: 4, textAlign: "center", backgroundColor: "var(--bg-sub)", border: "1px dashed", borderColor: "var(--border-main)" }}>
          <SearchIcon sx={{ fontSize: 48, color: "text.secondary", mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            {Locale.label("songs.library.noResults") || "No songs match your search criteria."}
          </Typography>
        </Paper>
      );
    }

    return (
      <Box sx={{ "& .MuiCard-root": { borderRadius: 2, border: "1px solid", borderColor: "var(--border-light)" } }}>
        <Stack spacing={2}>
          {filteredSongs?.map((songDetail) => (
            <Card key={songDetail.id} sx={{ transition: "all 0.2s ease-in-out", "&:hover": { transform: "translateY(-1px)", boxShadow: 2 } }}>
              <CardContent sx={{ pb: "16px !important" }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  {/* Thumbnail/Avatar */}
                  <Avatar
                    src={songDetail.thumbnail && !failedImages.has(songDetail.thumbnail) ? songDetail.thumbnail : undefined}
                    sx={{ width: 60, height: 60, bgcolor: "primary.light" }}
                    onError={handleImageError}>
                    <MusicIcon sx={{ fontSize: 28, color: "primary.main" }} />
                  </Avatar>

                  {/* Song Info */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="h6"
                      component={Link}
                      to={`/serving/songs/${(songDetail as any).songId}`}
                      sx={{ color: "primary.main", textDecoration: "none", fontWeight: 600, fontSize: "1.1rem", "&:hover": { textDecoration: "underline" }, display: "block", mb: 0.5 }}>
                      {songDetail.title}
                    </Typography>

                    <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
                      {songDetail.artist && (
                        <Chip icon={<ArtistIcon />} label={songDetail.artist} variant="outlined" size="small" sx={{ color: "text.secondary", borderColor: "var(--border-main)", fontSize: "0.75rem" }} />
                      )}

                      {songDetail.seconds && (
                        <Chip
                          icon={<TimerIcon />}
                          label={formatSeconds(songDetail.seconds)}
                          variant="outlined"
                          size="small"
                          sx={{ color: "text.secondary", borderColor: "var(--border-main)", fontSize: "0.75rem" }}
                        />
                      )}
                    </Stack>
                  </Box>

                  {/* Action Button */}
                  <IconButton
                    component={Link}
                    to={`/serving/songs/${(songDetail as any).songId}`}
                    sx={{ color: "primary.main", "&:hover": { backgroundColor: "primary.light", color: "primary.dark" } }}
                    aria-label={`Play ${songDetail.title}`}>
                    <PlayIcon />
                  </IconButton>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
      </Box>
    );
  }, [songs.isLoading, songs.data, filteredSongs, formatSeconds, handleImageError, failedImages, canEdit]);

  if (redirect) return <Navigate to={redirect} />;

  return (
    <>
      <PageHeader icon={<LibraryIcon />} title={Locale.label("songs.title") || Locale.label("songs.songsPage.songs")} subtitle={Locale.label("songs.songsPage.subtitle")}>
        <Button
          variant="outlined"
          startIcon={<SearchIcon />}
          onClick={() => setShowSearchField(!showSearchField)}
          sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>
          Search
        </Button>
        {canEdit && (
          <Button
            onClick={() => setShowSearch(true)}
            variant="outlined"
            startIcon={<AddIcon />}
            data-testid="add-song-button"
            aria-label="Add song"
            sx={{ color: "#FFF", borderColor: "rgba(255,255,255,0.5)", "&:hover": { borderColor: "#FFF", backgroundColor: "rgba(255,255,255,0.1)" } }}>
            {Locale.label("songs.addSong") || "Add Song"}
          </Button>
        )}
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {(showSearchField || searchFilter) && songs.data && songs.data.length > 0 && (
          <Card sx={{ mb: 3, borderRadius: 2, border: "1px solid", borderColor: "var(--border-light)" }}>
            <CardContent sx={{ pb: "16px !important" }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <SearchIcon sx={{ color: "primary.main", fontSize: 24 }} />
                <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                  Search Songs
                </Typography>
              </Stack>
              <TextField
                fullWidth
                variant="outlined"
                placeholder={Locale.label("songs.search.placeholder") || "Search songs by title or artist..."}
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  )
                }}
                autoFocus={showSearchField}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "var(--bg-sub)", "&:hover": { backgroundColor: "var(--bg-card)" }, "&.Mui-focused": { backgroundColor: "var(--bg-card)" } } }}
              />
            </CardContent>
          </Card>
        )}

        {songsContent}
      </Box>

      {showSearch && canEdit && <SongSearchDialog onClose={() => setShowSearch(false)} onSelect={handleAdd} />}
    </>
  );
});
