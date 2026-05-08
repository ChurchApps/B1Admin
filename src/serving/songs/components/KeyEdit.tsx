import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { ApiHelper, InputBox, Locale } from "@churchapps/apphelper";
import { type ArrangementKeyInterface } from "../../../helpers";
import { TextField } from "@mui/material";

interface Props {
  arrangementKey: ArrangementKeyInterface;
  onSave: (arrangementKey: ArrangementKeyInterface) => void;
  onCancel: () => void;
}

type AnyRecord = Record<string, any>;

export const KeyEdit = (props: Props) => {
  const { register, handleSubmit, reset } = useForm<AnyRecord>({ defaultValues: { keySignature: "", shortDescription: "" } });

  useEffect(() => {
    if (props.arrangementKey) reset({ ...props.arrangementKey });
  }, [props.arrangementKey, reset]);

  const onValid = (values: AnyRecord) => {
    const k: ArrangementKeyInterface = { ...props.arrangementKey, ...values };
    ApiHelper.post("/arrangementKeys", [k], "ContentApi").then((data) => {
      props.onSave(data[0]);
    });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("songs.key.deleteConfirm"))) {
      ApiHelper.delete("/arrangementKeys/" + props.arrangementKey?.id, "ContentApi").then(() => {
        props.onSave(null);
      });
    }
  };

  return (
    <InputBox headerText={props.arrangementKey?.keySignature || Locale.label("songs.key.edit")} headerIcon="library_music" saveFunction={handleSubmit(onValid)} cancelFunction={props.onCancel} deleteFunction={props.arrangementKey?.id ? handleDelete : null}>
      <TextField label={Locale.label("songs.key.signature")} fullWidth placeholder={Locale.label("placeholders.song.keySignature")} {...register("keySignature")} />
      <TextField label={Locale.label("songs.key.labelOptional") || "Label (optional)"} multiline fullWidth placeholder={Locale.label("songs.key.defaultLabel")} {...register("shortDescription")} />
    </InputBox>
  );
};
