import React, { useEffect } from "react";
import { ApiHelper, InputBox, Locale } from "@churchapps/apphelper";
import { type ArrangementInterface } from "../../../helpers";
import { TextField } from "@mui/material";

interface Props {
  arrangement: ArrangementInterface;
  onSave: (arrangement: ArrangementInterface) => void;
  onCancel: () => void;
}

export const ArrangementEdit = (props: Props) => {
  const [arrangement, setArrangement] = React.useState<ArrangementInterface>(props.arrangement);

  useEffect(() => {
    setArrangement(props.arrangement);
  }, [props.arrangement]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = { ...arrangement };
    switch (e.target.name) {
      case "name":
        a.name = e.target.value;
        break;
      case "lyrics":
        a.lyrics = e.target.value;
        break;
    }
    setArrangement(a);
  };

  const handleSave = () => {
    ApiHelper.post("/arrangements", [arrangement], "ContentApi").then((data) => {
      props.onSave(data[0]);
    });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("songs.arrangement.deleteConfirm"))) {
      ApiHelper.delete("/arrangements/" + arrangement?.id, "ContentApi").then(() => {
        props.onSave(null);
      });
    }
  };

  return (
    <InputBox
      headerText={props.arrangement?.name || Locale.label("songs.arrangement.edit")}
      headerIcon="library_music"
      saveFunction={handleSave}
      cancelFunction={props.onCancel}
      deleteFunction={arrangement?.id ? handleDelete : null}>
      <TextField label={Locale.label("songs.arrangement.name")} name="name" value={arrangement?.name} onChange={handleChange} fullWidth placeholder={Locale.label("placeholders.song.arrangementName")} />
      <TextField label={Locale.label("songs.arrangement.lyrics")} multiline name="lyrics" value={arrangement?.lyrics} onChange={handleChange} fullWidth placeholder={Locale.label("placeholders.song.lyrics")} />
    </InputBox>
  );
};
