import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type ArrangementInterface } from "../../../helpers";
import { TextField } from "@mui/material";
import { FormCard } from "../../../components/ui";
import { useConfirmDelete } from "../../../hooks";

interface Props {
  arrangement: ArrangementInterface;
  onSave: (arrangement: ArrangementInterface | null) => void;
  onCancel: () => void;
}

type AnyRecord = Record<string, any>;

export const ArrangementEdit = (props: Props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const { register, handleSubmit, reset } = useForm<AnyRecord>({ defaultValues: { name: "", lyrics: "" } });
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  useEffect(() => {
    if (props.arrangement) reset({ ...props.arrangement });
  }, [props.arrangement, reset]);

  const onValid = (values: AnyRecord) => {
    const a: ArrangementInterface = { ...props.arrangement, ...values };
    if (Number.isNaN(a.bpm as number)) a.bpm = undefined;
    if (Number.isNaN(a.seconds as number)) a.seconds = undefined;
    ApiHelper.post("/arrangements", [a], "ContentApi").then((data: any) => {
      props.onSave(data[0]);
    });
  };

  const handleDelete = async () => {
    if (await confirm(Locale.label("songs.arrangement.deleteConfirm"))) {
      ApiHelper.delete("/arrangements/" + props.arrangement?.id, "ContentApi").then(() => {
        props.onSave(null);
      });
    }
  };

  return (
    <>
      {ConfirmDialogElement}
      <FormCard title={props.arrangement?.name || Locale.label("songs.arrangement.edit")} icon="library_music" onSave={handleSubmit(onValid)} onCancel={props.onCancel} onDelete={props.arrangement?.id ? handleDelete : undefined}>
        <TextField label={Locale.label("songs.arrangement.name")} fullWidth placeholder={Locale.label("placeholders.song.arrangementName")} {...register("name")} />
        <TextField label={Locale.label("songs.details.bpm") || "BPM"} type="number" fullWidth {...register("bpm", { valueAsNumber: true })} />
        <TextField label={Locale.label("songs.details.meter") || "Meter"} fullWidth {...register("meter")} />
        <TextField label={Locale.label("songs.details.length") || "Length"} type="number" placeholder="seconds" fullWidth {...register("seconds", { valueAsNumber: true })} />
        <TextField label="Sequence" fullWidth placeholder="Verse 1, Chorus, Verse 2, Chorus, Bridge" {...register("sequence")} />
        <TextField label={Locale.label("songs.arrangement.lyrics")} multiline fullWidth placeholder={Locale.label("placeholders.song.lyrics")} {...register("lyrics")} maxRows={25} sx={{ "& textarea": { maxHeight: 600, overflowY: "auto !important" } }} />
      </FormCard>
    </>
  );
};
