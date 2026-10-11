import React, { memo, useMemo, useCallback } from "react";
import { ApiHelper, Loading, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { Link as RouterLink, Navigate } from "react-router-dom";
import { Button, Box, Stack, Avatar, Link, Table, TableBody, TableCell, TableHead, TableRow, Checkbox, TablePagination, Typography } from "@mui/material";
import { MusicNote as MusicIcon, LibraryMusic as LibraryIcon, Add as AddIcon, Search as SearchIcon } from "@mui/icons-material";
import { SongSearchDialog } from "./SongSearchDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { BulkBar, HeaderPrimaryButton, PageContainer, PageHeader, ResultsBar, SearchField, Surface, TextAction, tableScrollSx } from "../../components/ui";
import { type ArrangementInterface, type ArrangementKeyInterface, type SongDetailInterface, type SongInterface } from "../../helpers";
import { useQuery } from "@tanstack/react-query";
import { useConfirmDelete } from "../../hooks";

export const SongsPage = memo(() => {
  const [showSearch, setShowSearch] = React.useState(false);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [redirect, setRedirect] = React.useState("");
  const [searchFilter, setSearchFilter] = React.useState("");
  const [failedImages, setFailedImages] = React.useState<Set<string>>(new Set());
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const songs = useQuery<{ songDetails: SongDetailInterface[], count: number }>({
    queryKey: [`/songDetails?limit=${rowsPerPage}&offset=${page * rowsPerPage}&search=${encodeURIComponent(searchFilter)}`, "ContentApi"],
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
        return <EmptyState variant="plain" icon={<SearchIcon />} title={Locale.label("songs.library.noResults") || "No songs match your search criteria."} />;
      }
      return (
        <EmptyState
          variant="plain"
          icon={<LibraryIcon />}
          title={Locale.label("songs.library.empty.title") || "No Songs Found"}
          description={Locale.label("songs.library.empty.message") || "Get started by adding your first song to the library."}
        />
      );
    }

    if (filteredSongs && filteredSongs.length === 0) {
      return <EmptyState variant="plain" icon={<SearchIcon />} title={Locale.label("songs.library.noResults") || "No songs match your search criteria."} />;
    }

    return (
      <>
        <Box sx={tableScrollSx} role="region" aria-label={Locale.label("songs.title") || "Songs"} tabIndex={0}>
          <Table>
            <TableHead>
              <TableRow>
                {canEdit && (
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={allVisibleSelected}
                      indeterminate={!allVisibleSelected && visibleSelectedCount > 0}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      data-testid="select-all-songs"
                      slotProps={{ input: { "aria-label": allVisibleSelected ? Locale.label("songs.songsPage.deselectAll") || "Deselect all" : Locale.label("songs.songsPage.selectAll") || "Select all" } }}
                    />
                  </TableCell>
                )}
                <TableCell>{Locale.label("songs.songsPage.songs") || "Song"}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredSongs?.map((songDetail) => {
                const songId = (songDetail as any).songId || songDetail.id;
                return (
                  <TableRow key={songId}>
                    {canEdit && (
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selected.has(songId)}
                          onChange={() => toggleSelected(songId)}
                          aria-label={Locale.label("common.select") || "Select"}
                          data-testid="song-select-checkbox"
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar
                          variant="rounded"
                          src={songDetail.thumbnail && !failedImages.has(songDetail.thumbnail) ? songDetail.thumbnail : undefined}
                          sx={{ width: 40, height: 40, bgcolor: "var(--b1-selected)", color: "var(--b1-on-selected)" }}
                          onError={handleImageError}>
                          <MusicIcon />
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Link component={RouterLink} to={`/serving/songs/${(songDetail as any).songId}`} underline="hover" sx={{ fontWeight: 600 }}>
                            {songDetail.title}
                          </Link>
                          {(songDetail.artist || songDetail.seconds) && (
                            <Typography variant="body2" color="text.secondary">
                              {[songDetail.artist, songDetail.seconds ? formatSeconds(songDetail.seconds) : ""].filter(Boolean).join(" · ")}
                            </Typography>
                          )}
                        </Box>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Box>
        <TablePagination
          component="div"
          count={songs.data?.count ?? 0}
          page={page}
          onPageChange={handlePageChange}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleRowsPerPageChange}
          rowsPerPageOptions={[10, 25, 50]}
        />
      </>
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

  const selectedNames = (filteredSongs || []).filter((sd) => selected.has((sd as any).songId || sd.id)).slice(0, 3).map((sd) => sd.title).join(", ");

  return (
    <>
      {ConfirmDialogElement}
      <PageHeader title={Locale.label("songs.title") || Locale.label("songs.songsPage.songs")} subtitle={Locale.label("songs.songsPage.subtitle")}>
        {canEdit && (
          <HeaderPrimaryButton startIcon={<AddIcon />} onClick={() => setShowSearch(true)} data-testid="add-song-button" aria-label={Locale.label("songs.songsPage.addSongAria")}>
            {Locale.label("songs.addSong") || "Add Song"}
          </HeaderPrimaryButton>
        )}
      </PageHeader>

      <PageContainer>
        <Surface>
          <Stack spacing={3}>
            <SearchField
              label={Locale.label("songs.songsPage.searchSongs")}
              placeholder={Locale.label("songs.search.placeholder") || "Search songs by title or artist..."}
              value={searchFilter}
              onChange={(v) => {
                setSearchFilter(v);
                setPage(0);
              }}
            />
            {!songs.isLoading && (songs.data?.count ?? 0) > 0 && (
              <ResultsBar>
                <Typography variant="body2" color="text.secondary">
                  {Locale.label("songs.songsPage.resultCount", "{count} songs").replace("{count}", (songs.data?.count ?? 0).toString())}
                </Typography>
                {searchFilter.trim() && (
                  <Button size="small" onClick={() => { setSearchFilter(""); setPage(0); }}>{Locale.label("common.clear", "Clear")}</Button>
                )}
              </ResultsBar>
            )}
            <Box>{songsContent}</Box>
          </Stack>
        </Surface>

        {canEdit && (
          <BulkBar count={selected.size} names={selectedNames} data-testid="songs-bulk-bar">
            <TextAction small onClick={handleBulkDelete} data-testid="delete-selected-button">
              {(Locale.label("songs.songsPage.deleteSelected") || "Delete Selected") + " (" + selected.size + ")"}
            </TextAction>
            <TextAction small onClick={() => setSelected(new Set())}>{Locale.label("common.clear", "Clear")}</TextAction>
          </BulkBar>
        )}
      </PageContainer>

      {showSearch && canEdit && <SongSearchDialog onClose={() => setShowSearch(false)} onSelect={handleAdd} />}
    </>
  );
});
