import React, { useEffect } from "react";
import { ApiHelper, InputBox, Locale } from "@churchapps/apphelper";
import { type ArrangementKeyInterface } from "../../../helpers";
import { TextField } from "@mui/material";

interface Props {
  arrangementKey: ArrangementKeyInterface;
  onSave: (arrangementKey: ArrangementKeyInterface) => void;
  onCancel: () => void;
}

export const KeyEdit = (props: Props) => {
  const [key, setKey] = React.useState<ArrangementKeyInterface>(props.arrangementKey);

  useEffect(() => {
    setKey(props.arrangementKey);
  }, [props.arrangementKey]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const k = { ...key };
    switch (e.target.name) {
      case "keySignature":
        k.keySignature = e.target.value;
        break;
      case "shortDescription":
        k.shortDescription = e.target.value;
        break;
    }
    setKey(k);
  };

  const handleSave = () => {
    ApiHelper.post("/arrangementKeys", [key], "ContentApi").then((data) => {
      props.onSave(data[0]);
    });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("songs.key.deleteConfirm"))) {
      ApiHelper.delete("/arrangementKeys/" + key?.id, "ContentApi").then(() => {
        props.onSave(null);
      });
    }
  };

  return (
    <InputBox
      headerText={props.arrangementKey?.keySignature || Locale.label("songs.key.edit")}
      headerIcon="library_music"
      saveFunction={handleSave}
      cancelFunction={props.onCancel}
      deleteFunction={key?.id ? handleDelete : null}>
      <TextField label={Locale.label("songs.key.signature")} name="keySignature" value={key?.keySignature} onChange={handleChange} fullWidth placeholder={Locale.label("placeholders.song.keySignature")} />
      <TextField
        label={Locale.label("songs.key.labelOptional") || "Label (optional)"}
        multiline
        name="shortDescription"
        value={key?.shortDescription}
        onChange={handleChange}
        fullWidth
        placeholder={Locale.label("songs.key.defaultLabel")}
      />
    </InputBox>
  );
};
