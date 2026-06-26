import React, { memo, useCallback, useMemo } from "react";
import { ApiHelper, ArrayHelper, PageHeader, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { useParams, useNavigate } from "react-router-dom";
import { type ArrangementInterface, type ArrangementKeyInterface, type SongDetailInterface, type SongInterface } from "../../helpers";
import { useQuery } from "@tanstack/react-query";
import { Grid, Box, Card, CardContent, Typography, Stack, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Button } from "@mui/material";
import { LibraryMusic as MusicIcon, Add as AddIcon, QueueMusic as ArrangementIcon, Edit as EditIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { Arrangement } from "./components/Arrangement";
import { EmptyState } from "../../components/ui/EmptyState";
import { CountChip } from "../../components/ui";
import { SongDetailsEdit } from "./components/SongDetailsEdit";
import { SongDetailLinks } from "./components/SongDetailLinks";
import { SongDetailLinksEdit } from "./components/SongDetailLinksEdit";

export const SongPage = memo(() => {
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

  const songDetail = useQuery<SongDetailInterface>({
    queryKey: ["/songDetails/" + song.data?.songDetailId, "ContentApi"],
    enabled: !!song.data?.songDetailId
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

  const handleAddArrangement = useCallback(async () => {
    if (!song.data?.id) return;
    const a: ArrangementInterface = {
      songId: song.data.id,
      name: "New Arrangement", // ponytail: default record name, a literal like sibling "(Default)" — not a Locale key (apphelper owns the catalog)
      lyrics: ""
    };
    const newArrangements = await ApiHelper.post("/arrangements", [a], "ContentApi");
    const key: ArrangementKeyInterface = { arrangementId: newArrangements[0].id, keySignature: songDetail.data?.keySignature || "", shortDescription: "Default" };
    await ApiHelper.post("/arrangementKeys", [key], "ContentApi");
    await refetch();
    setSelectedArrangement(newArrangements[0]);
  }, [song.data?.id, songDetail.data?.keySignature, refetch]);

  const arrangementNavigation = useMemo(
    () => (
      <Stack spacing={3}>
        <Card sx={{ height: "fit-content", borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
              <MusicIcon sx={{ color: "primary.main", fontSize: 20 }} />
              <Typography variant="h6">
                {Locale.label("songs.oldArrangements.arrangements")}
              </Typography>
              {arrangements.data.length > 0 && <CountChip count={arrangements.data.length} />}
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
                onClick={handleAddArrangement}
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
                {Locale.label("songs.songPage.addArrangement")}
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
    [
      arrangements.data, selectedArrangement, selectArrangement, songDetail.data, editLinks, refetch, canEdit, handleAddArrangement
    ]
  );

  const currentContent = useMemo(() => {
    if (!selectedArrangement) {
      return (
        <EmptyState
          icon={<ArrangementIcon />}
          title={Locale.label("songs.songPage.noArrangementSelected")}
          description={Locale.label("songs.songPage.noArrangementDescription")}
        />
      );
    }

    return <Arrangement arrangement={selectedArrangement} reload={refetch} />;
  }, [selectedArrangement, refetch]);

  return (
    <>
      <PageHeader title={songDetail.data?.title || song.data?.name || Locale.label("songs.songPage.loading")} subtitle={Locale.label("songs.songPage.subtitle")}>
        {canEdit && (
          <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} tone="header" onClick={() => setEditSongDetails(true)} />
        )}
        {canEdit && (
          <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} tone="header" intent="remove" onClick={handleDeleteSong} />
        )}
        {canEdit && (
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddArrangement}
            sx={{
              color: "#FFF",
              borderColor: "rgba(255,255,255,0.5)",
              "&:hover": {
                borderColor: "#FFF",
                backgroundColor: "rgba(255,255,255,0.1)"
              }
            }}>
            {Locale.label("songs.songPage.addArrangement")}
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
    </>
  );
});
