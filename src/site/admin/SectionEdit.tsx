import type { SelectChangeEvent } from "@mui/material";
import React, { useState, useEffect } from "react";
import { ErrorMessages, ApiHelper, ArrayHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { useConfirmDelete } from "../../hooks";
import type { AnimationsInterface, BlockInterface, GlobalStyleInterface, SectionInterface } from "../../helpers";
import { Accordion, AccordionDetails, AccordionSummary, Button, Checkbox, Dialog, FormControl, FormControlLabel, Icon, InputLabel, MenuItem, Select, TextField, Typography } from "@mui/material";
import { PickColors } from "./elements/PickColors";
import { ColorPicker } from "./ColorPicker";
import { StylesAnimations } from "./elements/StylesAnimations";
import { trackSave } from "./saveStatusTracker";

const DIVIDER_SHAPES = ["wave", "waves", "slant", "curve", "triangle", "peaks"];

type Props = {
  section: SectionInterface;
  updatedCallback: (section: SectionInterface) => void;
  globalStyles: GlobalStyleInterface;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  inPanel?: boolean;
};

const sectionFingerprint = (s: SectionInterface) =>
  JSON.stringify([
    s?.answersJSON || null,
    s?.stylesJSON || null,
    s?.animationsJSON || null,
    s?.background || null,
    s?.textColor || null,
    s?.headingColor || null,
    s?.linkColor || null,
    s?.targetBlockId || null
  ]);

export function SectionEdit(props: Props) {
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const [blocks, setBlocks] = useState<BlockInterface[] | null>(null);
  const [section, setSection] = useState<SectionInterface | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  // Hoisted null-safe view of section: the compiler merges optional member deps
  // (section?.answersJSON) into non-optional guard reads that crash while section is null.
  const sec: SectionInterface = section || ({} as SectionInterface);
  const parsedData = sec.answersJSON ? JSON.parse(sec.answersJSON) : {};
  const parsedStyles = sec.stylesJSON ? JSON.parse(sec.stylesJSON) : {};
  const parsedAnimations = sec.animationsJSON ? JSON.parse(sec.animationsJSON) : {};
  const baselineRef = React.useRef<string>(null);
  const dirtyRef = React.useRef(false);

  useEffect(() => {
    if (!section || baselineRef.current === null) return;
    const dirty = sectionFingerprint(section) !== baselineRef.current;
    if (dirty !== dirtyRef.current) {
      dirtyRef.current = dirty;
      props.onDirtyChange?.(dirty);
    }
  }, [section]);

  const handleCancel = () => {
    if (props.onCancel) props.onCancel();
    else props.updatedCallback(props.section);
  };
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

  const setDividerField = (edge: "dividerTop" | "dividerBottom", field: string, value: any) => {
    const p = { ...section };
    const current = { ...(parsedData[edge] || {}) };
    if (field === "shape" && !value) {
      delete parsedData[edge];
    } else {
      current[field] = value;
      parsedData[edge] = current;
    }
    p.answersJSON = JSON.stringify(parsedData);
    setSection(p);
  };

  const getDividerFields = (edge: "dividerTop" | "dividerBottom", label: string) => {
    const config = parsedData[edge] || {};
    return (
      <div style={{ marginBottom: 12 }}>
        <Typography variant="subtitle2">{label}</Typography>
        <FormControl fullWidth size="small">
          <InputLabel>{Locale.label("site.sectionEdit.dividerShape")}</InputLabel>
          <Select fullWidth size="small" label={Locale.label("site.sectionEdit.dividerShape")} value={config.shape || ""} onChange={(e) => setDividerField(edge, "shape", e.target.value)} data-testid={`${edge}-shape-select`}>
            <MenuItem value="">{Locale.label("site.sectionEdit.dividerNone")}</MenuItem>
            {DIVIDER_SHAPES.map((s) => (<MenuItem key={s} value={s}>{Locale.label("site.sectionEdit.divider_" + s)}</MenuItem>))}
          </Select>
        </FormControl>
        {config.shape && (
          <>
            <div style={{ marginTop: 8 }}>
              <InputLabel>{Locale.label("site.sectionEdit.dividerColor")}</InputLabel>
              <ColorPicker color={config.color || "#ffffff"} updatedCallback={(c) => setDividerField(edge, "color", c)} globalStyles={props.globalStyles} />
            </div>
            <TextField fullWidth size="small" type="number" sx={{ marginTop: 1 }} label={Locale.label("site.sectionEdit.dividerHeight")} value={config.height ?? 60} onChange={(e) => setDividerField(edge, "height", e.target.value)} data-testid={`${edge}-height-input`} />
            <FormControlLabel control={<Checkbox checked={config.flip === true || config.flip === "true"} onChange={(e) => setDividerField(edge, "flip", e.target.checked)} data-testid={`${edge}-flip-toggle`} />} label={Locale.label("site.sectionEdit.dividerFlip")} />
          </>
        )}
      </div>
    );
  };

  const validate = () => {
    const errors:string[] = [];
    setErrors(errors);
    return errors.length === 0;
  };

  const handleSave = () => {
    if (validate()) {
      trackSave(ApiHelper.post("/sections", [section], "ContentApi")).then((data: any) => {
        baselineRef.current = sectionFingerprint(data);
        if (dirtyRef.current) {
          dirtyRef.current = false;
          props.onDirtyChange?.(false);
        }
        setSection(data);
        props.updatedCallback(data);
      });
    }
  };

  const handleDelete = async () => {
    if (await confirm(Locale.label("site.section.confirmDelete"))) {
      trackSave(ApiHelper.delete("/sections/" + sec.id?.toString(), "ContentApi")).then(() => props.updatedCallback(null as unknown as SectionInterface));
    }
  };


  useEffect(() => {
    const loadBlocks = async () => {
      if (props.section.targetBlockId) {
        const result: BlockInterface[] = await ApiHelper.get("/blocks", "ContentApi");
        setBlocks(ArrayHelper.getAll(result, "blockType", "sectionBlock"));
      }
    };

    baselineRef.current = sectionFingerprint(props.section);
    if (dirtyRef.current) {
      dirtyRef.current = false;
      props.onDirtyChange?.(false);
    }
    setSection(props.section);
    loadBlocks();
  }, [props.section]);


  const getStandardFields = () => (<>
    <ErrorMessages errors={errors} />
    <TextField fullWidth size="small" label={Locale.label("site.sectionEdit.id")} name="sectionId" value={parsedData.sectionId || ""} onChange={handleChange} />
    <PickColors
      background={section?.background || ""}
      backgroundOpacity={parsedData?.backgroundOpacity}
      overlayColor={parsedData?.overlayColor}
      focalPoint={parsedData?.focalPoint}
      textColor={section?.textColor || ""}
      headingColor={section?.headingColor || ""}
      linkColor={section?.linkColor || ""}
      updatedCallback={selectColors}
      globalStyles={props.globalStyles}
      onChange={handleChange}
    />
    {getAppearanceFields([
      "border", "color", "font", "height", "line", "margin", "padding", "width"
    ])}
    <Accordion disableGutters sx={{ boxShadow: "none", border: "1px solid var(--border-light)", mt: 2 }} data-testid="section-dividers-accordion">
      <AccordionSummary expandIcon={<Icon>expand_more</Icon>}>
        <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>{Locale.label("site.sectionEdit.dividers")}</Typography>
      </AccordionSummary>
      <AccordionDetails>
        {getDividerFields("dividerTop", Locale.label("site.sectionEdit.dividerTop"))}
        {getDividerFields("dividerBottom", Locale.label("site.sectionEdit.dividerBottom"))}
      </AccordionDetails>
    </Accordion>
  </>);

  const getBlockFields = () => {
    const options: React.ReactElement[] = [];
    blocks?.forEach(b => {
      options.push(<MenuItem value={b.id}>{b.name}</MenuItem>);
    });
    return (<>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.sectionEdit.block")}</InputLabel>
        <Select fullWidth label={Locale.label("site.sectionEdit.block")} name="targetBlockId" value={sec.targetBlockId || ""} onChange={handleChange}>
          {options}
        </Select>
      </FormControl>
    </>);
  };

  const handleStyleChange = (styles: { name: string, value: string }[]) => {
    const p = { ...section };
    p.styles = styles;
    p.stylesJSON = styles && Object.keys(styles).length > 0 ? JSON.stringify(styles) : undefined;
    setSection(p);
  };

  const handleAnimationChange = (animations: AnimationsInterface | null) => {
    const p = { ...section };
    p.animations = animations || undefined;
    p.animationsJSON = animations && Object.keys(animations).length > 0 ? JSON.stringify(animations) : undefined;
    setSection(p);
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (await confirm(Locale.label("site.section.confirmDuplicate"), { destructive: false, confirmLabel: Locale.label("common.confirm", "Confirm") })) {
      trackSave(ApiHelper.post("/sections/duplicate/" + props.section.id, {}, "ContentApi")).then((data: any) => {
        props.updatedCallback(data);
      });
    }
  };

  const handleConvertToBlock = (e: React.MouseEvent) => {
    e.preventDefault();
    const name = window.prompt(Locale.label("site.sectionEdit.convertToBlockPrompt"), Locale.label("site.sectionEdit.blockNamePromptDefault"));
    if (name !== null) {
      trackSave(ApiHelper.post(`/sections/duplicate/${props.section.id}?convertToBlock=${name.toString()}`, {}, "ContentApi")).then((data: any) => {
        props.updatedCallback(data);
      });
    }
  };

  const getAppearanceFields = (fields:string[]) => <StylesAnimations fields={fields} styles={parsedStyles} animations={parsedAnimations} onStylesChange={handleStyleChange} onAnimationsChange={handleAnimationChange} />;

  if (!section) return <></>;

  const formContent = (
    <>
      {ConfirmDialogElement}
      <FormCard
        id="sectionDetailsBox"
        title={Locale.label("site.section.editSection")}
        icon="school"
        stickyFooter={props.inPanel}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
        data-testid="edit-section-inputbox"
        headerActions={props.section.id && (<>
          <Button size="small" variant="outlined" onClick={handleConvertToBlock} title={Locale.label("site.sectionEdit.convertToBlock")} endIcon={<Icon>smart_button</Icon>} sx={{ marginRight: 2 }} data-testid="convert-to-block-button" aria-label={Locale.label("site.sectionEdit.convertToBlock")}>{Locale.label("site.sectionEdit.convertTo")}</Button>
          <Button size="small" variant="outlined" onClick={handleDuplicate} data-testid="duplicate-section-button" aria-label={Locale.label("site.sectionEdit.duplicateSection")}>{Locale.label("site.sectionEdit.duplicate")}</Button>
        </>)}
      >
        <div id="dialogFormContent">
          {sec.targetBlockId ? getBlockFields() : getStandardFields()}
        </div>
      </FormCard>
    </>
  );

  if (props.inPanel) return formContent;

  return (
    <Dialog open={true} onClose={handleCancel} fullWidth maxWidth="md">
      {formContent}
    </Dialog>
  );
}
