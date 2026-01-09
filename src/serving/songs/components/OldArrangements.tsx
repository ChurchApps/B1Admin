import React from "react";
import { ApiHelper, DisplayBox, SmallButton } from "@churchapps/apphelper";

import { Accordion, AccordionDetails, AccordionSummary, Stack } from "@mui/material";
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
  }, [props.song?.id]); //eslint-disable-line react-hooks/exhaustive-deps

  const getArrangements = () => {
    const result: JSX.Element[] = [];
    if (!arrangements) return result;
    else if (arrangements.length === 0) result.push(<p>No arrangements found.</p>);
    else if (arrangements.length === 1) result.push(<OldArrangement arrangement={arrangements[0]} originalKey={props.songDetail?.keySignature} />);
    else {
      arrangements.forEach((arrangement: any) => {
        result.push(
          <Accordion key={arrangement.id}>
            <AccordionSummary>
              {arrangement.name}
              <span style={{ marginLeft: "auto" }}>
                <SmallButton
                  onClick={() => {
                    setEditArrangement(arrangement);
                  }}
                  icon="edit"
                  data-testid={`edit-arrangement-button-${arrangement.id}`}
                  ariaLabel={`Edit arrangement ${arrangement.name}`}
                />
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
      <SmallButton
        onClick={() => {
          setEditArrangement({ name: "Default", songId: props.song?.id });
        }}
        icon="add"
        data-testid="add-arrangement-button"
        ariaLabel="Add arrangement"
      />
      {arrangements?.length === 1 && (
        <SmallButton
          onClick={() => {
            setEditArrangement(arrangements[0]);
          }}
          icon="edit"
          data-testid="edit-single-arrangement-button"
          ariaLabel="Edit arrangement"
        />
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
      <DisplayBox headerText="Arrangements" headerIcon="library_music" editContent={getEditContent()}>
        {getArrangements()}
      </DisplayBox>
    );
  }
};
