import { useState, useEffect, Suspense, lazy } from "react";
import type { SelectChangeEvent } from "@mui/material";
import type { AnimationsInterface, BlockInterface, ElementInterface, GlobalStyleInterface, InlineStylesInterface } from "../../../helpers";
import { Box, Button, FormControl, InputLabel, MenuItem, Select, TextField, Checkbox, FormGroup, FormControlLabel, Typography, Slider, Dialog } from "@mui/material";
import { ErrorMessages, InputBox, ApiHelper, ArrayHelper, GalleryModal, Locale } from "@churchapps/apphelper";
import React from "react";

const HtmlEditorLazy = lazy(() => import("@churchapps/apphelper-markdown").then((mod) => ({ default: mod.HtmlEditor })));

const HtmlEditor = (props: any) => (
  <Suspense fallback={<div>{Locale.label("site.elements.loadingEditor")}</div>}>
    <HtmlEditorLazy {...props} />
  </Suspense>
);
import { RowEdit } from "./RowEdit";
import { FormEdit } from "./FormEdit";
import { FaqEdit } from "./FaqEdit";
import { CalendarElementEdit } from "./CalendarElementEdit";
import { DonateLinkEdit } from "./DonateLinkEdit";
import { PickColors } from "./PickColors";
import { TableEdit } from "./TableEdit";
import { StylesAnimations } from "./StylesAnimations";

type Props = {
  element: ElementInterface;
  globalStyles: GlobalStyleInterface;
  updatedCallback: (element: ElementInterface) => void;
  onRealtimeChange: (element: ElementInterface) => void;
};

export function ElementEdit(props: Props) {
  const [blocks, setBlocks] = useState<BlockInterface[]>(null);
  const [selectPhotoField, setSelectPhotoField] = React.useState<string>(null);
  const [element, setElement] = useState<ElementInterface>(null);
  const [errors, setErrors] = useState([]);
  const [innerErrors, setInnerErrors] = useState([]);
  const parsedData = element?.answersJSON ? JSON.parse(element.answersJSON) : {};
  const parsedStyles = element?.stylesJSON ? JSON.parse(element.stylesJSON) : {};
  const parsedAnimations = element?.animationsJSON ? JSON.parse(element.animationsJSON) : {};

  const handleCancel = () => props.updatedCallback(element);
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
      case "elementType":
        p.elementType = val;
        break;
      case "answersJSON":
        p.answersJSON = val;
        break;
      default:
        parsedData[e.target.name] = val;
        p.answersJSON = JSON.stringify(parsedData);
        break;
    }
    setElement(p);
    props.onRealtimeChange(p);
  };

  const handleCheck = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = { ...element };
    const val: any = e.target.checked.toString();
    switch (e.target.name) {
      case "elementType":
        p.elementType = val;
        break;
      case "answersJSON":
        p.answersJSON = val;
        break;
      default:
        parsedData[e.target.name] = val;
        p.answersJSON = JSON.stringify(parsedData);
        break;
    }
    setElement(p);
    props.onRealtimeChange(p);
  };

  const handleHtmlChange = (field: string, newValue: string) => {
    try {
      parsedData[field] = newValue;
      const p = { ...element };
      p.answers = parsedData;
      p.answersJSON = JSON.stringify(parsedData);
      if (p.answersJSON !== element.answersJSON) {
        setElement(p);
        props.onRealtimeChange(p);
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
  };

  const handleAnimationChange = (animations: AnimationsInterface) => {
    const p = { ...element };
    p.animations = animations;
    p.animationsJSON = animations && Object.keys(animations).length > 0 ? JSON.stringify(animations) : null;

    setElement(p);
  };

  const handleSave = () => {
    if (innerErrors.length === 0) {
      ApiHelper.post("/elements", [element], "ContentApi")
        .then((response: any) => {
          const data = Array.isArray(response) ? response[0] : response;
          if (data.answersJSON) data.answers = JSON.parse(data.answersJSON);
          if (data.stylesJSON) data.styles = JSON.parse(data.stylesJSON);
          if (data.animationsJSON) data.animations = JSON.parse(data.animationsJSON);
          setElement(data);
          props.updatedCallback(data);
        })
        .catch((error: any) => {
          console.error("ElementEdit API error:", error);
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

  const handleDelete = () => {
    if (window.confirm(Locale.label("site.elements.confirmDelete"))) {
      ApiHelper.delete("/elements/" + element.id.toString(), "ContentApi").then(() => props.updatedCallback(null));
    }
  };

  const getJsonFields = () => (
    <TextField
      fullWidth
      size="small"
      label={Locale.label("site.elements.answersJSON")}
      name="answersJSON"
      value={element.answersJSON}
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

  const getAppearanceFields = (fields: string[]) => (
    <StylesAnimations fields={fields} styles={parsedStyles} onStylesChange={handleStyleChange} animations={parsedAnimations} onAnimationsChange={handleAnimationChange} />
  );

  const getBoxFields = () => (
    <>
      <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.rounded === "true" ? true : false} />} name="rounded" label={Locale.label("site.elements.roundedCorners")} />
      <FormControlLabel control={<Checkbox onChange={handleCheck} checked={parsedData.translucent === "true" ? true : false} />} name="translucent" label={Locale.label("site.elements.translucent")} />
      <br />
      <PickColors
        background={parsedData?.background}
        textColor={parsedData?.textColor}
        headingColor={parsedData?.headingColor || parsedData?.textColor}
        linkColor={parsedData?.linkColor}
        updatedCallback={selectColors}
        globalStyles={props.globalStyles}
      />
      {getAppearanceFields(["border", "background", "color", "font", "height", "min", "max", "line", "margin", "padding", "text", "width"])}
    </>
  );

  const getTextFields = () => (
    <>
      {getTextAlignment("textAlignment")}
      <Box sx={{ marginTop: 2 }}>
        <HtmlEditor
          value={parsedData.text || ""}
          onChange={(val) => {
            handleHtmlChange("text", val);
          }}
          style={{ maxHeight: 200, overflowY: "scroll" }}
        />
      </Box>
      {getAppearanceFields(["font", "color", "line", "margin", "padding", "text"])}
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
      <Box sx={{ marginTop: 2 }}>
        <HtmlEditor
          value={parsedData.text || ""}
          onChange={(val) => {
            handleHtmlChange("text", val);
          }}
          style={{ maxHeight: 200, overflowY: "scroll" }}
        />
      </Box>
      {getAppearanceFields(["border", "background", "color", "font", "height", "min", "max", "line", "margin", "padding", "text", "width"])}
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
      <TextField fullWidth size="small" label={Locale.label("site.elements.linkUrlOptional")} name="url" value={parsedData.url || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
      {getTextAlignment("titleAlignment", Locale.label("site.elements.titleAlignment"))}
      <TextField fullWidth size="small" label={Locale.label("site.elements.title")} name="title" value={parsedData.title || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
      {getTextAlignment("textAlignment")}
      <Box sx={{ marginTop: 2 }}>
        <HtmlEditor
          value={parsedData.text || ""}
          onChange={(val) => {
            handleHtmlChange("text", val);
          }}
          style={{ maxHeight: 200, overflowY: "scroll" }}
        />
      </Box>
      {getAppearanceFields(["border", "background", "color", "font", "height", "min", "max", "line", "margin", "padding", "text", "width"])}
    </>
  );

  const getLogoFields = () => (
    <>
      <TextField fullWidth size="small" label={Locale.label("site.elements.linkUrlOptional")} name="url" value={parsedData.url || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
      {getAppearanceFields(["border", "background", "height", "min", "max", "margin", "padding", "width"])}
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
        {getAppearanceFields(["border", "background", "color", "font", "height", "min", "max", "line", "margin", "padding", "width"])}
      </>
    );
  };

  const getIframeFields = () => (
    <>
      <TextField fullWidth size="small" label={Locale.label("site.elements.source")} name="iframeSrc" value={parsedData.iframeSrc || ""} onChange={handleChange} />
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
      <TextField fullWidth size="small" label={Locale.label("site.elements.text")} name="buttonLinkText" value={parsedData.buttonLinkText || ""} onChange={handleChange} />
      <TextField fullWidth size="small" label={Locale.label("site.elements.url")} name="buttonLinkUrl" value={parsedData.buttonLinkUrl || ""} onChange={handleChange} />
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
      {getAppearanceFields(["border", "background", "color", "font", "height", "min", "max", "line", "margin", "padding", "width"])}
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
      <TextField fullWidth size="small" label={Locale.label("site.elements.id")} name="videoId" value={parsedData.videoId || ""} onChange={handleChange} />
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
      {getAppearanceFields(["border", "background", "color", "font", "height", "min", "max", "line", "margin", "padding", "width"])}
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
      <TextField fullWidth size="small" label={Locale.label("site.elements.photoLabel")} name="photoAlt" value={parsedData.photoAlt || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
      <TextField fullWidth size="small" label={Locale.label("site.elements.linkUrlOptional")} name="url" value={parsedData.url || ""} onChange={handleChange} onKeyDown={handleKeyDown} />
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
      </FormGroup>
      <FormControl fullWidth sx={{ marginTop: 2 }}>
        <InputLabel>{Locale.label("site.elements.imageAlignment")}</InputLabel>
        <Select fullWidth size="small" label={Locale.label("site.elements.imageAlignment")} name="imageAlign" value={parsedData.imageAlign || "left"} onChange={handleChange}>
          <MenuItem value="left">{Locale.label("common.left")}</MenuItem>
          <MenuItem value="center">{Locale.label("common.center")}</MenuItem>
          <MenuItem value="right">{Locale.label("common.right")}</MenuItem>
        </Select>
      </FormControl>
      {getAppearanceFields(["border", "background", "color", "height", "margin", "padding", "width"])}
    </>
  );

  const getWhiteSpaceFields = () => (
    <>
      <TextField fullWidth size="small" type="number" label={Locale.label("site.elements.heightPx")} name="height" onChange={handleChange} value={parsedData.height || "25"} />
    </>
  );

  const getFields = () => {
    let result = getJsonFields();
    switch (element?.elementType) {
      case "row":
        result = (
          <>
            <RowEdit parsedData={parsedData} onRealtimeChange={handleRowChange} setErrors={setInnerErrors} />
            {getAppearanceFields(["border", "background", "color", "font", "height", "line", "margin", "padding", "width"])}
          </>
        );
        break;
      case "table":
        result = (
          <>
            <TableEdit parsedData={parsedData} onRealtimeChange={handleRowChange} />
            {getAppearanceFields(["border", "background", "color", "font", "height", "line", "margin", "padding", "width"])}
          </>
        );
        break;
      case "box":
        result = getBoxFields();
        break;
      case "text":
        result = getTextFields();
        break;
      case "textWithPhoto":
        result = getTextWithPhotoFields();
        break;
      case "card":
        result = getCardFields();
        break;
      case "logo":
        result = getLogoFields();
        break;
      case "donation":
        result = <></>;
        break;
      case "donateLink":
        result = (
          <>
            <DonateLinkEdit parsedData={parsedData} onRealtimeChange={handleRowChange} />
            {getAppearanceFields(["border"])}
          </>
        );
        break;
      case "stream":
        result = getStreamFields();
        break;
      case "iframe":
        result = getIframeFields();
        break;
      case "buttonLink":
        result = getButtonLink();
        break;
      case "video":
        result = getVideoFields();
        break;
      case "rawHTML":
        result = getRawHTML();
        break;
      case "form":
        result = (
          <>
            <FormEdit parsedData={parsedData} handleChange={handleChange} />
            {getAppearanceFields(["border", "background", "color", "font", "height", "line", "margin", "padding", "width"])}
          </>
        );
        break;
      case "faq":
        result = (
          <>
            <FaqEdit parsedData={parsedData} handleChange={handleChange} handleHtmlChange={handleHtmlChange} />
            {getAppearanceFields(["border", "background", "color", "font", "height", "line", "margin", "padding", "width"])}
          </>
        );
        break;
      case "map":
        result = getMapFields();
        break;
      case "sermons":
        result = <></>;
        break;
      case "carousel":
        result = getCarouselFields();
        break;
      case "image":
        result = getImageFields();
        break;
      case "whiteSpace":
        result = getWhiteSpaceFields();
        break;
      case "calendar":
        result = (
          <>
            <CalendarElementEdit parsedData={parsedData} handleChange={handleChange} />
            {getAppearanceFields(["border", "background", "color", "font", "height", "line", "margin", "padding", "width"])}
          </>
        );
        break;
      case "groupList":
        result = getGroupListFields();
        break;
    }
    return result;
  };

  const handlePhotoSelected = (image: string) => {
    const p = { ...element };
    parsedData[selectPhotoField] = image;
    p.answersJSON = JSON.stringify(parsedData);
    setElement(p);
    props.onRealtimeChange(p);
    setSelectPhotoField(null);
  };

  const handleRowChange = (parsedData: any) => {
    const e = { ...element };
    e.answersJSON = JSON.stringify(parsedData);
    setElement(e);
  };

  useEffect(() => {
    setElement(props.element);
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
    const elementHasNoSettings = (elementType: string): boolean => elementType === "sermons" || elementType === "donation";
    if (element && !element.id && elementHasNoSettings(element.elementType)) {
      handleSave();
    }
  }, [element]);

  const getStandardFields = () => (
    <>
      <ErrorMessages errors={errors} />
      {getFields()}
    </>
  );

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

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm(Locale.label("site.elements.confirmDuplicate"))) {
      ApiHelper.post("/elements/duplicate/" + props.element.id, {}, "ContentApi").then((data: any) => {
        props.updatedCallback(data);
      });
    }
  };

  if (!element) return <></>;

  return (
    <Dialog open={true} onClose={handleCancel} fullWidth maxWidth="md" id="elementEditDialog">
      <InputBox
        id="dialogForm"
        headerText={Locale.label("site.elements.editElement")}
        headerIcon="school"
        saveFunction={handleSave}
        cancelFunction={handleCancel}
        deleteFunction={handleDelete}
        headerActionContent={
          props.element.id && (
            <a href="about:blank" onClick={handleDuplicate}>
              {Locale.label("common.duplicate")}
            </a>
          )
        }
        data-testid="edit-element-inputbox">
        <div id="dialogFormContent">{element?.elementType === "block" ? getBlockFields() : getStandardFields()}</div>
      </InputBox>
      {selectPhotoField && <GalleryModal onClose={() => setSelectPhotoField(null)} onSelect={handlePhotoSelected} aspectRatio={0} />}
    </Dialog>
  );
}
