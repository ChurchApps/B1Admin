import React, { useEffect, memo, useCallback, useMemo } from "react";
import { type ArrangementInterface, type SongDetailInterface } from "../../../helpers";
import { ChordProHelper } from "../../../helpers/ChordProHelper";
import { ApiHelper, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import {
  Card, CardContent, Typography, Stack, IconButton, Box, Alert, Button 
} from "@mui/material";
import { Edit as EditIcon, QueueMusic as ArrangementIcon } from "@mui/icons-material";
import { Keys } from "./Keys";
import { ArrangementEdit } from "./ArrangementEdit";
import { useNavigate } from "react-router-dom";

interface Props {
  arrangement: ArrangementInterface;
  reload: () => void;
}

export const Arrangement = memo((props: Props) => {
  const navigate = useNavigate();
  const [songDetail, setSongDetail] = React.useState<SongDetailInterface>(null);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [edit, setEdit] = React.useState(false);
  const [canImportLyrics, setCanImportLyrics] = React.useState(false);

  const loadData = useCallback(async () => {
    if (props.arrangement) {
      const sd: SongDetailInterface = await ApiHelper.get("/songDetails/" + props.arrangement.songDetailId, "ContentApi");
      setSongDetail(sd);
      // Check if lyrics can be imported
      if (!props.arrangement?.lyrics && sd?.praiseChartsId) setCanImportLyrics(true);
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
    const a = { ...props.arrangement };
    const lines = data.details.lyrics.split("\n");

    const newLines = [];
    let nextLineIsTitle = true;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (nextLineIsTitle) newLines.push(`[${line}]`);
      else newLines.push(line);
      nextLineIsTitle = line === ""
    }
    a.lyrics = newLines.join("\n").replaceAll("[]", "").trim();

    ApiHelper.post("/arrangements", [a], "ContentApi").then(() => {
      setCanImportLyrics(false);
      props.reload();
    });
  }, [songDetail?.praiseChartsId, props.arrangement, props.reload]);

  const handleSave = useCallback(
    (arrangement: ArrangementInterface) => {
      setEdit(false);
      if (arrangement) {
        props.reload();
      } else {
        navigate("/plans/songs");
      }
    },
    [props.reload, navigate]
  );

  const arrangementCard = useMemo(
    () => (
      <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <ArrangementIcon sx={{ color: "primary.main", fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                {Locale.label("songs.arrangement.title") || "Arrangement"} - {props.arrangement?.name}
              </Typography>
            </Stack>
            {canEdit && (
              <IconButton
                onClick={() => setEdit(true)}
                sx={{
                  color: "primary.main",
                  "&:hover": { backgroundColor: "primary.light" },
                }}
                aria-label="Edit arrangement">
                <EditIcon />
              </IconButton>
            )}
          </Stack>

          {/* Import Lyrics Alert */}
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

          <Box
            className="chordPro"
            sx={{
              backgroundColor: "grey.50",
              border: "1px solid",
              borderColor: "grey.200",
              borderRadius: 1,
              p: 2,
              minHeight: 200,
              fontFamily: "monospace",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              "& pre": {
                margin: 0,
                whiteSpace: "pre-wrap",
              },
            }}
            dangerouslySetInnerHTML={{ __html: ChordProHelper.formatLyrics(props.arrangement?.lyrics || Locale.label("songs.arrangement.enterLyrics") || "Enter lyrics...", 0) }}
          />
        </CardContent>
      </Card>
    ),
    [props.arrangement, canEdit, canImportLyrics, importLyrics]
  );

  return (
    <Stack spacing={3}>
      {!edit || !canEdit ? arrangementCard : <ArrangementEdit arrangement={props.arrangement} onSave={handleSave} onCancel={() => setEdit(false)} />}
      <Keys arrangement={props.arrangement} songDetail={songDetail} />
    </Stack>
  );
});
