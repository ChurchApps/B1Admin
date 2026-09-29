import React, { memo, useCallback } from "react";
import { ApiHelper, ArrayHelper, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { Link as RouterLink, useParams, useNavigate } from "react-router-dom";
import { type ArrangementInterface, type ArrangementKeyInterface, type SongDetailInterface, type SongInterface } from "../../helpers";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Typography } from "@mui/material";
import { QueueMusic as ArrangementIcon } from "@mui/icons-material";
import { Arrangement } from "./components/Arrangement";
import { EmptyState, PageContainer, PillTabs, RecordHeading, RecordLayout, TextAction, VerbRow, eyebrowSx } from "../../components/ui";
import { SongDetailsEdit } from "./components/SongDetailsEdit";
import { SongDetailLinks } from "./components/SongDetailLinks";
import { SongDetailLinksEdit } from "./components/SongDetailLinksEdit";
import { useConfirmDelete } from "../../hooks";

const formatSeconds = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return mins + ":" + (secs < 10 ? "0" : "") + secs;
};

export const SongPage = memo(() => {
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [editSongDetails, setEditSongDetails] = React.useState(false);
  const [editLinks, setEditLinks] = React.useState(false);
  const [selectedArrangement, setSelectedArrangement] = React.useState<ArrangementInterface | null>(null);
  const params = useParams();
  const navigate = useNavigate();
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const song = useQuery<SongInterface>({
    queryKey: ["/songs/" + params.id, "ContentApi"],
    enabled: !!params.id
  });

  const arrangements = useQuery<ArrangementInterface[]>({
    queryKey: ["/arrangements/song/" + params.id, "ContentApi"],
    placeholderData: [],
    enabled: !!params.id
  });

  // If song record is missing/orphaned, fall back to arrangement's songDetailId for the title
  const songDetailId = song.data?.songDetailId || arrangements.data?.[0]?.songDetailId;

  const songDetail = useQuery<SongDetailInterface>({
    queryKey: ["/songDetails/" + songDetailId, "ContentApi"],
    enabled: !!songDetailId
  });

  // Set selected arrangement when arrangements load; fall back to the first one when
  // the current selection no longer exists (e.g. deleted, or stale from a kept-alive visit).
  React.useEffect(() => {
    if (!arrangements.data || arrangements.data.length === 0) return;
    const stillExists = selectedArrangement && arrangements.data.some((a) => a.id === selectedArrangement.id);
    if (!stillExists) setSelectedArrangement(arrangements.data[0]);
  }, [arrangements.data, selectedArrangement]);

  const selectArrangement = useCallback(
    (arrangementId: string) => {
      const arr = ArrayHelper.getOne(arrangements.data || [], "id", arrangementId);
      setSelectedArrangement(arr);
    },
    [arrangements.data]
  );

  const refetch = useCallback(async () => {
    const results = await Promise.all([song.refetch(), arrangements.refetch(), songDetail.refetch()]);

    if (selectedArrangement?.id) {
      const arrangementResult = results[1];
      if (arrangementResult.data) {
        const updatedArrangement = arrangementResult.data.find((arr) => arr.id === selectedArrangement.id);
        if (updatedArrangement) {
          setSelectedArrangement(updatedArrangement);
        } else {
          const nextArrangement = arrangementResult.data.length > 0 ? arrangementResult.data[0] : null;
          setSelectedArrangement(nextArrangement);
          if (!nextArrangement) {
            navigate("/serving/songs");
          }
        }
      }
    }
  }, [song, arrangements, songDetail, selectedArrangement?.id, navigate]);

  const handleDeleteSong = useCallback(async () => {
    if (await confirm(Locale.label("songs.deleteSong.confirm"))) {
      ApiHelper.delete("/songs/" + song.data?.id, "ContentApi").then(() => {
        navigate("/serving/songs");
      });
    }
  }, [song.data?.id, navigate, confirm]);

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

  const sd = songDetail.data;
  const title = sd?.title || song.data?.name || Locale.label("songs.songPage.loading");
  const editing = editSongDetails && canEdit && !!sd;

  const facts = sd
    ? [
      { label: Locale.label("songs.details.album"), value: sd.album },
      { label: Locale.label("songs.details.key"), value: sd.keySignature },
      { label: Locale.label("songs.details.length"), value: sd.seconds ? formatSeconds(sd.seconds) : "" },
      { label: Locale.label("songs.details.bpm"), value: sd.bpm ? sd.bpm.toString() : "" },
      { label: Locale.label("songs.details.meter"), value: sd.meter },
      { label: Locale.label("songs.details.language"), value: sd.language }
    ].filter((f) => f.value)
    : [];

  const identity = (
    <Box component="aside" data-testid="song-identity" sx={{ minWidth: 0 }}>
      {sd?.thumbnail && (
        <Box component="img" src={sd.thumbnail} alt="" sx={{ width: 88, height: 88, borderRadius: "var(--b1-radius-panel)", objectFit: "cover", display: "block", mb: 2 }} />
      )}
      <Typography component="p" sx={eyebrowSx}>{Locale.label("songs.songsPage.songs")}</Typography>
      <Typography id="page-header-title" variant="h1" component="h1" sx={{ overflowWrap: "anywhere" }}>{title}</Typography>
      {sd?.artist && <Typography variant="body1" color="text.secondary" sx={{ mt: 0.5 }}>{sd.artist}</Typography>}
      <VerbRow sx={{ mt: 2 }}>
        {canEdit && (
          <TextAction onClick={() => setEditSongDetails(!editSongDetails)} data-testid="song-edit-button">
            {editing ? Locale.label("common.done") : Locale.label("common.edit")}
          </TextAction>
        )}
        {canEdit && <TextAction onClick={handleAddArrangement} data-testid="add-arrangement-button">{Locale.label("songs.songPage.addArrangement")}</TextAction>}
        <TextAction to="/serving/songs" component={RouterLink}>{Locale.label("songs.songsPage.songs")}</TextAction>
      </VerbRow>

      {facts.length > 0 && (
        <Box component="dl" data-testid="song-facts" sx={{ display: "grid", gridTemplateColumns: "auto 1fr", columnGap: 2, rowGap: 0.5, typography: "body2", mt: 3, mb: 0, "& dt": { color: "text.secondary", m: 0 }, "& dd": { m: 0, overflowWrap: "anywhere" } }}>
          {facts.map((f) => (
            <React.Fragment key={f.label}>
              <dt>{f.label}</dt>
              <dd>{f.value}</dd>
            </React.Fragment>
          ))}
        </Box>
      )}

      {(arrangements.data?.length ?? 0) > 0 && (
        <Box sx={{ mt: 3 }}>
          <RecordHeading label={Locale.label("songs.oldArrangements.arrangements")} />
          <PillTabs
            aria-label={Locale.label("songs.oldArrangements.arrangements")}
            value={selectedArrangement?.id || ""}
            onChange={selectArrangement}
            options={(arrangements.data || []).map((a) => ({ value: a.id!, label: a.name, "data-testid": "arrangement-pill-" + a.id }))}
            sx={{ flexWrap: "wrap", overflowX: "visible" }}
          />
        </Box>
      )}

      {sd && (
        <Box sx={{ mt: 3 }}>
          {editLinks && canEdit
            ? <SongDetailLinksEdit songDetailId={sd.id!} reload={() => { setEditLinks(false); refetch(); }} />
            : <SongDetailLinks songDetail={sd} onEdit={canEdit ? () => setEditLinks(true) : undefined} />}
        </Box>
      )}
    </Box>
  );

  const slice = () => {
    if (editing) {
      return (
        <>
          <SongDetailsEdit
            songDetail={sd!}
            onCancel={() => setEditSongDetails(false)}
            onSave={() => {
              setEditSongDetails(false);
              refetch();
            }}
            reload={refetch}
          />
          <Box>
            <Button color="error" variant="text" onClick={handleDeleteSong} data-testid="delete-song-button">
              {Locale.label("serving.songPage.deleteSong", "Delete song")}
            </Button>
          </Box>
        </>
      );
    }
    if (!selectedArrangement) {
      return (
        <EmptyState
          variant="plain"
          icon={<ArrangementIcon />}
          title={Locale.label("songs.songPage.noArrangementSelected")}
          description={Locale.label("songs.songPage.noArrangementDescription")}
        />
      );
    }
    return <Arrangement key={selectedArrangement.id} arrangement={selectedArrangement} reload={refetch} />;
  };

  return (
    <PageContainer>
      {ConfirmDialogElement}
      <RecordLayout identity={identity} spacing={3} data-testid="song-record">
        {slice()}
      </RecordLayout>
    </PageContainer>
  );
});
