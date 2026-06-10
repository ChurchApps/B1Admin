import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type ArrangementInterface } from "../../../helpers";
import { TextField } from "@mui/material";
import { FormCard } from "../../../components/ui";

interface Props {
  arrangement: ArrangementInterface;
  onSave: (arrangement: ArrangementInterface) => void;
  onCancel: () => void;
}

type AnyRecord = Record<string, any>;

export const ArrangementEdit = (props: Props) => {
  const { register, handleSubmit, reset } = useForm<AnyRecord>({ defaultValues: { name: "", lyrics: "" } });

  useEffect(() => {
    if (props.arrangement) reset({ ...props.arrangement });
  }, [props.arrangement, reset]);

  const onValid = (values: AnyRecord) => {
    const a: ArrangementInterface = { ...props.arrangement, ...values };
    ApiHelper.post("/arrangements", [a], "ContentApi").then((data: any) => {
      props.onSave(data[0]);
    });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("songs.arrangement.deleteConfirm"))) {
      ApiHelper.delete("/arrangements/" + props.arrangement?.id, "ContentApi").then(() => {
        props.onSave(null);
      });
    }
  };

  return (
    <FormCard title={props.arrangement?.name || Locale.label("songs.arrangement.edit")} icon="library_music" onSave={handleSubmit(onValid)} onCancel={props.onCancel} onDelete={props.arrangement?.id ? handleDelete : undefined}>
      <TextField label={Locale.label("songs.arrangement.name")} fullWidth placeholder={Locale.label("placeholders.song.arrangementName")} {...register("name")} />
      <TextField label={Locale.label("songs.arrangement.lyrics")} multiline fullWidth placeholder={Locale.label("placeholders.song.lyrics")} {...register("lyrics")} />
    </FormCard>
  );
};
