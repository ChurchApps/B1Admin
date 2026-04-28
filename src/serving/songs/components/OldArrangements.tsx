import React from "react";
import { ApiHelper, DisplayBox, Locale } from "@churchapps/apphelper";

import { Accordion, AccordionDetails, AccordionSummary, Button, Icon, Stack, IconButton, Tooltip } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { type SongDetailInterface, type SongInterface } from "../../../helpers";
import { ArrangementEdit } from "./ArrangementEdit";
import { OldArrangement } from "./OldArrangement";

interface Props {
  song: SongInterface;
  songDetail: SongDetailInterface;
  reload: () => void;
}

export const OldArrangements = (props: Props) => {
  const [arrangements, setArrangements] = React.useState<any[]>([]);
  const [editArrangement, setEditArrangement] = React.useState<any>(null);

  const loadData = () => {
    ApiHelper.get("/arrangements/song/" + props.song.id, "ContentApi").then((data) => setArrangements(data));
  };

  React.useEffect(() => {
    if (props.song) loadData();
  }, [props.song?.id]);

  const getArrangements = () => {
    const result: JSX.Element[] = [];
    if (!arrangements) return result;
    else if (arrangements.length === 0) result.push(<p>{Locale.label("songs.oldArrangements.noArrangements")}</p>);
    else if (arrangements.length === 1) result.push(<OldArrangement arrangement={arrangements[0]} originalKey={props.songDetail?.keySignature} />);
    else {
      arrangements.forEach((arrangement: any) => {
        result.push(
          <Accordion key={arrangement.id}>
            <AccordionSummary>
              {arrangement.name}
              <span style={{ marginLeft: "auto" }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Icon>edit</Icon>}
                  onClick={() => {
                    setEditArrangement(arrangement);
                  }}
                  data-testid={`edit-arrangement-button-${arrangement.id}`}
                  aria-label={`${Locale.label("songs.oldArrangements.editArrangementAria")} ${arrangement.name}`}
                  sx={{ minWidth: "auto" }}
                >
                  {Locale.label("songs.oldArrangements.edit")}
                </Button>
              </span>
            </AccordionSummary>
            <AccordionDetails>
              <OldArrangement arrangement={arrangement} originalKey={props.songDetail?.keySignature} />
            </AccordionDetails>
          </Accordion>
        );
      });
      //result.push(<p>{arrangements.length} arrangements found.</p>);
    }
    return result;
  };

  const getEditContent = () => (
    <Stack direction="row">
      <Tooltip title={Locale.label("songs.oldArrangements.addArrangement")}>
        <IconButton size="small" onClick={() => setEditArrangement({ name: "Default", songId: props.song?.id })} data-testid="add-arrangement-button" aria-label={Locale.label("songs.oldArrangements.addArrangementAria")}><AddIcon fontSize="small" /></IconButton>
      </Tooltip>
      {arrangements?.length === 1 && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<Icon>edit</Icon>}
          onClick={() => {
            setEditArrangement(arrangements[0]);
          }}
          data-testid="edit-single-arrangement-button"
          aria-label={Locale.label("songs.oldArrangements.editArrangementAria")}
          sx={{ minWidth: "auto" }}
        >
          {Locale.label("songs.oldArrangements.edit")}
        </Button>
      )}
    </Stack>
  );

  const handleSave = () => {
    loadData();
    setEditArrangement(null);
  };

  if (editArrangement) {
    return (
      <ArrangementEdit
        arrangement={editArrangement}
        onSave={handleSave}
        onCancel={() => {
          setEditArrangement(null);
        }}
      />
    );
  } else {
    return (
      <DisplayBox headerText={Locale.label("songs.oldArrangements.arrangements")} headerIcon="library_music" editContent={getEditContent()}>
        {getArrangements()}
      </DisplayBox>
    );
  }
};
