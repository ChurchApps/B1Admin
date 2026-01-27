import React from 'react';
import type { SelectChangeEvent } from "@mui/material";
import type { GlobalStyleInterface } from '../../helpers/Interfaces';
import { TextField } from '@mui/material';
import { SliderPicker } from 'react-color';

type Props = {
  color:string;
  updatedCallback: (color:string) => void;
  globalStyles: GlobalStyleInterface;
};

export function ColorPicker(props: Props) {

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const val = e.target.value;
    props.updatedCallback(val);
  };

  const getGrayOptions = () => {
    const colors = ["#FFFFFF", "#CCCCCC", "#888888", "#444444", "#000000"];
    return getManualOptions(colors, colors);
  };

  const getThemeOptions = () => {
    if (props.globalStyles?.palette) {
      const palette = JSON.parse(props.globalStyles.palette);
      const colors = [palette.light, palette.lightAccent, palette.accent, palette.darkAccent, palette.dark];
      return getManualOptions(colors, ["var(--light)", "var(--lightAccent)", "var(--accent)", "var(--darkAccent)", "var(--dark)"]);
    }
  };

  const getManualOptions = (colors:string[], values:string[]) => {
    const result: React.ReactElement[] = [];
    colors.forEach((c, i) => {
      const v = values[i];
      const style: any = { backgroundColor: c, width: "100%", height: (props.color === v) ? 20 : 12, display: "block" };
      if (c === "#FFFFFF" || v === "var(--light)") style.border = "1px solid #999";
      result.push(<td><a href="about:blank" style={style} onClick={(e) => { e.preventDefault(); props.updatedCallback(v); }} data-testid={`color-option-${i}`} aria-label={`Select color ${v}`}>&nbsp;</a></td>);
    });
    return (<table style={{ width: "100%", marginTop: 10 }} key={"ManualColors"}>
      <tbody>
        <tr>
          {result}
        </tr>
      </tbody>
    </table>);
  };


  return (
    <>
      <SliderPicker key="sliderPicker" color={props.color} onChangeComplete={(color) => { if (color.hex !== "#000000") props.updatedCallback(color.hex); }} />
      {getGrayOptions()}
      {getThemeOptions()}
      <TextField key="backgroundText" fullWidth size="small" label="Color" name="background" value={props.color} onChange={handleChange} placeholder="#FF0000" data-testid="color-input" aria-label="Enter color value" />
    </>
  );
}
