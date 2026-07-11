import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type LinkInterface } from "@churchapps/helpers";
import { TextField } from "@mui/material";
import { FormCard } from "../../../components/ui";
import { useConfirmDelete } from "../../../hooks";

interface Props {
  link: LinkInterface;
  onSave: (link: LinkInterface) => void;
  onCancel: () => void;
}

type AnyRecord = Record<string, any>;

export const LinkEdit = (props: Props) => {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const { register, handleSubmit, reset } = useForm<AnyRecord>({ defaultValues: { url: "", text: "" } });
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  useEffect(() => {
    if (props.link) reset({ ...props.link });
  }, [props.link, reset]);

  const onValid = (values: AnyRecord) => {
    const l: LinkInterface = { ...props.link, ...values };
    ApiHelper.post("/links", [l], "ContentApi").then((data: any) => {
      props.onSave(data[0]);
    });
  };

  const handleDelete = async () => {
    if (await confirm(Locale.label("songs.link.deleteConfirm"))) {
      ApiHelper.delete("/links/" + props.link?.id, "ContentApi").then(() => {
        props.onSave(null as unknown as LinkInterface);
      });
    }
  };

  return (
    <>
      {ConfirmDialogElement}
      <FormCard title={Locale.label("songs.link.edit")} icon="link" onSave={handleSubmit(onValid)} onCancel={props.onCancel} onDelete={props.link?.id ? handleDelete : undefined}>
        <TextField label={Locale.label("songs.link.url")} fullWidth placeholder={Locale.label("placeholders.song.linkUrl")} {...register("url")} />
        <TextField label={Locale.label("songs.link.text")} fullWidth placeholder={Locale.label("songs.link.chordChart")} {...register("text")} />
      </FormCard>
    </>
  );
};
