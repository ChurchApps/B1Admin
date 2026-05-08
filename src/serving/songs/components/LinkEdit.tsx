import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ApiHelper, InputBox, type LinkInterface, Locale } from "@churchapps/apphelper";
import { TextField } from "@mui/material";

interface Props {
  link: LinkInterface;
  onSave: (link: LinkInterface) => void;
  onCancel: () => void;
}

type AnyRecord = Record<string, any>;

export const LinkEdit = (props: Props) => {
  const { register, handleSubmit, reset } = useForm<AnyRecord>({ defaultValues: { url: "", text: "" } });

  useEffect(() => {
    if (props.link) reset({ ...props.link });
  }, [props.link, reset]);

  const onValid = (values: AnyRecord) => {
    const l: LinkInterface = { ...props.link, ...values };
    ApiHelper.post("/links", [l], "ContentApi").then((data) => {
      props.onSave(data[0]);
    });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("songs.link.deleteConfirm"))) {
      ApiHelper.delete("/links/" + props.link?.id, "ContentApi").then(() => {
        props.onSave(null);
      });
    }
  };

  return (
    <InputBox headerText={Locale.label("songs.link.edit")} headerIcon="link" saveFunction={handleSubmit(onValid)} cancelFunction={props.onCancel} deleteFunction={props.link?.id ? handleDelete : null}>
      <TextField label={Locale.label("songs.link.url")} fullWidth placeholder={Locale.label("placeholders.song.linkUrl")} {...register("url")} />
      <TextField label={Locale.label("songs.link.text")} fullWidth placeholder={Locale.label("songs.link.chordChart")} {...register("text")} />
    </InputBox>
  );
};
