import React, { useEffect } from "react";
import { ApiHelper, DateHelper, InputBox, Locale } from "@churchapps/apphelper";
import { type SongDetailInterface } from "../../../helpers";
import { TextField } from "@mui/material";

interface Props {
  songDetail: SongDetailInterface;
  onSave: (songDetail: SongDetailInterface) => void;
  reload: () => void;
  onCancel: () => void;
}

export const SongDetailsEdit = (props: Props) => {
  const [songDetail, setSongDetail] = React.useState<SongDetailInterface>(props.songDetail);

  useEffect(() => {
    setSongDetail(props.songDetail);
  }, [props.songDetail]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sd = { ...songDetail };
    switch (e.target.name) {
      case "album":
        sd.album = e.target.value;
        break;
      case "language":
        sd.language = e.target.value;
        break;
      case "releaseDate":
        sd.releaseDate = new Date(e.target.value);
        break;
      case "bpm":
        sd.bpm = parseInt(e.target.value);
        break;
      case "keySignature":
        sd.keySignature = e.target.value;
        break;
      case "seconds":
        sd.seconds = parseInt(e.target.value);
        break;
    }
    setSongDetail(sd);
  };

  const handleSave = () => {
    ApiHelper.post("/songDetails", [songDetail], "ContentApi").then((data) => {
      props.onSave(data[0]);
    });
  };

  return (
    <InputBox headerText={props.songDetail?.title} headerIcon="album" saveFunction={handleSave} cancelFunction={props.onCancel}>
      <TextField label={Locale.label("songs.details.album")} name="album" value={songDetail?.album} onChange={handleChange} fullWidth size="small" placeholder={Locale.label("placeholders.song.album")} />
      <TextField label={Locale.label("songs.details.language")} name="language" value={songDetail?.language} onChange={handleChange} fullWidth size="small" placeholder={Locale.label("placeholders.song.language")} />
      <TextField
        type="date"
        label={Locale.label("songs.details.releaseDate")}
        name="releaseDate"
        value={songDetail?.releaseDate ? DateHelper.formatHtml5Date(songDetail.releaseDate) : ""}
        onChange={handleChange}
        fullWidth
        size="small"
      />
      <TextField type="number" label={Locale.label("songs.details.bpm")} name="bpm" value={songDetail?.bpm} onChange={handleChange} fullWidth size="small" placeholder={Locale.label("placeholders.song.bpm")} />
      <TextField label={Locale.label("songs.details.key")} name="keySignature" value={songDetail?.keySignature} placeholder={Locale.label("placeholders.song.keySignature")} onChange={handleChange} fullWidth size="small" />
      <TextField type="number" label={Locale.label("songs.details.seconds")} name="seconds" value={songDetail?.seconds} onChange={handleChange} fullWidth size="small" placeholder={Locale.label("placeholders.song.lengthSeconds")} />
    </InputBox>
  );
};
