import React, { useEffect } from "react";
import { ApiHelper, InputBox, type LinkInterface, Locale } from "@churchapps/apphelper";
import { TextField } from "@mui/material";

interface Props {
  link: LinkInterface;
  onSave: (link: LinkInterface) => void;
  onCancel: () => void;
}

export const LinkEdit = (props: Props) => {
  const [link, setLink] = React.useState<LinkInterface>(props.link);

  useEffect(() => {
    setLink(props.link);
  }, [props.link]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const l = { ...link };

    switch (e.target.name) {
      case "url":
        l.url = e.target.value;
        break;
      case "text":
        l.text = e.target.value;
        break;
    }
    setLink(l);
  };

  const handleSave = () => {
    ApiHelper.post("/links", [link], "ContentApi").then((data) => {
      props.onSave(data[0]);
    });
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("songs.link.deleteConfirm"))) {
      ApiHelper.delete("/links/" + link?.id, "ContentApi").then(() => {
        props.onSave(null);
      });
    }
  };

  return (
    <InputBox headerText={Locale.label("songs.link.edit")} headerIcon="link" saveFunction={handleSave} cancelFunction={props.onCancel} deleteFunction={link?.id ? handleDelete : null}>
      <TextField label={Locale.label("songs.link.url")} name="url" value={link?.url} onChange={handleChange} fullWidth placeholder={Locale.label("placeholders.song.linkUrl")} />
      <TextField label={Locale.label("songs.link.text")} name="text" value={link?.text} onChange={handleChange} fullWidth placeholder={Locale.label("songs.link.chordChart")} />
    </InputBox>
  );
};
