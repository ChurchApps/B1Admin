import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { type SongDetailInterface } from "../../../helpers";
import { TextField } from "@mui/material";
import { FormCard } from "../../../components/ui";

interface Props {
  songDetail: SongDetailInterface;
  onSave: (songDetail: SongDetailInterface) => void;
  reload: () => void;
  onCancel: () => void;
}

type AnyRecord = Record<string, any>;

const buildDefaults = (sd: SongDetailInterface): AnyRecord => ({
  ...sd,
  releaseDate: sd?.releaseDate ? DateHelper.formatHtml5Date(sd.releaseDate) : ""
});

export const SongDetailsEdit = (props: Props) => {
  const { register, handleSubmit, reset, control } = useForm<AnyRecord>({ defaultValues: buildDefaults(props.songDetail) });

  useEffect(() => {
    reset(buildDefaults(props.songDetail));
  }, [props.songDetail, reset]);

  const onValid = (values: AnyRecord) => {
    const sd: SongDetailInterface = { ...props.songDetail, ...values };
    sd.releaseDate = values.releaseDate ? DateHelper.toDate(values.releaseDate) : null;
    sd.bpm = values.bpm !== "" && values.bpm != null ? Number(values.bpm) : null;
    sd.seconds = values.seconds !== "" && values.seconds != null ? Number(values.seconds) : null;
    ApiHelper.post("/songDetails", [sd], "ContentApi").then((data: any) => {
      props.onSave(data[0]);
    });
  };

  return (
    <FormCard title={props.songDetail?.title} icon="album" onSave={handleSubmit(onValid)} onCancel={props.onCancel}>
      <TextField label={Locale.label("songs.details.album")} fullWidth size="small" placeholder={Locale.label("placeholders.song.album")} {...register("album")} />
      <TextField label={Locale.label("songs.details.language")} fullWidth size="small" placeholder={Locale.label("placeholders.song.language")} {...register("language")} />
      <Controller name="releaseDate" control={control} render={({ field }) => (
        <TextField type="date" label={Locale.label("songs.details.releaseDate")} fullWidth size="small" InputLabelProps={{ shrink: true }} value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} />
      )} />
      <TextField type="number" label={Locale.label("songs.details.bpm")} fullWidth size="small" placeholder={Locale.label("placeholders.song.bpm")} {...register("bpm")} />
      <TextField label={Locale.label("songs.details.key")} fullWidth size="small" placeholder={Locale.label("placeholders.song.keySignature")} {...register("keySignature")} />
      <TextField type="number" label={Locale.label("songs.details.seconds")} fullWidth size="small" placeholder={Locale.label("placeholders.song.lengthSeconds")} {...register("seconds")} />
    </FormCard>
  );
};
