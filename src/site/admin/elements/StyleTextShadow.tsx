import { TextField } from "@mui/material";
import React, { useEffect } from "react";
import { ColorPicker } from "../ColorPicker";

interface Props {
  value: string,
  onChange: (value:string) => void;
}


export const StyleTextShadow: React.FC<Props> = (props) => {

  const [offsetX, setOffsetX] = React.useState(1);
  const [offsetY, setOffsetY] = React.useState(1);
  const [blurRadius, setBlurRadius] = React.useState(2);
  const [color, setColor] = React.useState("#FFFFFF");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let tempOffsetX = offsetX;
    let tempOffsetY = offsetY;
    let tempBlurRadius = blurRadius;
    let tempColor = color;

    switch (e.target.name) {
      case "offsetX": setOffsetX(parseInt(e.target.value)); tempOffsetX = parseInt(e.target.value); break;
      case "offsetY": setOffsetY(parseInt(e.target.value)); tempOffsetY = parseInt(e.target.value); break;
      case "blurRadius": setBlurRadius(parseInt(e.target.value)); tempBlurRadius = parseInt(e.target.value); break;
      case "color": setColor(e.target.value); tempColor = e.target.value; break;
    }
    let newString = `${tempOffsetX}px ${tempOffsetY}px ${tempBlurRadius}px ${tempColor}`;
    if (tempBlurRadius === 0) newString = "";
    props.onChange(newString);
  };

  useEffect(() => {
    const parts = props.value.replace(";", "").split(" ");
    if (parts.length === 4) {
      setOffsetX(parseInt(parts[0].replace("px", "")));
      setOffsetY(parseInt(parts[1].replace("px", "")));
      setBlurRadius(parseInt(parts[2].replace("px", "")));
      setColor(parts[3]);
    }
  }, [props.value]);


  return <>
    <TextField fullWidth style={{ marginTop: 10 }} size="small" label="Offset X - px" name="offsetX" value={offsetX} onChange={handleChange} type="number" />
    <TextField fullWidth style={{ marginTop: 10 }} size="small" label="Offset X - px" name="offsetY" value={offsetY} onChange={handleChange} type="number" />
    <TextField fullWidth style={{ marginTop: 10 }} size="small" label="Blur Radius - px" name="blurRadius" value={blurRadius} onChange={handleChange} type="number" />
    <ColorPicker color={color} updatedCallback={(c) => setColor(c)} globalStyles={null} />
  </>;
};
