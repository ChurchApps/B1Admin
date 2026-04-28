import React from "react";

import { type ArrangementInterface } from "../../../helpers";
import { ChordProHelper } from "../../../helpers/ChordProHelper";
import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  arrangement: ArrangementInterface;
  originalKey?: string;
}

export const OldArrangement = (props: Props) => {
  const [keyOffset, setKeyOffset] = React.useState(0);

  const getKeyOptions = (originalIndex: number) => {
    const result: JSX.Element[] = [];
    ChordProHelper.noteNames.forEach((note, index) => {
      const halfStepOffset = index - originalIndex;
      result.push(
        <MenuItem key={note} value={halfStepOffset.toString()}>
          {note}
        </MenuItem>
      );
    });
    return result;
  };

  const handleChange = (e: SelectChangeEvent) => {
    setKeyOffset(parseInt(e.target.value));
  };

  const getKeySelect = () => {
    if (!props.originalKey) return <></>;
    else {
      const originalIndex = ChordProHelper.noteMap[props.originalKey];
      if (originalIndex === undefined) return <></>;
      else {
        return (
          <FormControl fullWidth>
            <InputLabel id="keySignature">{Locale.label("songs.oldArrangement.key")}</InputLabel>
            <Select name="keySignature" labelId="keySignature" label={Locale.label("songs.oldArrangement.key")} value={keyOffset.toString()} onChange={handleChange}>
              {getKeyOptions(originalIndex)}
            </Select>
          </FormControl>
        );
      }
    }
  };

  return (
    <>
      {getKeySelect()}
      <div className="chordPro" dangerouslySetInnerHTML={{ __html: ChordProHelper.formatLyrics(props.arrangement?.lyrics || "", keyOffset) }}></div>
    </>
  );
};
