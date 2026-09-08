import React, { memo, useMemo, useCallback } from "react";
import { ApiHelper, Loading, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { Link, Navigate } from "react-router-dom";
import { Box, Checkbox, TablePagination } from "@mui/material";
import { SongSearchDialog } from "./SongSearchDialog";
import { AddBlock, BulkBar, DirectoryPage, FindField, Verb, platedColor } from "../plated";
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

  const songsContent = useMemo(() => {
    if (songs.isLoading) return <Loading size="sm" />;

    if ((songs.data?.songDetails?.length ?? 0) === 0 || (filteredSongs && filteredSongs.length === 0)) {
      return <p style={{ color: platedColor.mute }}>{searchFilter.trim() ? (Locale.label("songs.library.noResults") || "No songs match your search criteria.") : (Locale.label("songs.library.empty.title") || "No Songs Found")}</p>;
    }

    return (
      <Box>
        {filteredSongs?.map((songDetail) => {
          const id = (songDetail as any).songId || songDetail.id;
          return (
            <Box key={id} sx={{ display: "grid", gridTemplateColumns: canEdit ? "auto auto 1fr auto" : "auto 1fr auto", gap: "12px 16px", alignItems: "center", padding: "11px 0", borderTop: `1px solid ${platedColor.line}` }}>
              {canEdit && (
                <Checkbox checked={selected.has(id)} onChange={() => toggleSelected(id)} aria-label={Locale.label("common.select") || "Select"} />
              )}
              <Box
                component="img"
                src={songDetail.thumbnail && !failedImages.has(songDetail.thumbnail) ? songDetail.thumbnail : undefined}
                alt=""
                onError={handleImageError}
                sx={{ width: 40, height: 40, borderRadius: "6px", objectFit: "cover", bgcolor: platedColor.lift, display: songDetail.thumbnail && !failedImages.has(songDetail.thumbnail) ? "block" : "none" }}
              />
              <Box>
                <Link to={`/serving/songs/${(songDetail as any).songId}`} style={{ color: platedColor.ink, fontWeight: 650, fontSize: "1.12rem", textDecoration: "none" }}>
                  {songDetail.title}
                </Link>
                <Box sx={{ color: platedColor.mute, fontSize: "0.9rem" }}>
                  {[songDetail.artist, songDetail.seconds ? formatSeconds(songDetail.seconds) : ""].filter(Boolean).join(" · ")}
                </Box>
              </Box>
            </Box>
          );
        })}
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
    page,
    rowsPerPage,
    handlePageChange,
    handleRowsPerPageChange,
    searchFilter
  ]);

  if (redirect) return <Navigate to={redirect} />;

  const selectedNames = filteredSongs?.filter((s) => selected.has((s as any).songId || s.id)).map((s) => s.title).slice(0, 3).join(", ");

  return (
    <>
      {ConfirmDialogElement}
      <DirectoryPage title={Locale.label("songs.title") || Locale.label("songs.songsPage.songs")} lede={Locale.label("songs.songsPage.subtitle")}>
        <FindField
          value={searchFilter}
          onChange={(v) => { setSearchFilter(v); setPage(0); }}
          placeholder={Locale.label("songs.search.placeholder") || "Search songs by title or artist..."}
        />

        {songsContent}

        {canEdit && (
          <AddBlock title={Locale.label("songs.addSong") || "Add Song"}>
            <button
              type="button"
              data-testid="add-song-button"
              aria-label={Locale.label("songs.songsPage.addSongAria")}
              onClick={() => setShowSearch(true)}
              style={{ background: "none", border: 0, color: platedColor.accent, fontWeight: 600, cursor: "pointer", font: "inherit" }}>
              {Locale.label("songs.addSong") || "Add Song"}
            </button>
          </AddBlock>
        )}

        <BulkBar count={selected.size} names={selectedNames}>
          <Verb onClick={handleBulkDelete} testId="delete-selected-button">{(Locale.label("songs.songsPage.deleteSelected") || "Delete Selected") + " (" + selected.size + ")"}</Verb>
        </BulkBar>
      </DirectoryPage>

      {showSearch && canEdit && <SongSearchDialog onClose={() => setShowSearch(false)} onSelect={handleAdd} />}
    </>
  );
});
