import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { ApiHelper, DateHelper, Locale } from "@churchapps/apphelper";
import { type SongDetailInterface } from "../../../helpers";
import { Grid, TextField } from "@mui/material";
import { FormCard } from "../../../components/ui";
import { AppDatePicker } from "../../../components";

interface Props {
  songDetail: SongDetailInterface;
  onSave: (songDetail: SongDetailInterface) => void;
  reload: () => void;
  onCancel: () => void;
}

// Inputs hold the date as an HTML5 date string and the numbers as typed.
type SongDetailFormValues = Omit<SongDetailInterface, "releaseDate" | "bpm" | "seconds"> & { releaseDate: string; bpm?: number | string; seconds?: number | string };

// The API takes null to clear these fields.
type SongDetailSaveInterface = Omit<SongDetailInterface, "releaseDate" | "bpm" | "seconds"> & { releaseDate: Date | null; bpm: number | null; seconds: number | null };

const buildDefaults = (sd: SongDetailInterface): SongDetailFormValues => ({
  ...sd,
  releaseDate: sd?.releaseDate ? DateHelper.formatHtml5Date(sd.releaseDate) : ""
});

export const SongDetailsEdit = (props: Props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const { register, handleSubmit, reset, control } = useForm<SongDetailFormValues>({ defaultValues: buildDefaults(props.songDetail) });
  useEffect(() => {
    reset(buildDefaults(props.songDetail));
  }, [props.songDetail, reset]);

  const onValid = (values: SongDetailFormValues) => {
    const sd: SongDetailSaveInterface = {
      ...props.songDetail,
      ...values,
      releaseDate: values.releaseDate ? DateHelper.toDate(values.releaseDate) : null,
      bpm: values.bpm !== "" && values.bpm != null ? Number(values.bpm) : null,
      seconds: values.seconds !== "" && values.seconds != null ? Number(values.seconds) : null
    };
    ApiHelper.post("/songDetails", [sd], "ContentApi").then((data: SongDetailInterface[]) => {
      props.onSave(data[0]);
    });
  };

  return (
    <FormCard title={props.songDetail?.title || ""} icon="album" onSave={handleSubmit(onValid)} onCancel={props.onCancel}>
      <TextField label={Locale.label("songs.details.album")} fullWidth size="small" placeholder={Locale.label("placeholders.song.album")} {...register("album")} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField label={Locale.label("songs.details.language")} fullWidth size="small" placeholder={Locale.label("placeholders.song.language")} {...register("language")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Controller name="releaseDate" control={control} render={({ field }) => (
            <AppDatePicker label={Locale.label("songs.details.releaseDate")} fullWidth size="small" value={field.value ?? ""} onChange={field.onChange} onBlur={field.onBlur} inputRef={field.ref} />
          )} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField type="number" label={Locale.label("songs.details.bpm")} fullWidth size="small" placeholder={Locale.label("placeholders.song.bpm")} {...register("bpm")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField label={Locale.label("songs.details.key")} fullWidth size="small" placeholder={Locale.label("placeholders.song.keySignature")} slotProps={{ htmlInput: { maxLength: 20 } }} {...register("keySignature")} />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField type="number" label={Locale.label("songs.details.seconds")} fullWidth size="small" placeholder={Locale.label("placeholders.song.lengthSeconds")} {...register("seconds")} />
        </Grid>
      </Grid>
    </FormCard>
  );
};
