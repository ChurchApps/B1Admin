import React, { useState } from "react";
import type { SelectChangeEvent } from "@mui/material";
import type { GlobalStyleInterface } from "../../../helpers";
import { GalleryModal, Locale } from "@churchapps/apphelper";
import { FormControl, InputLabel, Select, MenuItem, TextField, Tabs, Tab, Button, Grid } from "@mui/material";
import { SliderPicker } from "react-color";

type Props = {
  background: string;
  textColor: string;
  headingColor: string;
  linkColor: string;
  updatedCallback: (background: string, textColor: string, headingColor: string, linkColor: string) => void;
  globalStyles: GlobalStyleInterface;
  backgroundOpacity?: any;
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => void;
};

export function PickColors(props: Props) {
  const [selectPhotoField, setSelectPhotoField] = useState<string>(null);
  const [tabValue, setTabValue] = useState<string>("suggested");

  const handlePhotoSelected = (image: string) => {
    props.updatedCallback(image, props.textColor, props.headingColor, props.linkColor);
    setSelectPhotoField(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const val = e.target.value;
    switch (e.target.name) {
      case "background":
        props.updatedCallback(val, props.textColor, props.headingColor, props.linkColor);
        break;
      case "backgroundType":
        switch (val) {
          case "image":
            props.updatedCallback("https://content.churchapps.org/stockPhotos/4/bible.png", props.textColor, props.headingColor, props.linkColor);
            break;
          case "youtube":
            props.updatedCallback("youtube:3iXYciBTQ0c", props.textColor, props.headingColor, props.linkColor);
            break;
          default:
            props.updatedCallback("#000000", props.textColor, props.headingColor, props.linkColor);
            break;
        }
        break;
      case "textColor":
        props.updatedCallback(props.background, val, props.headingColor, props.linkColor);
        break;
      case "headingColor":
        props.updatedCallback(props.background, props.textColor, val, props.linkColor);
        break;
      case "youtubeId":
        props.updatedCallback("youtube:" + val, props.textColor, props.headingColor, props.linkColor);
        break;
    }
  };

  const getGrayOptions = () => {
    const colors = ["#FFFFFF", "#CCCCCC", "#888888", "#444444", "#000000"];
    return getManualOptions(colors, colors, "background");
  };

  const getThemeOptions = (field: "background" | "textColor" | "headingColor" | "linkColor" = "background") => {
    if (props.globalStyles?.palette) {
      const palette = JSON.parse(props.globalStyles.palette);
      const colors = [palette.light, palette.lightAccent, palette.accent, palette.darkAccent, palette.dark];
      return getManualOptions(colors, ["var(--light)", "var(--lightAccent)", "var(--accent)", "var(--darkAccent)", "var(--dark)"], field);
    }
  };

  const updateField = (field: "background" | "textColor" | "headingColor" | "linkColor", value: string) => {
    switch (field) {
      case "background":
        props.updatedCallback(value, props.textColor, props.headingColor, props.linkColor);
        break;
      case "textColor":
        props.updatedCallback(props.background, value, props.headingColor, props.linkColor);
        break;
      case "headingColor":
        props.updatedCallback(props.background, props.textColor, value, props.linkColor);
        break;
      case "linkColor":
        props.updatedCallback(props.background, props.textColor, props.headingColor, value);
        break;
    }
  };

  const getManualOptions = (colors: string[], values: string[], field: "background" | "textColor" | "headingColor" | "linkColor") => {
    const result: React.ReactElement[] = [];
    colors.forEach((c, i) => {
      const v = values[i];
      const style: any = { backgroundColor: c, width: "100%", height: props[field] === v ? 20 : 12, display: "block" };
      if (c === "#FFFFFF" || v === "var(--light)") style.border = "1px solid #999";
      result.push(
        <td>
          <a
            href="about:blank"
            style={style}
            onClick={(e) => {
              e.preventDefault();
              updateField(field, v);
            }}>
            &nbsp;
          </a>
        </td>
      );
    });
    return (
      <table style={{ width: "100%", marginTop: 10 }} key={field + "ManualColors"}>
        <tbody>
          <tr>{result}</tr>
        </tbody>
      </table>
    );
  };

  const getBackgroundField = () => {
    let backgroundType = "image";
    if (props.background?.startsWith("#") || props.background?.startsWith("var(")) backgroundType = "color";
    else if (props.background?.startsWith("youtube")) backgroundType = "youtube";

    const result: React.ReactElement[] = [
      <FormControl fullWidth>
        <InputLabel>Background Type</InputLabel>
        <Select fullWidth size="small" label="Background Type" name="backgroundType" value={backgroundType} onChange={handleChange} data-testid="background-type-select">
          <MenuItem value="color">Color</MenuItem>
          <MenuItem value="image">Image</MenuItem>
          <MenuItem value="youtube">Youtube Video</MenuItem>
        </Select>
      </FormControl>,
    ];

    if (backgroundType === "color") {
      result.push(
        <SliderPicker
          key="sliderPicker"
          color={props.background}
          onChangeComplete={(color) => {
            if (color.hex !== "#000000") props.updatedCallback(color.hex, props.textColor, props.headingColor, props.linkColor);
          }}
        />
      );
      result.push(getGrayOptions());
      result.push(getThemeOptions());
      result.push(<br />);
      result.push(<TextField key="backgroundText" fullWidth size="small" label="Background" name="background" value={props.background} onChange={handleChange} />);
    } else if (backgroundType === "youtube") {
      const parts = props.background.split(":");
      const youtubeId = parts.length > 1 ? parts[1] : "";
      result.push(
        <>
          <TextField fullWidth size="small" label="Youtube ID" name="youtubeId" value={youtubeId} onChange={handleChange} />
        </>
      );
    } else if (backgroundType === "image") {
      result.push(
        <>
          <img src={props.background} style={{ maxHeight: 100, maxWidth: "100%", width: "auto" }} alt="background image" />
          <br />
          <Button variant="contained" onClick={() => setSelectPhotoField("photo")} data-testid="select-photo-button">
            Select photo
          </Button>
          {props?.onChange && (
            <TextField
              fullWidth
              size="small"
              label="Background Opacity"
              name="backgroundOpacity"
              value={props?.backgroundOpacity || "0.55"}
              onChange={props.onChange}
              type="number"
              sx={{ marginTop: 2 }}
              helperText={Locale.label("site.pickColors.opacityHelper")}
              FormHelperTextProps={{ sx: { marginLeft: 1 } }}
              InputProps={{ inputProps: { min: "0", max: "1", step: "1" } }}
            />
          )}
        </>
      );
    }

    return <>{result}</>;
  };

  //

  const selectPairing = (pair: string[]) => {
    props.updatedCallback("var(--" + pair[0] + ")", "var(--" + pair[1] + ")", "var(--" + pair[1] + ")", "var(--" + pair[2] + ")");
  };

  const getRGB = (hex: string) => {
    const r = parseInt(hex.substring(1, 3), 16);
    const g = parseInt(hex.substring(3, 5), 16);
    const b = parseInt(hex.substring(5, 7), 16);
    return { r: r, g: g, b: b };
  };

  const enoughContrast = (rgb1: any, rgb2: any) => {
    const contrastR = Math.abs(rgb1.r - rgb2.r);
    const contrastG = Math.abs(rgb1.r - rgb2.r);
    const contrastB = Math.abs(rgb1.r - rgb2.r);
    return contrastR + contrastG + contrastB > 250;
  };

  const determineLinkColor = (background: string, text: string) => {
    let name = "accent";
    switch (background) {
      case "light":
      case "lightAccent":
        name = text === "darkAccent" ? "accent" : "darkAccent";
        break;
      case "accent":
        name = text === "lightAccent" ? "darkAccent" : "lightAccent";
        break;
      case "darkAccent":
      case "dark":
        name = text === "lightAccent" ? "accent" : "lightAccent";
        break;
    }
    return name;
  };

  const getSuggestedColors = () => {
    const colors = JSON.parse(props.globalStyles.palette);
    const pairings: any[] = [];
    const names = ["light", "lightAccent", "accent", "darkAccent", "dark"];
    names.forEach((nb) => {
      names.forEach((nt) => {
        const rgbB = getRGB(colors[nb]);
        const rgbT = getRGB(colors[nt]);
        if (enoughContrast(rgbB, rgbT)) {
          const linkColor = determineLinkColor(nb, nt);
          pairings.push([nb, nt, linkColor]);
        }
      });
    });

    const suggestions: React.ReactElement[] = [];

    pairings.forEach((p) => {
      const b = colors[p[0]];
      const t = colors[p[1]];
      const l = colors[p[2]];
      suggestions.push(
        <Grid key={crypto.randomUUID()} size={{ xs: 4 }}>
          <a
            href="about:blank"
            onClick={(e) => {
              e.preventDefault();
              selectPairing(p);
            }}
            style={{
              display: "block",
              backgroundColor: b,
              color: t,
              border: "1px solid " + t,
              borderRadius: 5,
              padding: 5,
              marginBottom: 3,
            }}>
            Sample Text - <span style={{ color: l }}>Sample Link</span>
          </a>
        </Grid>
      );
    });

    return (
      <Grid container spacing={0.2}>
        {suggestions}
      </Grid>
    );
  };

  const getManualColors = () => (
    <Grid container spacing={1}>
      <Grid size={{ xs: 6 }}>
        <div style={{ marginBottom: 20 }}>
          <b>Background</b>
        </div>
        {getBackgroundField()}
      </Grid>
      <Grid size={{ xs: 6 }}>
        <div style={{ marginBottom: 20 }}>
          <b>Content</b>
        </div>
        <div>
          <InputLabel>{Locale.label("site.pickColors.headingColor")}</InputLabel>
        </div>
        {getThemeOptions("headingColor")}
        <div>
          <InputLabel>{Locale.label("site.pickColors.textColor")}</InputLabel>
        </div>
        {getThemeOptions("textColor")}
        <div>
          <InputLabel>{Locale.label("site.pickColors.linkColor")}</InputLabel>
        </div>
        {getThemeOptions("linkColor")}
      </Grid>
    </Grid>
  );

  let currentTab = null;
  switch (tabValue) {
    case "suggested":
      currentTab = getSuggestedColors();
      break;
    case "custom":
      currentTab = getManualColors();
      break;
  }

  return (
    <>
      <h4>Current Colors</h4>
      <div
        style={{
          display: "block",
          backgroundColor: props.background,
          color: props.textColor,
          border: "1px solid " + props.textColor,
          borderRadius: 5,
          padding: 5,
          marginBottom: 10,
        }}>
        Sample Text
      </div>
      <Tabs value={tabValue} onChange={(event: React.SyntheticEvent, newValue: string) => setTabValue(newValue)}>
        <Tab value="suggested" label="Suggested" />
        <Tab value="custom" label={Locale.label("common.custom")} />
      </Tabs>
      <div style={{ marginTop: 10 }}>{currentTab}</div>
      {selectPhotoField && <GalleryModal onClose={() => setSelectPhotoField(null)} onSelect={handlePhotoSelected} aspectRatio={0} />}
    </>
  );
}
