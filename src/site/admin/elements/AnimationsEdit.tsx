import type { AnimationsInterface } from "../../../helpers";
import type { SelectChangeEvent } from "@mui/material";
import { InputBox, Locale } from "@churchapps/apphelper";
import { FormControl, Grid, InputLabel, MenuItem, Select } from "@mui/material";
import React, { useEffect } from "react";

interface Props {
  animations: AnimationsInterface,
  onSave: (animations:AnimationsInterface) => void;
}


export const AnimationsEdit: React.FC<Props> = (props) => {
  const [animations, setAnimations] = React.useState(props.animations || { onShow: "", onShowSpeed: "" });

  useEffect(() => {
    if (props.animations) setAnimations(props.animations);
    else setAnimations({ onShow: "", onShowSpeed: "" });
  }, [props.animations]);

  const handleSave = () => {
    props.onSave(animations);
    props.onSave(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const val = e.target.value;
    const a = { ...animations };
    switch (e.target.name) {
      case "onShow":
        a.onShow = val;
        if (val && !a.onShowSpeed) a.onShowSpeed = "normal";
        break;
      case "onShowSpeed": a.onShowSpeed = val; break;
    }
    setAnimations(a);
  };

  return <InputBox saveFunction={handleSave} saveText={Locale.label("common.update")} headerText={Locale.label("site.animations.editAnimations")} cancelFunction={() => { props.onSave(null); }}>
    <Grid container spacing={2}>
      <Grid size={{ xs: 6 }}>
        <FormControl size="small" fullWidth style={{ marginTop: 10 }}>
          <InputLabel>{Locale.label("site.animations.onShowAnimation")}</InputLabel>
          <Select size="small" fullWidth label={Locale.label("site.animations.onShowAnimation")} name="onShow" value={animations?.onShow || ""} onChange={handleChange}>
            <MenuItem value="">{Locale.label("site.animations.none")}</MenuItem>
            <MenuItem value="slideLeft">{Locale.label("site.animations.slideLeft")}</MenuItem>
            <MenuItem value="slideRight">{Locale.label("site.animations.slideRight")}</MenuItem>
            <MenuItem value="slideUp">{Locale.label("site.animations.slideUp")}</MenuItem>
            <MenuItem value="slideDown">{Locale.label("site.animations.slideDown")}</MenuItem>
            <MenuItem value="fadeIn">{Locale.label("site.animations.fadeIn")}</MenuItem>
            <MenuItem value="grow">{Locale.label("site.animations.grow")}</MenuItem>
            <MenuItem value="shrink">{Locale.label("site.animations.shrink")}</MenuItem>
            <MenuItem value="pulse">{Locale.label("site.animations.pulse")}</MenuItem>
            <MenuItem value="colorize">{Locale.label("site.animations.colorize")}</MenuItem>
            <MenuItem value="focus">{Locale.label("site.animations.focus")}</MenuItem>
          </Select>
        </FormControl>
      </Grid>
      <Grid size={{ xs: 6 }}>
        <FormControl size="small" fullWidth style={{ marginTop: 10 }}>
          <InputLabel>{Locale.label("site.animations.onShowSpeed")}</InputLabel>
          <Select size="small" fullWidth label={Locale.label("site.animations.onShowSpeed")} name="onShowSpeed" value={animations?.onShowSpeed || "normal"} onChange={handleChange}>
            <MenuItem value="slow">{Locale.label("site.animations.slow")}</MenuItem>
            <MenuItem value="normal">{Locale.label("site.animations.normal")}</MenuItem>
            <MenuItem value="fast">{Locale.label("site.animations.fast")}</MenuItem>
          </Select>
        </FormControl>
      </Grid>
    </Grid>


  </InputBox>;

};
