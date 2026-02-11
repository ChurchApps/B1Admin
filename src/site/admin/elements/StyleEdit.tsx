import type { StyleOption } from "../../../helpers";
import { InputBox, Locale } from "@churchapps/apphelper";
import { FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import React, { useEffect } from "react";
import { ColorPicker } from "../ColorPicker";
import { StyleTextShadow } from "./StyleTextShadow";

interface Props {
  fieldOptions: StyleOption[],
  style: {platform:string, name:string, value:any},
  onSave: (platform:string, name:string, value:any) => void;
}


export const StyleEdit: React.FC<Props> = (props) => {

  const [name, setName] = React.useState(props.style.name || props.fieldOptions[0].key);
  const [value, setValue] = React.useState(props.style.value.replace("px", "") || props.fieldOptions[0].default);
  const field = props.fieldOptions.find((o: any) => o.key === name);

  const getInputField = () => {
    let result = <></>;

    switch (field.type) {
      case "text":
        result = <TextField fullWidth size="small" label={field.label} name="value" value={value} onChange={(e:any) => { setValue(e.target.value); }} />;
        break;
      case "select":
        result = <FormControl size="small" fullWidth style={{ marginTop: 10 }}>
          <InputLabel>{field.label}</InputLabel>
          <Select size="small" fullWidth label={field.label} name="value" value={value} onChange={(e) => { setValue(e.target.value); }}>
            {field.options.map(o => <MenuItem value={o}>{o}</MenuItem>)}
          </Select>
        </FormControl>;
        break;
      case "px":
        result = <TextField fullWidth style={{ marginTop: 10 }} size="small" label={field.label + " - px"} name="value" value={value} onChange={(e:any) => { setValue(e.target.value); }} type="number" />;
        break;
      case "color":
        result = <ColorPicker color={value} updatedCallback={(c) => setValue(c)} globalStyles={null} />;
        break;
      case "text-shadow":
        result = <StyleTextShadow value={value} onChange={(v) => setValue(v)} />;
        break;
    }
    return result;
  };

  useEffect(() => {
    if (name === props.style.name) setValue(props.style.value.replace("px", ""));
    else setValue(props.fieldOptions.find((o: any) => o.key === name).default);
  }, [name]);

  const handleSave = () => {
    let storedValue = value;
    if (field.type === "px") storedValue = value + "px";
    props.onSave(props.style.platform, name, storedValue);
  };

  return <InputBox saveFunction={handleSave} saveText={Locale.label("common.update")} headerText={Locale.label("site.style.editStyle")} cancelFunction={() => { props.onSave("", "", ""); }} deleteFunction={(props.style.name) ? () => { props.onSave(props.style.platform, props.style.name, null ); } : null}>
    <FormControl size="small" fullWidth>
      <InputLabel>{Locale.label("site.styleEdit.property")}</InputLabel>
      <Select size="small" fullWidth label={Locale.label("site.styleEdit.property")} name="name" value={name} onChange={(e) => { setName(e.target.value); }}>
        {props.fieldOptions.map(o => <MenuItem value={o.key}>{o.label}</MenuItem>)}
      </Select>
    </FormControl>
    {getInputField()}
  </InputBox>;

};
