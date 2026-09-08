import React, { useEffect, memo, useCallback, useMemo } from "react";
import { type ArrangementInterface, type SongDetailInterface } from "../../../helpers";
import { ChordProHelper } from "../../../helpers/ChordProHelper";
import { ApiHelper, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { Box, Alert, Button, FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import { Keys } from "./Keys";
import { ArrangementEdit } from "./ArrangementEdit";
import { SectionLabel, Verb, Verbs, platedColor } from "../../plated";

interface Props {
  arrangement: ArrangementInterface;
  reload: () => void;
}

export const Arrangement = memo((props: Props) => {
  const [songDetail, setSongDetail] = React.useState<SongDetailInterface | null>(null);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [edit, setEdit] = React.useState(false);
  const [canImportLyrics, setCanImportLyrics] = React.useState(false);
  const [keyOffset, setKeyOffset] = React.useState(0);

  const formatSeconds = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins + ":" + (secs < 10 ? "0" : "") + secs;
  }, []);

  const getKeyOptions = useCallback(
    (originalIndex: number) =>
      ChordProHelper.noteNames.map((note, index) => (
        <MenuItem key={note} value={(index - originalIndex).toString()}>{note}</MenuItem>
      )),
    []
  );

  const handleKeyChange = useCallback((e: SelectChangeEvent) => { setKeyOffset(parseInt(e.target.value)); }, []);

  const getKeySelect = useCallback(() => {
    const originalKey = songDetail?.keySignature;
    if (!originalKey) return null;
    const originalIndex = ChordProHelper.noteMap[originalKey];
    if (originalIndex === undefined) return null;
    return (
      <FormControl size="small" sx={{ minWidth: 120, mb: 1 }}>
        <InputLabel id="keySignature">{Locale.label("songs.oldArrangement.key")}</InputLabel>
        <Select name="keySignature" labelId="keySignature" label={Locale.label("songs.oldArrangement.key")} value={keyOffset.toString()} onChange={handleKeyChange}>
          {getKeyOptions(originalIndex)}
        </Select>
      </FormControl>
    );
  }, [songDetail?.keySignature, keyOffset, handleKeyChange, getKeyOptions]);

  const loadData = useCallback(async () => {
    if (props.arrangement?.songDetailId) {
      const sd: SongDetailInterface = await ApiHelper.get("/songDetails/" + props.arrangement.songDetailId, "ContentApi");
      setSongDetail(sd);
      if (!props.arrangement?.lyrics && sd?.praiseChartsId) setCanImportLyrics(true);
    } else {
      setSongDetail(null);
    }
  }, [props.arrangement]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  //<DisplayBox headerText="Keys" headerIcon="music_note">
  //<PraiseChartsProducts praiseChartsId={songDetail?.praiseChartsId} />

  const importLyrics = useCallback(async () => {
    if (!songDetail?.praiseChartsId) return;

    const data: any = await ApiHelper.get("/praiseCharts/raw/" + songDetail.praiseChartsId, "ContentApi");
    const lyrics = data?.details?.lyrics;
    if (!lyrics) {
      setCanImportLyrics(false);
      return;
    }
    const a = { ...props.arrangement };
    const lines = lyrics.split("\n");

    const newLines = [];
    let nextLineIsTitle = true;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (nextLineIsTitle) newLines.push(`[${line}]`);
      else newLines.push(line);
      nextLineIsTitle = line === "";
    }
    a.lyrics = newLines.join("\n").replaceAll("[]", "").trim();

    ApiHelper.post("/arrangements", [a], "ContentApi").then(() => {
      setCanImportLyrics(false);
      props.reload();
    });
  }, [songDetail?.praiseChartsId, props.arrangement, props.reload]);

  const handleSave = useCallback(
    () => {
      setEdit(false);
      props.reload();
    },
    [props.reload]
  );

  const arrangementCard = useMemo(
    () => (
      <Box>
        <SectionLabel sx={{ mt: 0 }}>{Locale.label("songs.arrangement.title") || "Arrangement"} · {props.arrangement?.name}</SectionLabel>
        {canEdit && (
          <Verbs>
            <Verb onClick={() => setEdit(true)}>{Locale.label("common.edit")}</Verb>
          </Verbs>
        )}
        {(props.arrangement?.bpm || props.arrangement?.seconds || props.arrangement?.meter || props.arrangement?.sequence) && (
          <Box sx={{ color: platedColor.mute, fontSize: "0.92rem", mb: 2 }}>
            {[
              props.arrangement?.bpm ? `${props.arrangement.bpm} ${Locale.label("songs.details.bpm") || "BPM"}` : "",
              props.arrangement?.meter,
              props.arrangement?.seconds ? formatSeconds(props.arrangement.seconds) : "",
              props.arrangement?.sequence
            ].filter(Boolean).join(" · ")}
          </Box>
        )}

        {canImportLyrics && canEdit && (
          <Alert
            severity="success"
            sx={{ mb: 2 }}
            action={
              <Button
                onClick={importLyrics}
                variant="contained"
                color="success"
                size="small">
                {Locale.label("songs.keys.import") || "Import"}
              </Button>
            }>
            {Locale.label("songs.keys.importPrompt") || "Lyrics are available for import from PraiseCharts."}
          </Alert>
        )}

        {getKeySelect()}

        <Box
          className="chordPro"
          sx={{
            backgroundColor: "background.subtle",
            color: "text.primary",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: 1,
            p: 2,
            minHeight: 200,
            maxHeight: 600,
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "0.875rem",
            lineHeight: 1.6,
            "& pre": {
              margin: 0,
              whiteSpace: "pre-wrap"
            }
          }}
          dangerouslySetInnerHTML={{ __html: ChordProHelper.formatLyrics(props.arrangement?.lyrics || Locale.label("songs.arrangement.enterLyrics") || "Enter lyrics...", keyOffset) }}
        />
      </Box>
    ),
    [props.arrangement, canEdit, canImportLyrics, importLyrics, formatSeconds, keyOffset, getKeySelect]
  );

  return (
    <Box>
      {!edit || !canEdit ? arrangementCard : <ArrangementEdit arrangement={props.arrangement} onSave={handleSave} onCancel={() => setEdit(false)} />}
      <Keys arrangement={props.arrangement} songDetail={songDetail} />
    </Box>
  );
});
