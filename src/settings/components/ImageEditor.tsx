import React, { useCallback } from "react";
import Cropper from "react-cropper";
import "cropperjs/dist/cropper.css";
import { Button } from "@mui/material";
import { Upload as UploadIcon } from "@mui/icons-material";
import { InputBox, type GenericSettingInterface, ArrayHelper, Locale } from "@churchapps/apphelper";

interface Props {
  settings: GenericSettingInterface[];
  updatedFunction: (dataUrl: string) => void;
  aspectRatio: number;
  name: string;
}

export const ImageEditor: React.FC<Props> = (props) => {
  const [currentUrl, setCurrentUrl] = React.useState("about:blank");
  const [dataUrl, setDataUrl] = React.useState(null);
  let timeout: any = null;

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    let files;
    if (e.target) files = e.target.files;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result.toString();
      setCurrentUrl(url);
      setDataUrl(url);
    };
    reader.readAsDataURL(files[0]);
  };

  const getHeaderButton = () => (
    <div>
      <input type="file" onChange={handleUpload} id="fileUpload" accept="image/*" style={{ display: "none" }} />
      <Button size="small" variant="contained" startIcon={<UploadIcon />} onClick={() => document.getElementById("fileUpload").click()} data-testid="upload-image-button" aria-label="Upload image">{Locale.label("settings.imageEditor.upload")}</Button>
    </div>
  );

  const cropper = React.useRef(null);

  const onCropperInit = (c: any) => {
    cropper.current = c;
  };

  const cropCallback = () => {
    if (cropper.current !== null) {
      const data = cropper.current.getCropBoxData();
      const ratio = parseInt((300.0 / data.height).toString());
      const width = data.width * ratio;
      const url = cropper.current.getCroppedCanvas({ width: width, height: 300 }).toDataURL();
      setDataUrl(url);
    }
  };

  const handleCrop = () => {
    if (timeout !== null) {
      window.clearTimeout(timeout);
      timeout = null;
    }
    timeout = window.setTimeout(cropCallback, 200);
  };

  const handleSave = () => {
    props.updatedFunction(dataUrl);
  };
  const handleCancel = () => {
    props.updatedFunction(null);
  };
  const init = useCallback(() => {
    const startingUrl = ArrayHelper.getOne(props.settings, "keyName", props.name)?.value;
    setCurrentUrl(startingUrl);
  }, [props.settings, props.name]);

  React.useEffect(init, [init]);

  return (
    <InputBox
      id="cropperBox"
      headerIcon=""
      headerText={Locale.label("settings.imageEditor.crop")}
      saveFunction={handleSave}
      saveText={Locale.label("common.update")}
      cancelFunction={handleCancel}
      headerActionContent={getHeaderButton()}>
      <Cropper onReady={onCropperInit} src={currentUrl} style={{ height: 150, width: "100%" }} aspectRatio={props.aspectRatio} guides={false} crop={handleCrop} />
    </InputBox>
  );
};
