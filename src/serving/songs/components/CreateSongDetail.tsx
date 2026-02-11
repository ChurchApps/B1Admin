import { TextField } from "@mui/material";
import React from "react";
import { ApiHelper, InputBox, Locale } from "@churchapps/apphelper";
import { type SongDetailInterface } from "../../../helpers";

interface Props {
  onSave: (songDetail: SongDetailInterface) => void;
}

export const CreateSongDetail: React.FC<Props> = (props) => {
  const [songDetail, setSongDetail] = React.useState<SongDetailInterface>({ title: "", artist: "", seconds: 0 });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sd = { ...songDetail };
    switch (e.target.name) {
      case "title": sd.title = e.target.value; break;
      case "artist": sd.artist = e.target.value; break;
    }
    setSongDetail(sd);
  };

  const handleSave = () => {
    ApiHelper.post("/songDetails", [songDetail], "ContentApi").then((data) => {
      props.onSave(data[0]);
    });
  };

  return (
    <>
      <InputBox headerText={Locale.label("songs.create.title")} headerIcon="library_music" saveFunction={handleSave}>
        <TextField label={Locale.label("songs.create.songTitle")} name="title" value={songDetail?.title} onChange={handleChange} fullWidth placeholder={Locale.label("placeholders.song.title")} />
        <TextField label={Locale.label("songs.create.artist")} name="artist" value={songDetail?.artist} onChange={handleChange} fullWidth placeholder={Locale.label("placeholders.song.artist")} />
      </InputBox>
    </>
  );
};
