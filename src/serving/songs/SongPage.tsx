import React, { memo, useCallback, useMemo } from "react";
import { ApiHelper, ArrayHelper, PageHeader, UserHelper, Permissions, Locale, SmallButton } from "@churchapps/apphelper";
import { useParams, useNavigate } from "react-router-dom";
import { type ArrangementInterface, type ArrangementKeyInterface, type SongDetailInterface, type SongInterface } from "../../helpers";
import { useQuery } from "@tanstack/react-query";
import { Grid, Box, Card, CardContent, Typography, Stack, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Button, Paper, IconButton } from "@mui/material";
import { LibraryMusic as MusicIcon, Add as AddIcon, QueueMusic as ArrangementIcon, Edit as EditIcon } from "@mui/icons-material";
import { Arrangement } from "./components/Arrangement";
import { SongSearchDialog } from "./SongSearchDialog";
import { SongDetailsEdit } from "./components/SongDetailsEdit";
import { SongDetailLinks } from "./components/SongDetailLinks";
import { SongDetailLinksEdit } from "./components/SongDetailLinksEdit";

export const SongPage = memo(() => {
  const [showSearch, setShowSearch] = React.useState(false);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [editSongDetails, setEditSongDetails] = React.useState(false);
  const [editLinks, setEditLinks] = React.useState(false);
  const [selectedArrangement, setSelectedArrangement] = React.useState(null);
  const params = useParams();
  const navigate = useNavigate();

  const song = useQuery<SongInterface>({
    queryKey: ["/songs/" + params.id, "ContentApi"],
    enabled: !!params.id
  });

  const arrangements = useQuery<ArrangementInterface[]>({
    queryKey: ["/arrangements/song/" + params.id, "ContentApi"],
    placeholderData: [],
    enabled: !!params.id
  });

  const songDetailId = useMemo(() => {
    if (arrangements.data && arrangements.data.length > 0 && arrangements.data[0].songDetailId) {
      return arrangements.data[0].songDetailId;
    }
    return null;
  }, [arrangements.data]);

  const songDetail = useQuery<SongDetailInterface>({
    queryKey: ["/songDetails/" + songDetailId, "ContentApi"],
    enabled: !!songDetailId
  });

  // Set selected arrangement when arrangements load
  React.useEffect(() => {
    if (arrangements.data && arrangements.data.length > 0 && !selectedArrangement) {
      setSelectedArrangement(arrangements.data[0]);
    }
  }, [arrangements.data, selectedArrangement]);

  const selectArrangement = useCallback(
    (arrangementId: string) => {
      const arr = ArrayHelper.getOne(arrangements.data, "id", arrangementId);
      setSelectedArrangement(arr);
    },
    [arrangements.data]
  );

  const refetch = useCallback(async () => {
    const results = await Promise.all([song.refetch(), arrangements.refetch(), songDetail.refetch()]);

    // Update selected arrangement with fresh data after refetch
    if (selectedArrangement?.id) {
      const arrangementResult = results[1];
      if (arrangementResult.data) {
        const updatedArrangement = arrangementResult.data.find((arr) => arr.id === selectedArrangement.id);
        if (updatedArrangement) {
          setSelectedArrangement(updatedArrangement);
        }
      }
    }
  }, [song, arrangements, songDetail, selectedArrangement?.id]);

  const handleDeleteSong = useCallback(() => {
    if (window.confirm(Locale.label("songs.deleteSong.confirm"))) {
      ApiHelper.delete("/songs/" + song.data?.id, "ContentApi").then(() => {
        navigate("/serving/songs");
      });
    }
  }, [song.data?.id, navigate]);

  const handleAdd = useCallback(
    async (songDetail: SongDetailInterface) => {
      if (!song.data?.id) return;
      const a: ArrangementInterface = {
        songId: song.data.id,
        songDetailId: songDetail.id,
        name: songDetail.artist,
        lyrics: ""
      };
      await ApiHelper.post("/arrangements", [a], "ContentApi");
      if (songDetail.keySignature) {
        const key: ArrangementKeyInterface = { arrangementId: a.id, keySignature: songDetail.keySignature, shortDescription: "Default" };
        await ApiHelper.post("/arrangementKeys", [key], "ContentApi");
      }
      refetch();
      setShowSearch(false);
    },
    [song.data?.id, refetch]
  );

  const arrangementNavigation = useMemo(
    () => (
      <Stack spacing={3}>
        <Card sx={{ height: "fit-content", borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <MusicIcon sx={{ color: "primary.main" }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                Arrangements
              </Typography>
            </Stack>

            <List sx={{ p: 0 }}>
              {arrangements.data.map((arrangement, index) => (
                <Box key={arrangement.id}>
                  <ListItem sx={{ px: 0 }}>
                    <ListItemButton
                      selected={selectedArrangement?.id === arrangement.id}
                      onClick={() => selectArrangement(arrangement.id)}
                      sx={{
                        borderRadius: 1,
                        "&.Mui-selected": {
                          backgroundColor: "rgba(21, 101, 192, 0.12)", // Lighter primary color opacity
                          "&:hover": { backgroundColor: "rgba(21, 101, 192, 0.2)" }
                        },
                        "&:hover": { backgroundColor: "action.hover" }
                      }}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <ArrangementIcon sx={{ color: selectedArrangement?.id === arrangement.id ? "primary.main" : "text.secondary" }} />
                      </ListItemIcon>
                      <ListItemText
                        primary={arrangement.name}
                        primaryTypographyProps={{
                          sx: {
                            fontWeight: selectedArrangement?.id === arrangement.id ? 600 : 400,
                            color: selectedArrangement?.id === arrangement.id ? "primary.main" : "text.primary"
                          }
                        }}
                      />
                    </ListItemButton>
                  </ListItem>
                  {index < arrangements.data.length - 1 && <Divider sx={{ my: 0.5 }} />}
                </Box>
              ))}
            </List>

            {canEdit && (
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setShowSearch(true)}
                fullWidth
                sx={{
                  mt: 2,
                  borderStyle: "dashed",
                  color: "text.secondary",
                  borderColor: "grey.400",
                  "&:hover": {
                    borderColor: "primary.main",
                    color: "primary.main",
                    backgroundColor: "primary.light"
                  }
                }}>
                Add Arrangement
              </Button>
            )}
          </CardContent>
        </Card>

        {/* External Links Card */}
        <Card sx={{ height: "fit-content", borderRadius: 2 }}>
          <CardContent>
            {songDetail.data &&
              (editLinks && canEdit ? (
                <SongDetailLinksEdit
                  songDetailId={songDetail.data.id}
                  reload={() => {
                    setEditLinks(false);
                    refetch();
                  }}
                />
              ) : (
                <SongDetailLinks songDetail={songDetail.data} onEdit={canEdit ? () => setEditLinks(true) : undefined} />
              ))}
          </CardContent>
        </Card>
      </Stack>
    ),
    [arrangements.data, selectedArrangement, selectArrangement, songDetail.data, editLinks, refetch, canEdit]
  );

  const currentContent = useMemo(() => {
    if (!selectedArrangement) {
      return (
        <Paper
          sx={{
            p: 6,
            textAlign: "center",
            backgroundColor: "var(--bg-sub)",
            border: "1px dashed",
            borderColor: "var(--border-main)"
          }}>
          <ArrangementIcon sx={{ fontSize: 64, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Arrangement Selected
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Select an arrangement from the sidebar to get started.
          </Typography>
        </Paper>
      );
    }

    return <Arrangement arrangement={selectedArrangement} reload={refetch} />;
  }, [selectedArrangement, refetch]);

  return (
    <>
      <PageHeader icon={<MusicIcon />} title={songDetail.data?.title || song.data?.name || Locale.label("songs.songPage.loading")} subtitle={Locale.label("songs.songPage.subtitle")}>
        {canEdit && (
          <IconButton
            onClick={() => setEditSongDetails(true)}
            sx={{
              color: "rgba(255,255,255,0.8)",
              "&:hover": {
                color: "#FFF",
                backgroundColor: "rgba(255,255,255,0.1)"
              }
            }}
            size="small">
            <EditIcon fontSize="small" />
          </IconButton>
        )}
        {canEdit && <SmallButton color="error" icon="delete" onClick={handleDeleteSong} />}
        {canEdit && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setShowSearch(true)}
            sx={{
              color: "#FFF",
              borderColor: "rgba(255,255,255,0.5)",
              "&:hover": {
                borderColor: "#FFF",
                backgroundColor: "rgba(255,255,255,0.1)"
              }
            }}>
            Add Arrangement
          </Button>
        )}
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {editSongDetails && canEdit ? (
          <SongDetailsEdit
            songDetail={songDetail.data}
            onCancel={() => setEditSongDetails(false)}
            onSave={() => {
              setEditSongDetails(false);
              refetch();
            }}
            reload={refetch}
          />
        ) : (
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 3 }}>{arrangementNavigation}</Grid>

            <Grid size={{ xs: 12, md: 9 }}>{currentContent}</Grid>
          </Grid>
        )}
      </Box>

      {showSearch && canEdit && <SongSearchDialog searchText={song.data?.name} onClose={() => setShowSearch(false)} onSelect={handleAdd} />}
    </>
  );
});
