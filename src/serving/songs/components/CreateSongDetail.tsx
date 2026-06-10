import { TextField } from "@mui/material";
import React from "react";
import { useForm } from "react-hook-form";
import { ApiHelper, InputBox, Locale } from "@churchapps/apphelper";
import { type SongDetailInterface } from "../../../helpers";

interface Props {
  onSave: (songDetail: SongDetailInterface) => void;
}

type AnyRecord = Record<string, any>;

export const CreateSongDetail: React.FC<Props> = (props) => {
  const { register, handleSubmit } = useForm<AnyRecord>({ defaultValues: { title: "", artist: "", seconds: 0 } });

  const onValid = (values: AnyRecord) => {
    const sd = { ...values } as SongDetailInterface;
    ApiHelper.post("/songDetails", [sd], "ContentApi").then((data: any) => {
      props.onSave(data[0]);
    });
  };

  return (
    <>
      <InputBox headerText={Locale.label("songs.create.title")} headerIcon="library_music" saveFunction={handleSubmit(onValid)}>
        <TextField label={Locale.label("songs.create.songTitle")} fullWidth placeholder={Locale.label("placeholders.song.title")} {...register("title")} />
        <TextField label={Locale.label("songs.create.artist")} fullWidth placeholder={Locale.label("placeholders.song.artist")} {...register("artist")} />
      </InputBox>
    </>
  );
};
