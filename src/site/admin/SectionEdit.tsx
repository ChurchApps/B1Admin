import type { SelectChangeEvent } from "@mui/material";
import React, { useState, useEffect } from "react";
import { ErrorMessages, InputBox, ApiHelper, ArrayHelper, Locale } from "@churchapps/apphelper";
import type { AnimationsInterface, BlockInterface, GlobalStyleInterface, SectionInterface } from "../../helpers";
import {
  Button, Dialog, FormControl, Icon, InputLabel, MenuItem, Select, TextField 
} from "@mui/material";
import { PickColors } from "./elements/PickColors";
import { StylesAnimations } from "./elements/StylesAnimations";

type Props = {
  section: SectionInterface;
  updatedCallback: (section: SectionInterface) => void;
  globalStyles: GlobalStyleInterface;
};

export function SectionEdit(props: Props) {
  const [blocks, setBlocks] = useState<BlockInterface[]>(null);
  const [section, setSection] = useState<SectionInterface>(null);
  const [errors, setErrors] = useState([]);
  const parsedData = (section?.answersJSON) ? JSON.parse(section.answersJSON) : {};
  const parsedStyles = (section?.stylesJSON) ? JSON.parse(section.stylesJSON) : {};
  const parsedAnimations = (section?.animationsJSON) ? JSON.parse(section.animationsJSON) : {};

  const handleCancel = () => props.updatedCallback(section);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const p = { ...section };
    const val = e.target.value;
    switch (e.target.name) {
      case "targetBlockId": p.targetBlockId = val; break;
      default:
        parsedData[e.target.name] = val;
        p.answersJSON = JSON.stringify(parsedData);
        break;
    }
    setSection(p);
  };

  const selectColors = ( background:string, textColor:string, headingColor:string, linkColor:string) => {
    const s = { ...section };
    s.background = background;
    s.textColor = textColor;
    s.headingColor = headingColor;
    s.linkColor = linkColor;
    setSection(s);
  };

  const validate = () => {
    const errors:string[] = [];
    setErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      ApiHelper.post("/sections", [section], "ContentApi").then((data: any) => {
        setSection(data);
        props.updatedCallback(data);
      });
    }
  };

  const handleDelete = () => {
    if (window.confirm(Locale.label("site.section.confirmDelete"))) {
      ApiHelper.delete("/sections/" + section.id.toString(), "ContentApi").then(() => props.updatedCallback(null));
    }
  };


  useEffect(() => {
    const loadBlocks = async () => {
      if (props.section.targetBlockId) {
        const result: BlockInterface[] = await ApiHelper.get("/blocks", "ContentApi");
        setBlocks(ArrayHelper.getAll(result, "blockType", "sectionBlock"));
      }
    };

    setSection(props.section);
    loadBlocks();
  }, [props.section]);


  const getStandardFields = () => (<>
    <ErrorMessages errors={errors} />
    <TextField fullWidth size="small" label="ID" name="sectionId" value={parsedData.sectionId || ""} onChange={handleChange} />
    <PickColors background={section?.background} backgroundOpacity={parsedData?.backgroundOpacity} textColor={section?.textColor} headingColor={section?.headingColor} linkColor={section?.linkColor} updatedCallback={selectColors} globalStyles={props.globalStyles} onChange={handleChange} />
    {getAppearanceFields([
      "border", "color", "font", "height", "line", "margin", "padding", "width"
    ])}
  </>);

  const getBlockFields = () => {
    const options: React.ReactElement[] = [];
    blocks?.forEach(b => {
      options.push(<MenuItem value={b.id}>{b.name}</MenuItem>);
    });
    return (<>
      <FormControl fullWidth>
        <InputLabel>Block</InputLabel>
        <Select fullWidth label="Block" name="targetBlockId" value={section.targetBlockId || ""} onChange={handleChange}>
          {options}
        </Select>
      </FormControl>
    </>);
  };

  const handleStyleChange = (styles: { name: string, value: string }[]) => {
    const p = { ...section };
    p.styles = styles;
    p.stylesJSON = styles && Object.keys(styles).length>0 ? JSON.stringify(styles) : null;
    setSection(p);
  };

  const handleAnimationChange = (animations: AnimationsInterface) => {
    const p = { ...section };
    p.animations = animations;
    p.animationsJSON = animations && Object.keys(animations).length>0 ? JSON.stringify(animations) : null;
    setSection(p);
  };

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm(Locale.label("site.section.confirmDuplicate"))) {
      ApiHelper.post("/sections/duplicate/" + props.section.id, {}, "ContentApi").then((data: any) => {
        props.updatedCallback(data);
      });
    }
  };

  const handleConvertToBlock = (e: React.MouseEvent) => {
    e.preventDefault();
    const name = window.prompt("Are you sure you wish to copy this section and all of it's contents to a block?", "Block Name");
    if (name !== null) {
      ApiHelper.post(`/sections/duplicate/${props.section.id}?convertToBlock=${name.toString()}`, {}, "ContentApi").then((data: any) => {
        props.updatedCallback(data);
      });
    }
  };

  const getAppearanceFields = (fields:string[]) => <StylesAnimations fields={fields} styles={parsedStyles} animations={parsedAnimations} onStylesChange={handleStyleChange} onAnimationsChange={handleAnimationChange} />;

  if (!section) return <></>;
  else {
    return (
    <Dialog open={true} onClose={handleCancel} fullWidth maxWidth="md">
      <InputBox
        id="sectionDetailsBox"
        headerText={Locale.label("site.section.editSection")}
        headerIcon="school"
        saveFunction={handleSave}
        cancelFunction={handleCancel}
        deleteFunction={handleDelete}
        data-testid="edit-section-inputbox"
        headerActionContent={props.section.id && (<><Button size="small" variant="outlined" onClick={handleConvertToBlock} title={Locale.label("site.sectionEdit.convertToBlock")} endIcon={<Icon>smart_button</Icon>} sx={{ marginRight: 2 }} data-testid="convert-to-block-button" aria-label={Locale.label("site.sectionEdit.convertToBlock")}>{Locale.label("site.sectionEdit.convertTo")}</Button><Button size="small" variant="outlined" onClick={handleDuplicate} data-testid="duplicate-section-button" aria-label={Locale.label("site.sectionEdit.duplicateSection")}>{Locale.label("site.sectionEdit.duplicate")}</Button></>)}
      >
        <div id="dialogFormContent">
          {(section?.targetBlockId) ? getBlockFields() : getStandardFields()}
        </div>
      </InputBox>

    </Dialog>
    );
  }
}
