import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Box, Typography, Stack, Avatar, InputAdornment } from "@mui/material";
import { Search as SearchIcon, MusicNote as MusicIcon, Close as CloseIcon, Add as AddIcon, OpenInNew as OpenIcon } from "@mui/icons-material";
import React, { useEffect, memo, useCallback, useMemo } from "react";
import { ApiHelper, Locale, Loading } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { type SongDetailInterface, type SongDetailLinkInterface } from "../../helpers";
import { CreateSongDetail } from "./components/CreateSongDetail";
import { EmptyState, StatusBadge } from "../../components/ui";
import { CommonsApi, getWorshipCommonsOrigin, type CommonsSongSummary } from "../../serverAdmin/commonsApi";

// Sunday-ready WorshipCommons songs (GET /commons/songs?sundayReady=true&q=). Tolerant of the API not having the filter yet: any failure → no section.
const searchWorshipCommons = async (q: string): Promise<CommonsSongSummary[]> => {
  try {
    const data = await CommonsApi.get(`/songs?sundayReady=true&q=${encodeURIComponent(q)}`);
    const rows: CommonsSongSummary[] = Array.isArray(data) ? data : Array.isArray(data?.rows) ? data.rows : [];
    return rows.filter((r) => r && r.id && r.title);
  } catch {
    return [];
  }
};

const confidenceLabel = (c?: string) => (c ? Locale.label(`serverAdmin.commonsTab.confidence.${c}`, c) : "");
const licenseLabel = (l?: string) => (l === "WC" ? Locale.label("serverAdmin.commonsTab.licenseWc") : l === "PD" ? Locale.label("serverAdmin.commonsTab.licensePd") : l || "");

interface Props {
  searchText?: string;
  onClose: () => void;
  onSelect: (songDetail: SongDetailInterface) => void;
}

export const SongSearchDialog: React.FC<Props> = memo((props) => {
  const [searchText, setSearchText] = React.useState<string>(props.searchText || "");
  const [songDetails, setSongDetails] = React.useState<SongDetailInterface[] | null>(null);
  const [commonsSongs, setCommonsSongs] = React.useState<CommonsSongSummary[]>([]);
  const [showCreate, setShowCreate] = React.useState(false);
  const [isSearching, setIsSearching] = React.useState(false);

  useEffect(() => {
    if (props.searchText) handleSearch();
  }, [props.searchText]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  }, []);

  const handleSearch = useCallback(async () => {
    if (!searchText.trim()) return;
    setIsSearching(true);
    const commons = searchWorshipCommons(searchText.trim());
    try {
      const data = await ApiHelper.get("/praiseCharts/search?q=" + encodeURIComponent(searchText), "ContentApi");
      setSongDetails(data);
    } catch (error) {
      console.error("Search failed:", error);
      setSongDetails([]);
    } finally {
      setCommonsSongs(await commons);
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
      if (songDetail) props.onSelect(songDetail);
    },
    [props.onSelect]
  );

  // Mirror of the manual path (CreateSongDetail → POST /songDetails) plus a link back to the WorshipCommons song page.
  const handleCommonsClick = useCallback(
    async (song: CommonsSongSummary) => {
      const created: SongDetailInterface[] = await ApiHelper.post("/songDetails", [{ title: song.title, artist: song.writer || "", seconds: 0, keySignature: song.songKey || undefined }], "ContentApi");
      const sd = created?.[0];
      if (!sd?.id) return;
      const link: SongDetailLinkInterface = { songDetailId: sd.id, service: "WorshipCommons", serviceKey: song.id, url: `${getWorshipCommonsOrigin()}/songs/${song.id}` };
      try { await ApiHelper.post("/songDetailLinks", [link], "ContentApi"); } catch (e) { console.error("WorshipCommons link failed:", e); }
      props.onSelect(sd);
    },
    [props.onSelect]
  );

  const commonsResults = useMemo(() => {
    if (isSearching || commonsSongs.length === 0) return null;
    return (
      <Box sx={{ mb: 3 }} data-testid="song-search-commons-section">
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("songs.search.worshipCommonsFree")}</Typography>
        <Stack spacing={1.5}>
          {commonsSongs.map((song) => (
            <Box key={song.id} sx={{ cursor: "pointer", border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-control)", p: 1.5, "&:hover": { bgcolor: "action.hover" } }} onClick={() => handleCommonsClick(song)} data-testid={`song-search-commons-${song.id}`}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar variant="rounded" sx={{ width: 40, height: 40, bgcolor: "var(--b1-selected)", color: "var(--b1-on-selected)" }}><MusicIcon /></Avatar>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 600 }}>{song.title}</Typography>
                  {song.writer && <Typography variant="body2" color="text.secondary">{song.writer}</Typography>}
                  <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
                    {song.confidence && <StatusBadge tone="success">{confidenceLabel(song.confidence)}</StatusBadge>}
                    {song.license && <StatusBadge tone="neutral">{licenseLabel(song.license)}</StatusBadge>}
                  </Stack>
                </Box>
                <Button
                  size="small"
                  component="a"
                  href={`${getWorshipCommonsOrigin()}/songs/${song.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  endIcon={<OpenIcon />}
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  sx={{ whiteSpace: "nowrap" }}
                >
                  {Locale.label("songs.search.viewOnWorshipCommons")}
                </Button>
                <AppIconButton label={`Select ${song.title}`} icon={<AddIcon />} tone="card" intent="add" />
              </Stack>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  }, [commonsSongs, isSearching, handleCommonsClick]);

  const searchResults = useMemo(() => {
    if (isSearching) {
      return (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <Loading size="sm" />
        </Box>
      );
    }

    if (songDetails === null) {
      return <EmptyState variant="plain" icon={<SearchIcon />} title={Locale.label("songs.search.enterQuery") || "Enter a search term to find songs."} />;
    }

    if (songDetails.length === 0) {
      if (commonsSongs.length > 0) return null;
      return (
        <EmptyState
          variant="plain"
          icon={<MusicIcon />}
          title={Locale.label("songs.search.noResults") || "No songs found for your search."}
          action={(
            <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setShowCreate(true)}>
              {Locale.label("songs.search.createManually") || "Create Manually"}
            </Button>
          )}
        />
      );
    }

    return (
      <Stack spacing={2}>
        {songDetails.map((songDetail, index) => (
          <Box key={index} sx={{ cursor: "pointer", border: 1, borderColor: "divider", borderRadius: "var(--b1-radius-control)", p: 1.5, "&:hover": { bgcolor: "action.hover" } }} onClick={() => handleSongClick(songDetail)}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                variant="rounded"
                src={songDetail.thumbnail}
                sx={{ width: 40, height: 40, bgcolor: "var(--b1-selected)", color: "var(--b1-on-selected)" }}
                onError={handleImageError}>
                <MusicIcon />
              </Avatar>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }}>{songDetail.title}</Typography>
                {songDetail.artist && (
                  <Typography variant="body2" color="text.secondary">{songDetail.artist}</Typography>
                )}
              </Box>

              <AppIconButton label={`Select ${songDetail.title}`} icon={<AddIcon />} tone="card" intent="add" />
            </Stack>
          </Box>
        ))}
      </Stack>
    );
  }, [songDetails, isSearching, handleImageError, handleSongClick, commonsSongs.length]);

  return (
    <Dialog open={true} onClose={props.onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Stack direction="row" spacing={2} alignItems="center">
            <SearchIcon sx={{ color: "primary.main" }} />
            <Typography variant="h6">{Locale.label("songs.search.title") || "Search for a Song"}</Typography>
          </Stack>
          <AppIconButton label={Locale.label("common.close")} icon={<CloseIcon />} onClick={props.onClose} />
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
            aria-label={Locale.label("songs.songSearchDialog.songTitleOrArtistAria")}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <AppIconButton label={Locale.label("common.search")} icon={<SearchIcon />} onClick={handleSearch} disabled={!searchText.trim() || isSearching} data-testid="song-search-dialog-button" />
                </InputAdornment>
              )
            }}
            sx={{ mb: 2 }}
          />
        </Box>

        <Box sx={{ maxHeight: 400, overflowY: "auto" }}>
          {!showCreate ? (
            <Box>
              {commonsResults}
              {searchResults}

              {songDetails && (songDetails.length > 0 || commonsSongs.length > 0) && (
                <Box
                  sx={{
                    mt: 3,
                    pt: 2,
                    borderTop: "1px solid",
                    borderColor: "divider"
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
            {Locale.label("songs.songSearchDialog.poweredBy")}{" "}
            <a href="https://www.praisecharts.com/?XID=churchapps" target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
              PraiseCharts
            </a>
          </Typography>
          <Button variant="outlined" onClick={props.onClose} data-testid="song-search-dialog-close" aria-label={Locale.label("songs.songSearchDialog.closeDialogAria")}>
            {Locale.label("common.close") || "Close"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
});
