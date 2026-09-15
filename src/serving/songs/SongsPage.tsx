import React, { memo, useMemo, useCallback } from "react";
import { ApiHelper, Loading, Locale, PageHeader, UserHelper, Permissions } from "@churchapps/apphelper";
import { Link, Navigate } from "react-router-dom";
import { Button, Box, Card, CardContent, Typography, Stack, Avatar, Chip, IconButton, TextField, InputAdornment, Tooltip, Checkbox, FormControlLabel, TablePagination } from "@mui/material";
import { MusicNote as MusicIcon, LibraryMusic as LibraryIcon, Add as AddIcon, Search as SearchIcon, PlayCircle as PlayIcon, Timer as TimerIcon, Person as ArtistIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { SongSearchDialog } from "./SongSearchDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { HeaderPrimaryButton, HeaderSecondaryButton } from "../../components/ui";
import { type ArrangementInterface, type ArrangementKeyInterface, type SongDetailInterface, type SongInterface } from "../../helpers";
import { useQuery } from "@tanstack/react-query";
import { useConfirmDelete } from "../../hooks";

export const SongsPage = memo(() => {
  const [showSearch, setShowSearch] = React.useState(false);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [redirect, setRedirect] = React.useState("");
  const [searchFilter, setSearchFilter] = React.useState("");
  const [showSearchField, setShowSearchField] = React.useState(false);
  const [failedImages, setFailedImages] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const songs = useQuery<{ songDetails: SongDetailInterface[], count: number }>({
    queryKey: [`/songDetails?limit=${rowsPerPage}&offset=${page * rowsPerPage}&search=${searchFilter}`, "ContentApi"],
    placeholderData: { songDetails: [], count: 0 }
  });

  const handlePageChange = useCallback((_: unknown, newPage: number) => {
    setPage(newPage);
  }, []);

  const handleRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(e.target.value, 10);
    setRowsPerPage(newLimit);
    setPage(0);
  }, []);

  const handleAdd = useCallback(
    async (songDetail: SongDetailInterface) => {
      let selectedSong;
      if (!songDetail.id) {
        songDetail = await ApiHelper.post("/songDetails/create", songDetail, "ContentApi");
      }

      const existing = await ApiHelper.get("/arrangements/songDetail/" + songDetail.id, "ContentApi");
      if (existing.length > 0) {
        const song = await ApiHelper.get("/songs/" + existing[0].songId, "ContentApi");
        if (song?.id) {
          // Song and arrangement both exist — use them
          selectedSong = song;
        } else {
          // Arrangement exists but song record is missing (orphaned) — create it
          const s: SongInterface = { name: songDetail.title, songDetailId: songDetail.id, dateAdded: new Date() };
          const newSongs = await ApiHelper.post("/songs", [s], "ContentApi");
          selectedSong = newSongs[0];
        }
      } else {
        const s: SongInterface = { name: songDetail.title, songDetailId: songDetail.id, dateAdded: new Date() };
        const newSongs = await ApiHelper.post("/songs", [s], "ContentApi");
        const a: ArrangementInterface = {
          songId: newSongs[0].id,
          songDetailId: songDetail.id,
          name: "(Default)",
          lyrics: ""
        };
        const arrangements = await ApiHelper.post("/arrangements", [a], "ContentApi");
        const key: ArrangementKeyInterface = {
          arrangementId: arrangements[0].id,
          keySignature: songDetail.keySignature || "",
          shortDescription: "Default"
        };
        await ApiHelper.post("/arrangementKeys", [key], "ContentApi");
        selectedSong = newSongs[0];
      }

      songs.refetch();
      setShowSearch(false);
      setRedirect("/serving/songs/" + selectedSong.id);
    },
    [songs]
  );

  const toggleSelected = useCallback((songId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(songId)) next.delete(songId);
      else next.add(songId);
      return next;
    });
  }, []);

  const handleBulkDelete = useCallback(async () => {
    if (selected.size === 0) return;
    if (!(await confirm(Locale.label("songs.songsPage.deleteSelectedConfirm") || "Delete the selected songs? This cannot be undone."))) return;
    await Promise.all([...selected].map((id) => ApiHelper.delete("/songs/" + id, "ContentApi")));
    setSelected(new Set());
    songs.refetch();
  }, [selected, songs, confirm]);

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
    const songList = songs.data?.songDetails;
    if (!songList) return null;
    // Dedupe by songId: /songDetails join produces one row per arrangement.
    const seen = new Set<string>();
    const unique = songList.filter((song) => {
      const id = (song as any).songId || song.id;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    return unique;
  }, [songs.data?.songDetails]);

  // Select all / deselect all is scoped to the songs on the current page (same as the People list and plan sections).
  const visibleSongIds = useMemo(() => filteredSongs?.map((song) => (song as any).songId || song.id) ?? [], [filteredSongs]);
  const visibleSelectedCount = useMemo(() => visibleSongIds.filter((id) => selected.has(id)).length, [visibleSongIds, selected]);
  const allVisibleSelected = visibleSongIds.length > 0 && visibleSelectedCount === visibleSongIds.length;

  const handleSelectAll = useCallback((checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      visibleSongIds.forEach((id) => {
        if (checked) next.add(id);
        else next.delete(id);
      });
      return next;
    });
  }, [visibleSongIds]);

  const songsContent = useMemo(() => {
    if (songs.isLoading) return <Loading size="sm" />;

    if ((songs.data?.songDetails?.length ?? 0) === 0) {
      if (searchFilter.trim()) {
        return <EmptyState icon={<SearchIcon />} title={Locale.label("songs.library.noResults") || "No songs match your search criteria."} />;
      }
      return (
        <EmptyState
          icon={<LibraryIcon />}
          title={Locale.label("songs.library.empty.title") || "No Songs Found"}
          description={Locale.label("songs.library.empty.message") || "Get started by adding your first song to the library."}
          action={canEdit && (
            <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={() => setShowSearch(true)} size="large">
              {Locale.label("songs.library.empty.action") || "Add First Song"}
            </Button>
          )}
        />
      );
    }

    if (filteredSongs && filteredSongs.length === 0) {
      return <EmptyState icon={<SearchIcon />} title={Locale.label("songs.library.noResults") || "No songs match your search criteria."} />;
    }

    return (
      <Box sx={{ "& .MuiCard-root": { borderRadius: 2, border: "1px solid", borderColor: "divider" } }}>
        {canEdit && (
          <FormControlLabel
            sx={{ ml: 2, mb: 1 }}
            control={
              <Checkbox
                checked={allVisibleSelected}
                indeterminate={!allVisibleSelected && visibleSelectedCount > 0}
                onChange={(e) => handleSelectAll(e.target.checked)}
                data-testid="select-all-songs"
                slotProps={{ input: { "aria-label": Locale.label("songs.songsPage.selectAll") || "Select all" } }}
              />
            }
            label={
              <Typography variant="body2" color="text.secondary">
                {allVisibleSelected ? Locale.label("songs.songsPage.deselectAll") || "Deselect all" : Locale.label("songs.songsPage.selectAll") || "Select all"}
              </Typography>
            }
          />
        )}
        <Stack spacing={2}>
          {filteredSongs?.map((songDetail) => (
            <Card key={(songDetail as any).songId || songDetail.id} sx={{ transition: "all 0.2s ease-in-out", "&:hover": { transform: "translateY(-1px)", boxShadow: 2 } }}>
              <CardContent sx={{ pb: 2, "&:last-child": { pb: 2 } }}>
                <Stack direction="row" spacing={2} alignItems="center">
                  {canEdit && (
                    <Checkbox
                      checked={selected.has((songDetail as any).songId || songDetail.id)}
                      onChange={() => toggleSelected((songDetail as any).songId || songDetail.id)}
                      aria-label={Locale.label("common.select") || "Select"}
                      data-testid="song-select-checkbox"
                    />
                  )}
                  <Avatar
                    src={songDetail.thumbnail && !failedImages.has(songDetail.thumbnail) ? songDetail.thumbnail : undefined}
                    sx={{ width: 60, height: 60, bgcolor: "primary.light" }}
                    onError={handleImageError}>
                    <MusicIcon sx={{ fontSize: 28, color: "primary.main" }} />
                  </Avatar>

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
                        <Chip icon={<ArtistIcon />} label={songDetail.artist} variant="outlined" size="small" sx={{ color: "text.secondary", borderColor: "divider", fontSize: "0.75rem" }} />
                      )}

                      {songDetail.seconds && (
                        <Chip
                          icon={<TimerIcon />}
                          label={formatSeconds(songDetail.seconds)}
                          variant="outlined"
                          size="small"
                          sx={{ color: "text.secondary", borderColor: "divider", fontSize: "0.75rem" }}
                        />
                      )}
                    </Stack>
                  </Box>

                  <Tooltip title={`Play ${songDetail.title}`}>
                    <IconButton
                      component={Link}
                      to={`/serving/songs/${(songDetail as any).songId}`}
                      sx={{ color: "primary.main", "&:hover": { backgroundColor: "primary.light", color: "primary.dark" } }}
                      aria-label={`Play ${songDetail.title}`}>
                      <PlayIcon />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </CardContent>
            </Card>
          ))}
        </Stack>
        <TablePagination
          component="div"
          count={songs.data?.count ?? 0}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50]}
          sx={{ mt: 2 }}
        />
      </Box>
    );
  }, [
    songs.isLoading,
    songs.data,
    filteredSongs,
    formatSeconds,
    handleImageError,
    failedImages,
    canEdit,
    selected,
    toggleSelected,
    allVisibleSelected,
    visibleSelectedCount,
    handleSelectAll,
    page,
    rowsPerPage,
    handlePageChange,
    handleRowsPerPageChange
  ]);

  if (redirect) return <Navigate to={redirect} />;

  return (
    <>
      {ConfirmDialogElement}
      <PageHeader icon={<MusicIcon />} title={Locale.label("songs.title") || Locale.label("songs.songsPage.songs")} subtitle={Locale.label("songs.songsPage.subtitle")}>
        <HeaderSecondaryButton startIcon={<SearchIcon />} onClick={() => setShowSearchField(!showSearchField)}>
          {Locale.label("songs.songsPage.search")}
        </HeaderSecondaryButton>
        {canEdit && selected.size > 0 && (
          <HeaderSecondaryButton onClick={handleBulkDelete} startIcon={<DeleteIcon />} data-testid="delete-selected-button">
            {(Locale.label("songs.songsPage.deleteSelected") || "Delete Selected") + " (" + selected.size + ")"}
          </HeaderSecondaryButton>
        )}
        {canEdit && (
          <HeaderPrimaryButton
            onClick={() => setShowSearch(true)}
            startIcon={<AddIcon />}
            data-testid="add-song-button"
            aria-label={Locale.label("songs.songsPage.addSongAria")}>
            {Locale.label("songs.addSong") || "Add Song"}
          </HeaderPrimaryButton>
        )}
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {(showSearchField || searchFilter) && songs.data && ((songs.data.songDetails?.length ?? 0) > 0 || searchFilter) && (
          <Card sx={{ mb: 3, borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
            <CardContent sx={{ pb: 2, "&:last-child": { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                <SearchIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="h6">
                  {Locale.label("songs.songsPage.searchSongs")}
                </Typography>
              </Stack>
              <TextField
                fullWidth
                variant="outlined"
                placeholder={Locale.label("songs.search.placeholder") || "Search songs by title or artist..."}
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setPage(0);
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon color="action" />
                    </InputAdornment>
                  )
                }}
                autoFocus={showSearchField}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, backgroundColor: "background.subtle", "&:hover": { backgroundColor: "background.paper" }, "&.Mui-focused": { backgroundColor: "background.paper" } } }}
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
