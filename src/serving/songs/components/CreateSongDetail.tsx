import { TextField } from "@mui/material";
import React from "react";
import { useForm } from "react-hook-form";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type SongDetailInterface } from "../../../helpers";
import { FormCard } from "../../../components/ui";

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
      <FormCard title={Locale.label("songs.create.title")} icon="library_music" onSave={handleSubmit(onValid)}>
        <TextField label={Locale.label("songs.create.songTitle")} fullWidth placeholder={Locale.label("placeholders.song.title")} {...register("title")} />
        <TextField label={Locale.label("songs.create.artist")} fullWidth placeholder={Locale.label("placeholders.song.artist")} {...register("artist")} />
      </FormCard>
    </>
  );
};
