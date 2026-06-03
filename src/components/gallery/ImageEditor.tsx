"use client";

import React, { useState, useEffect, useRef, Suspense, lazy } from "react";
import { InputBox, SmallButton, Loading, Locale } from "@churchapps/apphelper";
import "cropperjs/dist/cropper.css";

// Lazy load the Cropper component
const Cropper = lazy(() => import("react-cropper").then(module => ({ default: module.default })));

interface Props {
  title?: string;
  photoUrl: string;
  aspectRatio: number;
  onUpdate: (dataUrl?: string) => void;
  onCancel?: () => void;
  outputWidth?: number;
  outputHeight?: number;
  hideDelete?: boolean;
}

export function ImageEditor(props: Props) {
  const [photoSrc, setPhotoSrc] = useState<string>("");
  const [croppedImageDataUrl, setCroppedImageDataUrl] = useState<string>("");
  const cropperRef = useRef<HTMLImageElement>(null);
  const timeoutRef = useRef<number | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSave = () => {
    props.onUpdate(croppedImageDataUrl);
  };

  const handleDelete = () => props.onUpdate("");

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    let files;
    if (e.target) {
      files = e.target.files;
    }
    if (!files || files.length === 0) return;

    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result.toString();
      setPhotoSrc(url);
      setCroppedImageDataUrl("");
    };
    reader.readAsDataURL(files[0]);

    // Clear the input value to allow re-uploading the same file
    e.target.value = "";
  };

  const selectDefaultCropZone = () => {
    const imageElement: any = cropperRef?.current;
    const cropper: any = imageElement?.cropper;
    if (props.aspectRatio === 0) {
      const containerData = cropper.getContainerData();
      const imgWidth = cropper.getImageData().width;
      const imgHeight = cropper.getImageData().height;
      const effectiveWidth = (containerData.width > imgWidth) ? imgWidth : containerData.width;
      const effectiveHeight = (containerData.height > imgHeight) ? imgHeight : containerData.height;
      cropper.setCropBoxData({ width: effectiveWidth, height: effectiveHeight, left: (containerData.width - effectiveWidth) / 2.0, top: (containerData.height - effectiveHeight) / 2.0 });
    } else {
      const desiredAspect = props.aspectRatio;
      const containerData = cropper.getContainerData();
      const imgAspect = cropper.getImageData().aspectRatio;
      const scale = imgAspect / desiredAspect;
      if (scale < 1) {
        const imgWidth = cropper.getImageData().width;
        const l = (containerData.width - imgWidth) / 2.0;
        const t = (containerData.height - (containerData.height * scale)) / 2.0;
        cropper.setCropBoxData({ width: imgWidth, height: imgWidth / desiredAspect, left: l, top: t });
      } else {
        const imgHeight = cropper.getImageData().height;
        const l = (containerData.width - (imgHeight * desiredAspect)) / 2.0;
        const t = cropper.canvasData.top;
        cropper.setCropBoxData({ width: imgHeight * desiredAspect, height: imgHeight, left: l, top: t });
      }
    }

  };

  const handleCrop = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    timeoutRef.current = window.setTimeout(() => {
      if (cropperRef.current !== null) {
        const imageElement: any = cropperRef?.current;
        const cropper: any = imageElement?.cropper;

        //Do not enlarge if less
        const imageData = cropper.getImageData();
        let width = props.outputWidth || 400;
        let height = props.outputHeight || 300;
        if (imageData.naturalWidth < width && imageData.naturalHeight < height) {
          width = imageData.naturalWidth;
          height = imageData.naturalHeight;
        }

        const url = cropper.getCroppedCanvas({ width, height }).toDataURL("image/png", 0.4);
        setCroppedImageDataUrl(url);
      }
    }, 200);
  };

  useEffect(() => { setPhotoSrc(props.photoUrl); }, [props.photoUrl]);

  return (
    <InputBox
      id="cropperBox"
      headerIcon=""
      headerText={props.title}
      ariaLabelDelete="deletePhoto"
      saveText={Locale.label("common.update")}
      saveFunction={handleSave}
      cancelFunction={props.onCancel}
      deleteFunction={(!props.hideDelete) && handleDelete}
      headerActionContent={
        <div>
          <input type="file" onChange={handleUpload} id="fileUpload" accept="image/*" style={{ display: "none" }} />
          <SmallButton
            icon="upload"
            text="Upload"
            onClick={() => {
              document.getElementById("fileUpload").click();
            }}
          />
        </div>
      }
    >
      <Suspense fallback={<Loading />}>
        <Cropper
          ref={cropperRef}
          src={photoSrc}
          key={photoSrc}
          style={{ height: 240, width: "100%" }}
          aspectRatio={props.aspectRatio}
          guides={false}
          crop={handleCrop}
          autoCropArea={1}
          viewMode={0}
          responsive={true}
          restore={false}
          checkOrientation={false}
          background={false}
          ready={() => {
            setTimeout(selectDefaultCropZone, 100);
          }}
        />
      </Suspense>
    </InputBox>
  );
}
