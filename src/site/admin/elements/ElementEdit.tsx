import { useState, useEffect, Suspense, lazy } from "react";
import type { SelectChangeEvent } from "@mui/material";
import type { AnimationsInterface, BlockInterface, ElementInterface, GlobalStyleInterface, InlineStylesInterface } from "../../../helpers";
import { Accordion, AccordionDetails, AccordionSummary, Autocomplete, Box, Button, FormControl, Icon, InputLabel, MenuItem, Select, TextField, Checkbox, FormGroup, FormControlLabel, Typography, Slider, Dialog } from "@mui/material";
import { ErrorMessages, ApiHelper, ArrayHelper, Locale } from "@churchapps/apphelper";
import { ElementTypes } from "@churchapps/helpers";
import { FormCard } from "../../../components/ui";
import { useConfirmDelete } from "../../../hooks";
import { GalleryModal } from "../../../components/gallery";
import React from "react";

const HtmlEditorLazy = lazy(() => import("@churchapps/apphelper/markdown").then((mod) => ({ default: mod.HtmlEditor })));

const HtmlEditor = (props: any) => (
  <Suspense fallback={<div>{Locale.label("site.elements.loadingEditor")}</div>}>
    <HtmlEditorLazy {...props} />
  </Suspense>
);
import { RowEdit } from "./RowEdit";
import { FormEdit } from "./FormEdit";
import { FaqEdit } from "./FaqEdit";
import { GalleryEdit } from "./GalleryEdit";
import { TestimonialEdit } from "./TestimonialEdit";
import { StatsEdit } from "./StatsEdit";
import { CalendarElementEdit } from "./CalendarElementEdit";
import { DonateLinkEdit } from "./DonateLinkEdit";
import { DonationEdit } from "./DonationEdit";
import { PickColors } from "./PickColors";
import { ColorPicker } from "../ColorPicker";
import { IconPicker } from "../../../components/iconPicker/IconPicker";
import { TableEdit } from "./TableEdit";
import { StyleList } from "./StyleList";
import { AnimationsEdit } from "./AnimationsEdit";
import { VisibilityToggles } from "./VisibilityToggles";
import { trackSave } from "../saveStatusTracker";

const standardAppearance = [
  "border", "background", "color", "font", "height", "line", "margin", "padding", "width"
];
const fullAppearance = [
  "border", "background", "color", "font", "height", "min", "max", "line", "margin", "padding", "text", "width"
];
const mediaAppearance = [
  "border", "background", "color", "font", "height", "min", "max", "line", "margin", "padding", "width"
];

const APPEARANCE_FIELDS: Record<string, string[]> = {
  row: standardAppearance,
  table: standardAppearance,
  box: fullAppearance,
  text: ["font", "color", "line", "margin", "padding", "text"],
  textWithPhoto: fullAppearance,
  card: fullAppearance,
  logo: [
    "border", "background", "height", "min", "max", "margin", "padding", "width"
  ],
  donation: standardAppearance,
  donateLink: ["border"],
  stream: mediaAppearance,
  buttonLink: mediaAppearance,
  video: mediaAppearance,
  form: standardAppearance,
  faq: standardAppearance,
  calendar: standardAppearance,
  image: ["border", "background", "color", "height", "margin", "padding", "width"],
  iconFeature: ["font", "color", "line", "margin", "padding", "text"],
  gallery: mediaAppearance,
  testimonial: fullAppearance,
  socialIcons: ["color", "margin", "padding", "text"],
  countdown: fullAppearance,
  stats: fullAppearance,
  sermons: standardAppearance,
  campaignProgress: fullAppearance,
  staffGrid: standardAppearance,
  serviceTimes: fullAppearance
};

type Props = {
  element: ElementInterface;
  globalStyles: GlobalStyleInterface;
  updatedCallback: (element: ElementInterface) => void;
  onRealtimeChange: (element: ElementInterface) => void;
  onCancel?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
  inPanel?: boolean;
};

export function ElementEdit(props: Props) {
  const { confirm, ConfirmDialogElement } = useConfirmDelete();
  const [blocks, setBlocks] = useState<BlockInterface[]>(null);
  const [groupLabelOptions, setGroupLabelOptions] = useState<string[]>([]);
  const [groupCategoryOptions, setGroupCategoryOptions] = useState<string[]>([]);
  const [selectPhotoField, setSelectPhotoField] = React.useState<string>(null);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [staffGroups, setStaffGroups] = useState<any[]>([]);
  const [element, setElement] = useState<ElementInterface>(null);
  const [errors, setErrors] = useState([]);
  const [innerErrors, setInnerErrors] = useState([]);
  // Hoisted null-safe view of element: the compiler merges optional member deps
  // (element?.answersJSON) into non-optional guard reads that crash while element is null.
  const el: ElementInterface = element || ({} as ElementInterface);
  const parsedData = el.answersJSON ? JSON.parse(el.answersJSON) : {};
  const parsedStyles = el.stylesJSON ? JSON.parse(el.stylesJSON) : {};
  const parsedAnimations = el.animationsJSON ? JSON.parse(el.animationsJSON) : {};
  const baselineRef = React.useRef<{ answersJSON?: string; stylesJSON?: string; animationsJSON?: string }>(null);
  const normalizedHtmlFieldsRef = React.useRef<Set<string>>(new Set());
  const dirtyRef = React.useRef(false);

  const reportDirty = (el: ElementInterface) => {
    const b = baselineRef.current;
    if (!b || !el) return;
    const dirty = (el.answersJSON || null) !== (b.answersJSON || null)
      || (el.stylesJSON || null) !== (b.stylesJSON || null)
      || (el.animationsJSON || null) !== (b.animationsJSON || null);
    if (dirty !== dirtyRef.current) {
      dirtyRef.current = dirty;
      props.onDirtyChange?.(dirty);
    }
  };

  useEffect(() => {
    reportDirty(element);
  }, [element?.answersJSON, element?.stylesJSON, element?.animationsJSON]);

  const handleCancel = () => {
    if (props.onCancel) props.onCancel();
    else props.updatedCallback(props.element);
  };
  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const p = { ...element };
    const val = e.target.value;
    switch (e.target.name) {
      case "elementType": p.elementType = val; break;
      case "answersJSON": p.answersJSON = val; break;
      default:
        parsedData[e.target.name] = val;
        p.answersJSON = JSON.stringify(parsedData);
        break;
    }
    setElement(p);
  };

  const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = { ...element };
    const val: any = e.target.checked.toString();
    switch (e.target.name) {
      case "elementType": p.elementType = val; break;
      case "answersJSON": p.answersJSON = val; break;
      default:
        parsedData[e.target.name] = val;
        p.answersJSON = JSON.stringify(parsedData);
        break;
    }
    setElement(p);
  };

  const handleHtmlChange = (field: string, newValue: string) => {
    try {
      // Lexical normalizes the stored HTML on mount and fires onChange with it;
      // rebase the dirty-tracking baseline so that first emission never reads as an edit.
      if (!normalizedHtmlFieldsRef.current.has(field)) {
        normalizedHtmlFieldsRef.current.add(field);
        if (baselineRef.current) {
          const baseAnswers = baselineRef.current.answersJSON ? JSON.parse(baselineRef.current.answersJSON) : {};
          baseAnswers[field] = newValue;
          baselineRef.current = { ...baselineRef.current, answersJSON: JSON.stringify(baseAnswers) };
        }
      }
      parsedData[field] = newValue;
      const p = { ...element };
      p.answers = parsedData;
      p.answersJSON = JSON.stringify(parsedData);
      if (p.answersJSON !== el.answersJSON) {
        setElement(p);
      }
    } catch (error) {
      console.error("ElementEdit handleHtmlChange error:", error);
    }
  };

  const handleStyleChange = (styles: InlineStylesInterface) => {
    const p = { ...element };
    p.styles = styles;
    p.stylesJSON = styles && Object.keys(styles).length > 0 ? JSON.stringify(styles) : null;

    setElement(p);
    props.onRealtimeChange(p);
  };

  const handleAnimationChange = (animations: AnimationsInterface) => {
    const p = { ...element };
    p.animations = animations;
    p.animationsJSON = animations && Object.keys(animations).length > 0 ? JSON.stringify(animations) : null;

    setElement(p);
    props.onRealtimeChange(p);
  };

  const handleSave = () => {
    if (innerErrors.length === 0) {
      trackSave(ApiHelper.post("/elements", [element], "ContentApi"))
        .then((response: any) => {
          const data = Array.isArray(response) ? response[0] : response;
          if (data.answersJSON) data.answers = JSON.parse(data.answersJSON);
          if (data.stylesJSON) data.styles = JSON.parse(data.stylesJSON);
          if (data.animationsJSON) data.animations = JSON.parse(data.animationsJSON);
          baselineRef.current = { answersJSON: data.answersJSON, stylesJSON: data.stylesJSON, animationsJSON: data.animationsJSON };
          if (dirtyRef.current) {
            dirtyRef.current = false;
            props.onDirtyChange?.(false);
          }
          setElement(data);
          props.updatedCallback(data);
        })
        .catch((error: any) => {
          console.error("ElementEdit API error:", error);
          setErrors([error?.message || Locale.label("common.error")]);
        });
    } else {
      setErrors(innerErrors);
    }
  };

  const getTextAlignment = (fieldName: string, label: string = Locale.label("site.elements.textAlignment")) => (
    <FormControl fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        fullWidth
        size="small"
        label={label}
        name={fieldName}
        value={parsedData[fieldName] || "left"}
        onChange={handleChange}
        data-testid={`text-alignment-${fieldName}-select`}
        aria-label={`Select ${label.toLowerCase()}`}>
        <MenuItem value="left" data-testid="text-align-left" aria-label={Locale.label("site.elements.alignLeft")}>
          {Locale.label("common.left")}
        </MenuItem>
        <MenuItem value="center" data-testid="text-align-center" aria-label={Locale.label("site.elements.alignCenter")}>
          {Locale.label("common.center")}
        </MenuItem>
        <MenuItem value="right" data-testid="text-align-right" aria-label={Locale.label("site.elements.alignRight")}>
          {Locale.label("common.right")}
        </MenuItem>
      </Select>
    </FormControl>
  );

  const handleDelete = async () => {
    if (await confirm(Locale.label("site.elements.confirmDelete"))) {
      trackSave(ApiHelper.delete("/elements/" + el.id.toString(), "ContentApi")).then(() => props.updatedCallback(null));
    }
  };

  const getJsonFields = () => (
    <TextField
      fullWidth
      size="small"
      label={Locale.label("site.elements.answersJSON")}
      name="answersJSON"
      value={el.answersJSON}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      multiline
      data-testid="answers-json-input"
      aria-label={Locale.label("site.elements.answersJSONData")}
    />
  );

  const selectColors = (background: string, textColor: string, headingColor: string, linkColor: string) => {
    const p = { ...element };
    parsedData["background"] = background;
    parsedData["textColor"] = textColor;
    parsedData["headingColor"] = headingColor;
    parsedData["linkColor"] = linkColor;
    p.answersJSON = JSON.stringify(parsedData);
    setElement(p);
  };

  const getRichTextEditor = (field: string) => (
    <Box
      sx={{
        mt: 2,
        "& .editor-container": {
          border: "1px solid var(--border-main)",
          borderRadius: 1,
          overflow: "hidden",
          backgroundColor: "#fff"
        },
        "& .toolbar": {
          p: 1,
          gap: 0.5,
          alignItems: "center"
        },
        "& .editor-inner": { minHeight: 260 },
        "& .editor-scroller": {
          minHeight: 180,
          maxHeight: 320,
          overflowY: "auto"
        },
        "& .editor-input": {
          minHeight: 180,
          padding: "12px"
        }
      }}
    >
      <HtmlEditor
        value={parsedData[field] || ""}
        onChange={(val: any) => {
          handleHtmlChange(field, val);
        }}
      />
    </Box>
  );

  const getBoxFields = () => (
    <>
      <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.rounded === "true" ? true : false} />} name="rounded" label={Locale.label("site.elements.roundedCorners")} />
      <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.translucent === "true" ? true : false} />} name="translucent" label={Locale.label("site.elements.translucent")} />
    </>
  );

  const getTextFields = () => (
    <>
      {getTextAlignment("textAlignment")}
      {getRichTextEditor("text")}
    </>
  );

  // TODO: add alt field while saving image and use it here, in image tage.
  const getTextWithPhotoFields = () => (
    <>
      {parsedData.photo && (
        <>
          <img src={parsedData.photo} style={{ maxHeight: 100, maxWidth: "100%", width: "auto" }} alt={Locale.label("site.elements.imageDescribingTopic")} />
          <br />
        </>
      )}
      <Button variant="contained" onClick={() => setSelectPhotoField("photo")} data-testid="select-photo-button" aria-label={Locale.label("site.elements.selectPhoto")}>
        {Locale.label("site.elements.selectPhoto")}
      </Button>
      <TextField
        fullWidth
        size="small"
        label={Locale.label("site.elements.photoLabel")}
        name="photoAlt"
        value={parsedData.photoAlt || ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        data-testid="photo-alt-input"
        aria-label={Locale.label("site.elements.photoAlternativeText")}
      />
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.elements.photoPosition")}</InputLabel>
        <Select
          fullWidth
          size="small"
          label={Locale.label("site.elements.photoPosition")}
          name="photoPosition"
          value={parsedData.photoPosition || ""}
          onChange={handleChange}
          data-testid="photo-position-select"
          aria-label={Locale.label("site.elements.selectPhotoPosition")}>
          <MenuItem value="left" data-testid="photo-position-left" aria-label={Locale.label("site.elements.positionPhotoLeft")}>
            {Locale.label("common.left")}
          </MenuItem>
          <MenuItem value="right" data-testid="photo-position-right" aria-label={Locale.label("site.elements.positionPhotoRight")}>
            {Locale.label("common.right")}
          </MenuItem>
          <MenuItem value="top" data-testid="photo-position-top" aria-label={Locale.label("site.elements.positionPhotoTop")}>
            {Locale.label("common.top")}
          </MenuItem>
          <MenuItem value="bottom" data-testid="photo-position-bottom" aria-label={Locale.label("site.elements.positionPhotoBottom")}>
            {Locale.label("common.bottom")}
          </MenuItem>
        </Select>
      </FormControl>
      {getTextAlignment("textAlignment")}
      {getRichTextEditor("text")}
    </>
  );

  // TODO: add alt field while saving image and use it here, in image tage.
  const getCardFields = () => (
    <>
      {parsedData.photo && (
        <>
          <img src={parsedData.photo} style={{ maxHeight: 100, maxWidth: "100%", width: "auto" }} alt={Locale.label("site.elements.imageDescribingTopic")} />
          <br />
        </>
      )}
      <Button variant="contained" onClick={() => setSelectPhotoField("photo")} data-testid="select-photo-button" aria-label={Locale.label("site.elements.selectPhoto")}>
        {Locale.label("site.elements.selectPhoto")}
      </Button>
      <TextField
        fullWidth
        size="small"
        label={Locale.label("site.elements.photoLabel")}
        name="photoAlt"
        value={parsedData.photoAlt || ""}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        data-testid="photo-alt-input"
        aria-label={Locale.label("site.elements.photoAlternativeText")}
      />
      <TextField fullWidth size="small" label={Locale.label("site.elements.linkUrlOptional")} name="url" value={parsedData.url || ""} onChange={handleChange} onKeyDown={handleKeyDown} placeholder={Locale.label("placeholders.page.linkUrl")} />
      {getTextAlignment("titleAlignment", Locale.label("site.elements.titleAlignment"))}
      <TextField fullWidth size="small" label={Locale.label("site.elements.title")} name="title" value={parsedData.title || ""} onChange={handleChange} onKeyDown={handleKeyDown} placeholder={Locale.label("placeholders.element.cardTitle")} />
      {getTextAlignment("textAlignment")}
      {getRichTextEditor("text")}
    </>
  );

  const getLogoFields = () => (
    <>
      <TextField fullWidth size="small" label={Locale.label("site.elements.linkUrlOptional")} name="url" value={parsedData.url || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
    </>
  );

  const getStreamFields = () => {
    let blockField = <></>;
    if (parsedData.offlineContent === "block") {
      const options: React.ReactElement[] = [];
      blocks?.forEach((b) => {
        options.push(<MenuItem value={b.id}>{b.name}</MenuItem>);
      });
      blockField = (
        <FormControl fullWidth>
          <InputLabel>{Locale.label("site.elements.block")}</InputLabel>
          <Select fullWidth size="small" label={Locale.label("site.elements.block")} name="targetBlockId" value={parsedData.targetBlockId || ""} onChange={handleChange}>
            {options}
          </Select>
        </FormControl>
      );
    }
    return (
      <>
        <FormControl fullWidth>
          <InputLabel>{Locale.label("site.elements.mode")}</InputLabel>
          <Select fullWidth size="small" label={Locale.label("site.elements.mode")} name="mode" value={parsedData.mode || "video"} onChange={handleChange}>
            <MenuItem value="video">{Locale.label("site.elements.videoOnly")}</MenuItem>
            <MenuItem value="interaction">{Locale.label("site.elements.videoAndInteraction")}</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth>
          <InputLabel>{Locale.label("site.elements.offlineContent")}</InputLabel>
          <Select fullWidth size="small" label={Locale.label("site.elements.offlineContent")} name="offlineContent" value={parsedData.offlineContent || "countdown"} onChange={handleChange}>
            <MenuItem value="countdown">{Locale.label("site.elements.nextServiceTime")}</MenuItem>
            <MenuItem value="hide">{Locale.label("site.elements.hide")}</MenuItem>
            <MenuItem value="block">{Locale.label("site.elements.block")}</MenuItem>
          </Select>
        </FormControl>
        {blockField}
      </>
    );
  };

  const getIframeFields = () => (
    <>
      <TextField fullWidth size="small" label={Locale.label("site.elements.source")} name="iframeSrc" value={parsedData.iframeSrc || ""} onChange={handleChange} placeholder={Locale.label("placeholders.page.linkUrl")} />
      <TextField
        fullWidth
        size="small"
        label={Locale.label("site.elements.heightPx")}
        name="iframeHeight"
        value={parsedData.iframeHeight || ""}
        placeholder={Locale.label("site.elements.heightPlaceholder")}
        onChange={handleChange}
      />
    </>
  );

  const getButtonLink = () => (
    <>
      <TextField fullWidth size="small" label={Locale.label("site.elements.text")} name="buttonLinkText" value={parsedData.buttonLinkText || ""} onChange={handleChange} placeholder={Locale.label("placeholders.element.buttonText")} />
      <TextField fullWidth size="small" label={Locale.label("site.elements.url")} name="buttonLinkUrl" value={parsedData.buttonLinkUrl || ""} onChange={handleChange} placeholder={Locale.label("placeholders.page.linkUrl")} />
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.elements.variant")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.elements.variant")} name="buttonLinkVariant" value={parsedData.buttonLinkVariant || "contained"} onChange={handleChange}>
          <MenuItem value="contained">{Locale.label("site.elements.contained")}</MenuItem>
          <MenuItem value="outlined">{Locale.label("site.elements.outlined")}</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.elements.color")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.elements.color")} name="buttonLinkColor" value={parsedData.buttonLinkColor || "primary"} onChange={handleChange}>
          <MenuItem value="primary">{Locale.label("site.elements.primary")}</MenuItem>
          <MenuItem value="secondary">{Locale.label("site.elements.secondary")}</MenuItem>
          <MenuItem value="error">{Locale.label("site.elements.error")}</MenuItem>
          <MenuItem value="warning">{Locale.label("site.elements.warning")}</MenuItem>
          <MenuItem value="info">{Locale.label("site.elements.info")}</MenuItem>
          <MenuItem value="success">{Locale.label("site.elements.success")}</MenuItem>
        </Select>
      </FormControl>
      <FormGroup sx={{ marginLeft: 1, marginY: 2 }}>
        <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.external === "true" ? true : false} />} name="external" label={Locale.label("site.elements.openInNewTab")} />
        <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.fullWidth === "true" ? true : false} />} name="fullWidth" label={Locale.label("site.elements.fullWidth")} />
      </FormGroup>
    </>
  );

  const getVideoFields = () => (
    <>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.elements.type")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.elements.type")} name="videoType" onChange={handleChange} value={parsedData.videoType || "youtube"}>
          <MenuItem value="youtube">{Locale.label("site.elements.youtube")}</MenuItem>
          <MenuItem value="vimeo">{Locale.label("site.elements.vimeo")}</MenuItem>
        </Select>
      </FormControl>
      <TextField fullWidth size="small" label={Locale.label("site.elements.id")} name="videoId" value={parsedData.videoId || ""} onChange={handleChange} placeholder={Locale.label("placeholders.element.videoId")} />
      {(!parsedData.videoType || parsedData.videoType === "youtube") && (
        <Typography fontSize="12px" fontStyle="italic">
          {Locale.label("site.elements.videoUrlYoutube")} <br /> {Locale.label("site.elements.idExample")}
        </Typography>
      )}
      {parsedData.videoType === "vimeo" && (
        <Typography fontSize="12px" fontStyle="italic">
          {Locale.label("site.elements.videoUrlVimeo")} <br /> {Locale.label("site.elements.idExampleVimeo")}
        </Typography>
      )}
    </>
  );

  const getRawHTML = () => (
    <>
      <TextField fullWidth label={Locale.label("site.elements.htmlContent")} name="rawHTML" onChange={handleChange} value={parsedData.rawHTML || ""} multiline minRows={7} maxRows={15} />
      <TextField
        fullWidth
        label={Locale.label("site.elements.javascriptExcludeTag")}
        name="javascript"
        onChange={handleChange}
        value={parsedData.javascript || ""}
        multiline
        minRows={7}
        maxRows={15}
      />
    </>
  );

  const getMapFields = () => (
    <>
      <TextField
        fullWidth
        size="small"
        label={Locale.label("site.elements.address")}
        name="mapAddress"
        onChange={handleChange}
        value={parsedData.mapAddress || ""}
        helperText={Locale.label("site.elements.addressHelper")}
      />
      <TextField
        fullWidth
        size="small"
        label={Locale.label("site.elements.label")}
        name="mapLabel"
        onChange={handleChange}
        value={parsedData.mapLabel || ""}
        helperText={Locale.label("site.elements.nameHelper")}
      />
      <Typography fontSize="13px" sx={{ marginTop: 1 }}>
        {Locale.label("site.elements.zoomLevel")}
      </Typography>
      <Slider defaultValue={15} valueLabelDisplay="auto" step={1} min={8} max={20} name="mapZoom" value={parsedData?.mapZoom || 15} onChange={(e: any) => handleChange(e)} />
      <Typography fontSize="12px" fontStyle="italic">
        {Locale.label("site.elements.zoomLevelExample")}
      </Typography>
    </>
  );

  const getGroupListFields = () => (
    <>
      <TextField
        fullWidth
        size="small"
        label={Locale.label("site.elements.label")}
        name="label"
        onChange={handleChange}
        value={parsedData.label || ""}
        helperText={Locale.label("site.elements.categoriesHelper")}
      />
    </>
  );

  const getGroupsFields = () => {
    const setNamedValue = (name: string, value: string) => {
      handleChange({ target: { name, value } } as unknown as SelectChangeEvent);
    };
    return (
      <>
        <TextField
          fullWidth
          size="small"
          label="Heading (optional)"
          name="title"
          onChange={handleChange}
          value={parsedData.title || ""}
          helperText="Shown above the filter row, e.g. 'Find a Group'."
        />
        <Autocomplete
          freeSolo
          size="small"
          sx={{ marginTop: 2 }}
          options={groupCategoryOptions}
          value={parsedData.category || ""}
          onChange={(_e, val) => setNamedValue("category", val || "")}
          onInputChange={(_e, val) => setNamedValue("category", val || "")}
          renderInput={(params) => (
            <TextField {...params} label="Pre-filter category (optional)" helperText="Restrict to a single category. Hides the category dropdown when set." />
          )}
        />
        <FormControl fullWidth size="small" sx={{ marginTop: 2 }}>
          <InputLabel>Pre-filter label (optional)</InputLabel>
          <Select
            label="Pre-filter label (optional)"
            name="label"
            value={parsedData.label || ""}
            onChange={handleChange}>
            <MenuItem value="">Any label</MenuItem>
            {groupLabelOptions.map((l) => (
              <MenuItem key={l} value={l}>{l}</MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" sx={{ marginTop: 2 }}>
          <InputLabel>Show search box</InputLabel>
          <Select label="Show search box" name="showSearch" value={parsedData.showSearch === false || parsedData.showSearch === "false" ? "false" : "true"} onChange={handleChange}>
            <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
            <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
          </Select>
        </FormControl>
        <FormControl fullWidth size="small" sx={{ marginTop: 2 }}>
          <InputLabel>Show category dropdown</InputLabel>
          <Select label="Show category dropdown" name="showCategory" value={parsedData.showCategory === false || parsedData.showCategory === "false" ? "false" : "true"} onChange={handleChange}>
            <MenuItem value="true">{Locale.label("common.yes")}</MenuItem>
            <MenuItem value="false">{Locale.label("common.no")}</MenuItem>
          </Select>
        </FormControl>
      </>
    );
  };

  const getCarouselFields = () => (
    <>
      <TextField fullWidth size="small" type="number" label={Locale.label("site.elements.heightPx")} name="height" onChange={handleChange} value={parsedData.height || "250"} />
      <TextField fullWidth size="small" type="number" label={Locale.label("site.elements.slides")} name="slides" onChange={handleChange} value={parsedData.slides || ""} />
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.elements.animationOptions")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.elements.animationOptions")} name="animationOptions" onChange={handleChange} value={parsedData.animationOptions || "fade"}>
          <MenuItem value="fade">{Locale.label("site.elements.fade")}</MenuItem>
          <MenuItem value="slide">{Locale.label("site.elements.slide")}</MenuItem>
        </Select>
      </FormControl>
      <FormGroup>
        <FormControlLabel
          control={<Checkbox size="small" onChange={handleCheck} checked={parsedData.autoplay === "true" ? true : false} />}
          name="autoplay"
          label={Locale.label("site.elements.autoplay")}
        />
      </FormGroup>
      {parsedData.autoplay === "true" && (
        <TextField fullWidth size="small" type="number" label={Locale.label("site.elements.slidesIntervalSeconds")} name="interval" onChange={handleChange} value={parsedData.interval || "4"} />
      )}
    </>
  );

  const getImageFields = () => (
    <>
      {parsedData.photo && (
        <>
          <img src={parsedData.photo} style={{ maxHeight: 100, maxWidth: "100%", width: "auto" }} alt={Locale.label("site.elements.imageDescribingTopic")} />
          <br />
        </>
      )}
      <Button variant="contained" onClick={() => setSelectPhotoField("photo")} data-testid="select-photo-button" aria-label={Locale.label("site.elements.selectPhoto")}>
        {Locale.label("site.elements.selectPhoto")}
      </Button>
      <TextField fullWidth size="small" label={Locale.label("site.elements.photoLabel")} name="photoAlt" value={parsedData.photoAlt || ""} onChange={handleChange} onKeyDown={handleKeyDown} placeholder={Locale.label("placeholders.element.imageDescription")} />
      <TextField fullWidth size="small" label={Locale.label("site.elements.linkUrlOptional")} name="url" value={parsedData.url || ""} onChange={handleChange} onKeyDown={handleKeyDown} placeholder={Locale.label("placeholders.page.linkUrl")} />
      <FormGroup sx={{ marginLeft: 0.5 }}>
        <FormControlLabel
          control={<Checkbox size="small" onChange={handleCheck} checked={parsedData.external === "true" ? true : false} />}
          name="external"
          label={Locale.label("site.elements.openLinkInNewTab")}
        />
        <FormControlLabel
          control={<Checkbox size="small" onChange={handleCheck} checked={parsedData.noResize === "true" ? true : false} />}
          name="noResize"
          label={Locale.label("site.elements.doNotResizeImage")}
        />
        <FormControlLabel
          control={<Checkbox size="small" onChange={handleCheck} checked={parsedData.enableLightbox === "true" ? true : false} disabled={!!parsedData.url} />}
          name="enableLightbox"
          label={Locale.label("site.elementEdit.enableLightbox")}
        />
      </FormGroup>
      <FormControl fullWidth sx={{ marginTop: 2 }}>
        <InputLabel>{Locale.label("site.elements.imageAlignment")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.elements.imageAlignment")} name="imageAlign" value={parsedData.imageAlign || "left"} onChange={handleChange}>
          <MenuItem value="left">{Locale.label("common.left")}</MenuItem>
          <MenuItem value="center">{Locale.label("common.center")}</MenuItem>
          <MenuItem value="right">{Locale.label("common.right")}</MenuItem>
        </Select>
      </FormControl>
    </>
  );

  const getWhiteSpaceFields = () => (
    <>
      <TextField fullWidth size="small" type="number" label={Locale.label("site.elements.heightPx")} name="height" onChange={handleChange} value={parsedData.height || "25"} />
    </>
  );

  const getIconFeatureFields = () => {
    const defaultIconColor = "#03a9f4";
    return (
      <>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Icon sx={{ fontSize: 40, color: parsedData.iconColor || defaultIconColor }}>{parsedData.icon || "volunteer_activism"}</Icon>
          <Button variant="outlined" size="small" onClick={() => setShowIconPicker(true)} data-testid="icon-feature-choose-icon">{Locale.label("site.iconFeatureEdit.chooseIcon")}</Button>
        </div>
        <TextField fullWidth size="small" label={Locale.label("site.iconFeatureEdit.title")} name="title" value={parsedData.title || ""} onChange={handleChange} onKeyDown={handleKeyDown} data-testid="icon-feature-title-input" />
        {getRichTextEditor("description")}
        <div>
          <InputLabel>{Locale.label("site.iconFeatureEdit.iconColor")}</InputLabel>
          <ColorPicker color={parsedData?.iconColor || defaultIconColor} updatedCallback={(c) => handleHtmlChange("iconColor", c)} globalStyles={props.globalStyles} />
        </div>
        <FormControl fullWidth>
          <InputLabel>{Locale.label("site.iconFeatureEdit.iconSize")}</InputLabel>
          <Select fullWidth size="small" label={Locale.label("site.iconFeatureEdit.iconSize")} name="iconSize" value={parsedData.iconSize || "medium"} onChange={handleChange} data-testid="icon-feature-size-select">
            <MenuItem value="small">{Locale.label("site.iconFeatureEdit.small")}</MenuItem>
            <MenuItem value="medium">{Locale.label("site.iconFeatureEdit.medium")}</MenuItem>
            <MenuItem value="large">{Locale.label("site.iconFeatureEdit.large")}</MenuItem>
          </Select>
        </FormControl>
        {getTextAlignment("textAlignment")}
      </>
    );
  };

  const getSocialIconsFields = () => (
    <>
      {["facebook", "instagram", "youtube", "x", "tiktok", "vimeo"].map((network) => (
        <TextField key={network} fullWidth size="small" label={Locale.label("site.socialIconsEdit." + network)} name={network} value={parsedData[network] || ""} onChange={handleChange} onKeyDown={handleKeyDown} placeholder={Locale.label("placeholders.page.linkUrl")} data-testid={`social-${network}-input`} />
      ))}
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.socialIconsEdit.iconStyle")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.socialIconsEdit.iconStyle")} name="iconStyle" value={parsedData.iconStyle || "filled"} onChange={handleChange}>
          <MenuItem value="filled">{Locale.label("site.socialIconsEdit.filled")}</MenuItem>
          <MenuItem value="outlined">{Locale.label("site.socialIconsEdit.outlined")}</MenuItem>
        </Select>
      </FormControl>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.socialIconsEdit.size")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.socialIconsEdit.size")} name="size" value={parsedData.size || "medium"} onChange={handleChange}>
          <MenuItem value="small">{Locale.label("site.socialIconsEdit.small")}</MenuItem>
          <MenuItem value="medium">{Locale.label("site.socialIconsEdit.medium")}</MenuItem>
          <MenuItem value="large">{Locale.label("site.socialIconsEdit.large")}</MenuItem>
        </Select>
      </FormControl>
      {getTextAlignment("alignment", Locale.label("site.socialIconsEdit.alignment"))}
      <div>
        <InputLabel>{Locale.label("site.socialIconsEdit.color")}</InputLabel>
        <ColorPicker color={parsedData?.color || "#444444"} updatedCallback={(c) => handleHtmlChange("color", c)} globalStyles={props.globalStyles} />
      </div>
    </>
  );

  const getCountdownFields = () => (
    <>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.countdownEdit.mode")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.countdownEdit.mode")} name="mode" value={parsedData.mode || "weekly"} onChange={handleChange} data-testid="countdown-mode-select">
          <MenuItem value="weekly">{Locale.label("site.countdownEdit.weekly")}</MenuItem>
          <MenuItem value="date">{Locale.label("site.countdownEdit.date")}</MenuItem>
        </Select>
      </FormControl>
      {parsedData.mode === "date" && (
        <TextField fullWidth size="small" type="datetime-local" label={Locale.label("site.countdownEdit.targetDate")} name="targetDate" value={parsedData.targetDate || ""} onChange={handleChange} InputLabelProps={{ shrink: true }} data-testid="countdown-target-date-input" />
      )}
      {(!parsedData.mode || parsedData.mode === "weekly") && (
        <>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("site.countdownEdit.dayOfWeek")}</InputLabel>
            <Select fullWidth size="small" label={Locale.label("site.countdownEdit.dayOfWeek")} name="dayOfWeek" value={(parsedData.dayOfWeek ?? 0).toString()} onChange={handleChange} data-testid="countdown-day-select">
              <MenuItem value="0">{Locale.label("tasks.conditionDate.sun")}</MenuItem>
              <MenuItem value="1">{Locale.label("tasks.conditionDate.mon")}</MenuItem>
              <MenuItem value="2">{Locale.label("tasks.conditionDate.tues")}</MenuItem>
              <MenuItem value="3">{Locale.label("tasks.conditionDate.wed")}</MenuItem>
              <MenuItem value="4">{Locale.label("tasks.conditionDate.thurs")}</MenuItem>
              <MenuItem value="5">{Locale.label("tasks.conditionDate.fri")}</MenuItem>
              <MenuItem value="6">{Locale.label("tasks.conditionDate.sat")}</MenuItem>
            </Select>
          </FormControl>
          <TextField fullWidth size="small" type="time" label={Locale.label("site.countdownEdit.time")} name="time" value={parsedData.time || "10:00"} onChange={handleChange} InputLabelProps={{ shrink: true }} />
        </>
      )}
      <TextField fullWidth size="small" label={Locale.label("site.countdownEdit.title")} name="title" value={parsedData.title || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
      <TextField fullWidth size="small" label={Locale.label("site.countdownEdit.completedText")} name="completedText" value={parsedData.completedText || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
      <FormGroup>
        <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.showDays !== "false" && parsedData.showDays !== false} />} name="showDays" label={Locale.label("site.countdownEdit.showDays")} />
        <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.showHours !== "false" && parsedData.showHours !== false} />} name="showHours" label={Locale.label("site.countdownEdit.showHours")} />
      </FormGroup>
    </>
  );

  const getSermonsFields = () => (
    <>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.sermonsEdit.layout")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.sermonsEdit.layout")} name="layout" value={parsedData.layout || "browse"} onChange={handleChange} data-testid="sermons-layout-select">
          <MenuItem value="browse">{Locale.label("site.sermonsEdit.browse")}</MenuItem>
          <MenuItem value="grid">{Locale.label("site.sermonsEdit.grid")}</MenuItem>
          <MenuItem value="list">{Locale.label("site.sermonsEdit.list")}</MenuItem>
          <MenuItem value="featuredLatest">{Locale.label("site.sermonsEdit.featuredLatest")}</MenuItem>
        </Select>
      </FormControl>
      {parsedData.layout && parsedData.layout !== "browse" && (
        <>
          <FormControl fullWidth>
            <InputLabel>{Locale.label("site.sermonsEdit.playlist")}</InputLabel>
            <Select fullWidth size="small" label={Locale.label("site.sermonsEdit.playlist")} name="playlistId" value={parsedData.playlistId || ""} onChange={handleChange} data-testid="sermons-playlist-select">
              <MenuItem value="">{Locale.label("site.sermonsEdit.allPlaylists")}</MenuItem>
              {playlists.map((p) => (<MenuItem key={p.id} value={p.id}>{p.title}</MenuItem>))}
            </Select>
          </FormControl>
          {parsedData.layout !== "featuredLatest" && (
            <TextField fullWidth size="small" type="number" label={Locale.label("site.sermonsEdit.itemCount")} name="itemCount" value={parsedData.itemCount ?? 6} onChange={handleChange} />
          )}
          <FormGroup>
            <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.showTitles !== "false" && parsedData.showTitles !== false} />} name="showTitles" label={Locale.label("site.sermonsEdit.showTitles")} />
            <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.showDates !== "false" && parsedData.showDates !== false} />} name="showDates" label={Locale.label("site.sermonsEdit.showDates")} />
          </FormGroup>
        </>
      )}
    </>
  );

  const getCampaignProgressFields = () => (
    <>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.campaignProgressEdit.fund")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.campaignProgressEdit.fund")} name="fundId" value={parsedData.fundId || ""} onChange={handleChange} data-testid="campaign-fund-select">
          <MenuItem value="">{Locale.label("site.campaignProgressEdit.selectFund")}</MenuItem>
          {funds.map((f) => (<MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>))}
        </Select>
      </FormControl>
      <TextField fullWidth size="small" type="number" label={Locale.label("site.campaignProgressEdit.goalAmount")} name="goalAmount" value={parsedData.goalAmount ?? ""} onChange={handleChange} onKeyDown={handleKeyDown} data-testid="campaign-goal-input" />
      <TextField fullWidth size="small" label={Locale.label("site.campaignProgressEdit.title")} name="title" value={parsedData.title || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
      <TextField fullWidth size="small" type="date" label={Locale.label("site.campaignProgressEdit.startDate")} name="startDate" value={parsedData.startDate || ""} onChange={handleChange} InputLabelProps={{ shrink: true }} data-testid="campaign-start-date-input" />
      <TextField fullWidth size="small" type="date" label={Locale.label("site.campaignProgressEdit.endDate")} name="endDate" value={parsedData.endDate || ""} onChange={handleChange} InputLabelProps={{ shrink: true }} data-testid="campaign-end-date-input" />
      <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.showAmounts !== "false" && parsedData.showAmounts !== false} />} name="showAmounts" label={Locale.label("site.campaignProgressEdit.showAmounts")} />
      <TextField fullWidth size="small" label={Locale.label("site.campaignProgressEdit.donateUrl")} name="donateUrl" value={parsedData.donateUrl || ""} onChange={handleChange} onKeyDown={handleKeyDown} placeholder={Locale.label("placeholders.page.linkUrl")} />
    </>
  );

  const getStaffGridFields = () => (
    <>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.staffGridEdit.group")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.staffGridEdit.group")} name="groupId" value={parsedData.groupId || ""} onChange={handleChange} data-testid="staff-grid-group-select">
          <MenuItem value="">{Locale.label("site.staffGridEdit.selectGroup")}</MenuItem>
          {staffGroups.map((g) => (<MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>))}
        </Select>
      </FormControl>
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>{Locale.label("site.staffGridEdit.rosterHint")}</Typography>
      <FormControl fullWidth>
        <InputLabel>{Locale.label("site.staffGridEdit.columns")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.staffGridEdit.columns")} name="columns" value={(parsedData.columns ?? 3).toString()} onChange={handleChange} data-testid="staff-grid-columns-select">
          <MenuItem value="2">2</MenuItem>
          <MenuItem value="3">3</MenuItem>
          <MenuItem value="4">4</MenuItem>
        </Select>
      </FormControl>
      <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.showRoles !== "false" && parsedData.showRoles !== false} />} name="showRoles" label={Locale.label("site.staffGridEdit.showRoles")} />
    </>
  );

  const getServiceTimesFields = () => (
    <>
      <TextField fullWidth size="small" label={Locale.label("site.serviceTimesEdit.title")} name="title" value={parsedData.title ?? ""} onChange={handleChange} onKeyDown={handleKeyDown} data-testid="service-times-title-input" />
      <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.showCampus !== "false" && parsedData.showCampus !== false} />} name="showCampus" label={Locale.label("site.serviceTimesEdit.showCampus")} />
    </>
  );

  const getFields = () => {
    let result = getJsonFields();
    switch (element?.elementType) {
      case "row":
        result = <RowEdit parsedData={parsedData} onRealtimeChange={handleRowChange} setErrors={setInnerErrors} />;
        break;
      case "table":
        result = <TableEdit parsedData={parsedData} onRealtimeChange={handleRowChange} />;
        break;
      case "box": result = getBoxFields(); break;
      case "text": result = getTextFields(); break;
      case "textWithPhoto": result = getTextWithPhotoFields(); break;
      case "card": result = getCardFields(); break;
      case "logo": result = getLogoFields(); break;
      case "donation":
        result = <DonationEdit parsedData={parsedData} onRealtimeChange={handleRowChange} />;
        break;
      case "donateLink":
        result = <DonateLinkEdit parsedData={parsedData} onRealtimeChange={handleRowChange} />;
        break;
      case "stream": result = getStreamFields(); break;
      case "iframe": result = getIframeFields(); break;
      case "buttonLink": result = getButtonLink(); break;
      case "video": result = getVideoFields(); break;
      case "rawHTML": result = getRawHTML(); break;
      case "form":
        result = <FormEdit parsedData={parsedData} handleChange={handleChange} />;
        break;
      case "faq":
        result = <FaqEdit parsedData={parsedData} handleChange={handleChange} handleHtmlChange={handleHtmlChange} />;
        break;
      case "map": result = getMapFields(); break;
      case "sermons": result = getSermonsFields(); break;
      case "iconFeature": result = getIconFeatureFields(); break;
      case "socialIcons": result = getSocialIconsFields(); break;
      case "countdown": result = getCountdownFields(); break;
      case "gallery":
        result = <GalleryEdit parsedData={parsedData} handleChange={handleChange} handleHtmlChange={handleHtmlChange} />;
        break;
      case "testimonial":
        result = <TestimonialEdit parsedData={parsedData} handleChange={handleChange} handleHtmlChange={handleHtmlChange} />;
        break;
      case "stats":
        result = <StatsEdit parsedData={parsedData} handleChange={handleChange} handleHtmlChange={handleHtmlChange} />;
        break;
      case "carousel": result = getCarouselFields(); break;
      case "image": result = getImageFields(); break;
      case "whiteSpace": result = getWhiteSpaceFields(); break;
      case "calendar":
        result = <CalendarElementEdit parsedData={parsedData} handleChange={handleChange} />;
        break;
      case "groupList": result = getGroupListFields(); break;
      case "groups": result = getGroupsFields(); break;
      case "campaignProgress": result = getCampaignProgressFields(); break;
      case "staffGrid": result = getStaffGridFields(); break;
      case "serviceTimes": result = getServiceTimesFields(); break;
    }
    return result;
  };

  const handlePhotoSelected = (image: string) => {
    const p = { ...element };
    parsedData[selectPhotoField] = image;
    p.answersJSON = JSON.stringify(parsedData);
    setElement(p);
    setSelectPhotoField(null);
  };

  const handleRowChange = (parsedData: any) => {
    const e = { ...element };
    e.answersJSON = JSON.stringify(parsedData);
    if (element?.elementType === "row" && typeof parsedData.columns === "string") {
      const sizes: number[] = parsedData.columns.split(",").map((s: string) => parseInt(s, 10)).filter((n: number) => !isNaN(n));
      const existing = el.elements || [];
      e.elements = sizes.map((size, idx) => {
        const src = existing[idx];
        if (src) {
          const srcAnswers = src.answers || (src.answersJSON ? JSON.parse(src.answersJSON) : {});
          const newAnswers = { ...srcAnswers, size };
          return { ...src, answers: newAnswers, answersJSON: JSON.stringify(newAnswers), sort: idx + 1 };
        }
        const newAnswers = { size };
        return {
          id: `__preview_col_${idx}`,
          elementType: "column",
          parentId: el.id,
          sectionId: el.sectionId,
          blockId: el.blockId,
          sort: idx + 1,
          answers: newAnswers,
          answersJSON: JSON.stringify(newAnswers),
          elements: []
        } as ElementInterface;
      });
    }

    setElement(e);
    props.onRealtimeChange(e);
  };

  useEffect(() => {
    const el = { ...props.element };
    // Seed new elements with their canonical defaults so saved data is explicit
    // (renderer fallbacks don't always match the editor's displayed defaults).
    if (!el.id && !el.answersJSON && el.elementType) {
      const defaults = ElementTypes[el.elementType]?.defaults;
      if (defaults && Object.keys(defaults).length > 0) el.answersJSON = JSON.stringify(defaults);
    }
    baselineRef.current = { answersJSON: el.answersJSON, stylesJSON: el.stylesJSON, animationsJSON: el.animationsJSON };
    normalizedHtmlFieldsRef.current = new Set();
    if (dirtyRef.current) {
      dirtyRef.current = false;
      props.onDirtyChange?.(false);
    }
    setElement(el);
  }, [props.element]);

  useEffect(() => {
    const loadBlocks = async () => {
      if (blocks === null) {
        if (props.element.elementType === "block" || (props.element.elementType === "stream" && parsedData?.offlineContent === "block")) {
          const result: BlockInterface[] = await ApiHelper.get("/blocks", "ContentApi");
          setBlocks(ArrayHelper.getAll(result, "blockType", "elementBlock"));
        }
      }
    };

    loadBlocks();
  }, [element]);

  // Auto-save elements that have no settings to edit
  useEffect(() => {
    const elementHasNoSettings = (_elementType: string): boolean => false;
    if (element && !el.id && elementHasNoSettings(el.elementType)) {
      handleSave();
    }
  }, [element]);

  useEffect(() => {
    if (element?.elementType !== "sermons" || playlists.length) return;
    ApiHelper.get("/playlists", "ContentApi").then((data: any) => { if (Array.isArray(data)) setPlaylists(data); });
  }, [element?.elementType]);

  useEffect(() => {
    if (element?.elementType !== "campaignProgress" || funds.length) return;
    ApiHelper.get("/funds", "GivingApi").then((data: any) => { if (Array.isArray(data)) setFunds(data); });
  }, [element?.elementType]);

  useEffect(() => {
    if (element?.elementType !== "staffGrid" || staffGroups.length) return;
    ApiHelper.get("/groups", "MembershipApi").then((data: any) => { if (Array.isArray(data)) setStaffGroups(data); });
  }, [element?.elementType]);

  // Load existing labels + categories so the Groups element's pre-filter
  // pickers offer real choices instead of free-text "what label is valid?".
  useEffect(() => {
    if (element?.elementType !== "groups") return;
    if (groupLabelOptions.length || groupCategoryOptions.length) return;
    ApiHelper.get("/groups", "MembershipApi").then((groups: any[]) => {
      if (!Array.isArray(groups)) return;
      const labels = new Set<string>();
      const cats = new Set<string>();
      groups.forEach((g) => {
        (g.labelArray || []).forEach((l: string) => { if (l && l.trim()) labels.add(l.trim()); });
        if (g.categoryName && g.categoryName.trim()) cats.add(g.categoryName.trim());
      });
      setGroupLabelOptions([...labels].sort());
      setGroupCategoryOptions([...cats].sort());
    });
  }, [element?.elementType]);

  const groupSummarySx = { "& .MuiAccordionSummary-content": { my: 1 } };
  const groupTitleSx = { fontWeight: 600, fontSize: "0.9rem" };

  const getStandardFields = () => {
    const appearanceFields = APPEARANCE_FIELDS[element?.elementType];
    return (
      <>
        <ErrorMessages errors={errors} />
        {appearanceFields && <VisibilityToggles styles={parsedStyles} onChange={handleStyleChange} />}
        <Accordion defaultExpanded disableGutters data-testid="element-group-content" sx={{ boxShadow: "none", border: "1px solid var(--border-light)" }}>
          <AccordionSummary expandIcon={<Icon>expand_more</Icon>} sx={groupSummarySx}>
            <Typography sx={groupTitleSx}>{Locale.label("site.elementEdit.groupContent")}</Typography>
          </AccordionSummary>
          <AccordionDetails sx={{ "& > *:not(:last-child)": { mb: 2 } }}>{getFields()}</AccordionDetails>
        </Accordion>
        {appearanceFields && (
          <>
            <Accordion disableGutters data-testid="element-group-style" sx={{ boxShadow: "none", border: "1px solid var(--border-light)" }}>
              <AccordionSummary expandIcon={<Icon>expand_more</Icon>} sx={groupSummarySx}>
                <Typography sx={groupTitleSx}>{Locale.label("site.elementEdit.groupStyle")}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {element?.elementType === "box" && (
                  <PickColors
                    background={parsedData?.background}
                    backgroundOpacity={parsedData?.backgroundOpacity}
                    overlayColor={parsedData?.overlayColor}
                    focalPoint={parsedData?.focalPoint}
                    textColor={parsedData?.textColor}
                    headingColor={parsedData?.headingColor || parsedData?.textColor}
                    linkColor={parsedData?.linkColor}
                    updatedCallback={selectColors}
                    globalStyles={props.globalStyles}
                    onChange={handleChange}
                  />
                )}
                <StyleList fields={appearanceFields} styles={parsedStyles} onChange={handleStyleChange} />
              </AccordionDetails>
            </Accordion>
            <Accordion disableGutters data-testid="element-group-animation" sx={{ boxShadow: "none", border: "1px solid var(--border-light)" }}>
              <AccordionSummary expandIcon={<Icon>expand_more</Icon>} sx={groupSummarySx}>
                <Typography sx={groupTitleSx}>{Locale.label("site.elementEdit.groupAnimation")}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <AnimationsEdit animations={parsedAnimations} onSave={(a) => { if (a !== null) handleAnimationChange(a); }} />
              </AccordionDetails>
            </Accordion>
          </>
        )}
      </>
    );
  };

  const getBlockFields = () => {
    const options: React.ReactElement[] = [];
    blocks?.forEach((b) => {
      options.push(<MenuItem value={b.id}>{b.name}</MenuItem>);
    });
    return (
      <>
        <FormControl fullWidth>
          <InputLabel>{Locale.label("site.elements.block")}</InputLabel>
          <Select fullWidth label={Locale.label("site.elements.block")} name="targetBlockId" value={parsedData.targetBlockId || ""} onChange={handleChange}>
            {options}
          </Select>
        </FormControl>
      </>
    );
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (await confirm(Locale.label("site.elements.confirmDuplicate"), { destructive: false, confirmLabel: Locale.label("common.confirm", "Confirm") })) {
      trackSave(ApiHelper.post("/elements/duplicate/" + props.element.id, {}, "ContentApi")).then((data: any) => {
        props.updatedCallback(data);
      });
    }
  };

  if (!element) return <></>;

  const formContent = (
    <>
      {ConfirmDialogElement}
      <FormCard
        id="dialogForm"
        title={Locale.label("site.elements.editElement")}
        icon="school"
        stickyFooter={props.inPanel}
        onSave={handleSave}
        onCancel={handleCancel}
        onDelete={handleDelete}
        headerActions={
          props.element.id && (
            <a href="about:blank" onClick={handleDuplicate}>
              {Locale.label("common.duplicate")}
            </a>
          )
        }
        data-testid="edit-element-inputbox">
        <div id="dialogFormContent">{element?.elementType === "block" ? getBlockFields() : getStandardFields()}</div>
      </FormCard>
      {selectPhotoField && <GalleryModal onClose={() => setSelectPhotoField(null)} onSelect={handlePhotoSelected} aspectRatio={0} />}
      {showIconPicker && <IconPicker currentIcon={parsedData.icon || "volunteer_activism"} onUpdate={(icon) => handleHtmlChange("icon", icon)} onClose={() => setShowIconPicker(false)} />}
    </>
  );

  if (props.inPanel) return formContent;

  return (
    <Dialog open={true} onClose={handleCancel} fullWidth maxWidth="md" id="elementEditDialog">
      {formContent}
    </Dialog>
  );
}
