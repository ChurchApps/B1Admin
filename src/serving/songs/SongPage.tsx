import React, { memo, useCallback } from "react";
import { ApiHelper, ArrayHelper, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { useParams, useNavigate } from "react-router-dom";
import { type ArrangementInterface, type ArrangementKeyInterface, type SongDetailInterface, type SongInterface } from "../../helpers";
import { useQuery } from "@tanstack/react-query";
import { Box } from "@mui/material";
import { Arrangement } from "./components/Arrangement";
import { SongDetailsEdit } from "./components/SongDetailsEdit";
import { SongDetailLinks } from "./components/SongDetailLinks";
import { SongDetailLinksEdit } from "./components/SongDetailLinksEdit";
import { useConfirmDelete } from "../../hooks";
import { Dl, Eyebrow, ListPills, Pill, PlatedRecord, RecordTitle, Verb, Verbs, platedColor } from "../plated";

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

  const songDetailId = song.data?.songDetailId || arrangements.data?.[0]?.songDetailId;

  const songDetail = useQuery<SongDetailInterface>({
    queryKey: ["/songDetails/" + songDetailId, "ContentApi"],
    enabled: !!songDetailId
  });

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
      name: "New Arrangement",
      lyrics: ""
    };
    const newArrangements = await ApiHelper.post("/arrangements", [a], "ContentApi");
    const key: ArrangementKeyInterface = { arrangementId: newArrangements[0].id, keySignature: songDetail.data?.keySignature || "", shortDescription: "Default" };
    await ApiHelper.post("/arrangementKeys", [key], "ContentApi");
    await refetch();
    setSelectedArrangement(newArrangements[0]);
  }, [song.data?.id, songDetail.data?.keySignature, refetch]);

  const formatSeconds = (seconds?: number) => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  };

  const sd = songDetail.data;

  return (
    <>
      {ConfirmDialogElement}
      <PlatedRecord
        who={(
          <>
            {sd?.thumbnail && (
              <Box component="img" src={sd.thumbnail} alt="" sx={{ width: { xs: 88, sm: 148 }, height: { xs: 88, sm: 148 }, borderRadius: "8px", objectFit: "cover", mb: "18px", bgcolor: platedColor.lift }} />
            )}
            <Eyebrow>{Locale.label("songs.songsPage.songs") || "Song"}</Eyebrow>
            <RecordTitle>{sd?.title || song.data?.name || Locale.label("songs.songPage.loading")}</RecordTitle>
            {sd?.artist && <Box sx={{ color: platedColor.mute, mt: "8px", mb: "12px" }}>{sd.artist}</Box>}
            <Verbs>
              {canEdit && <Verb onClick={() => setEditSongDetails(!editSongDetails)}>{editSongDetails ? (Locale.label("common.done") || "Done") : Locale.label("common.edit")}</Verb>}
              {canEdit && <Verb onClick={handleAddArrangement}>{Locale.label("songs.songPage.addArrangement")}</Verb>}
              <Verb to="/serving/songs">{Locale.label("songs.songsPage.songs") || "Songs"}</Verb>
            </Verbs>
            {sd && (
              <Dl>
                {sd.album && <><dt>{Locale.label("songs.details.album") || "Album"}</dt><dd>{sd.album}</dd></>}
                {sd.keySignature && <><dt>{Locale.label("songs.details.keySignature") || "Key"}</dt><dd>{sd.keySignature}</dd></>}
                {sd.seconds ? <><dt>{Locale.label("songs.details.length") || "Length"}</dt><dd>{formatSeconds(sd.seconds)}</dd></> : null}
                {sd.bpm ? <><dt>{Locale.label("songs.details.bpm") || "BPM"}</dt><dd>{sd.bpm}</dd></> : null}
                {sd.meter && <><dt>{Locale.label("songs.details.meter") || "Meter"}</dt><dd>{sd.meter}</dd></>}
                {sd.language && <><dt>{Locale.label("songs.details.language") || "Language"}</dt><dd>{sd.language}</dd></>}
              </Dl>
            )}
            <ListPills>
              {(arrangements.data || []).map((arrangement) => (
                <Pill key={arrangement.id} on={selectedArrangement?.id === arrangement.id} onClick={() => selectArrangement(arrangement.id!)}>
                  {arrangement.name}
                </Pill>
              ))}
            </ListPills>
            {sd && (
              editLinks && canEdit
                ? <SongDetailLinksEdit songDetailId={sd.id!} reload={() => { setEditLinks(false); refetch(); }} />
                : <SongDetailLinks songDetail={sd} onEdit={canEdit ? () => setEditLinks(true) : undefined} />
            )}
          </>
        )}
        rest={
          editSongDetails && canEdit
            ? (
              <>
                <SongDetailsEdit
                  songDetail={sd!}
                  onCancel={() => setEditSongDetails(false)}
                  onSave={() => { setEditSongDetails(false); refetch(); }}
                  reload={refetch}
                />
                <Box sx={{ mt: 3 }}>
                  <Verb onClick={handleDeleteSong}>{Locale.label("common.delete")}</Verb>
                </Box>
              </>
            )
            : selectedArrangement
              ? <Arrangement arrangement={selectedArrangement} reload={refetch} />
              : <p style={{ color: platedColor.mute }}>{Locale.label("songs.songPage.noArrangementSelected")}</p>
        }
      />
    </>
  );
});
