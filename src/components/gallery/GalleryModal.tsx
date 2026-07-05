"use client";

import { ApiHelper, ImageEditor, Locale, TabPanel } from "@churchapps/apphelper";
import { FileHelper } from "@churchapps/apphelper/dist/helpers/FileHelper.js";
import { CommonEnvironmentHelper } from "@churchapps/helpers";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, Grid, InputLabel, MenuItem, Select, Tab, Tabs } from "@mui/material";
import { DeleteOutline as DeleteOutlineIcon } from "@mui/icons-material";
import React, { useState } from "react";
import { AppIconButton } from "../ui/AppIconButton";
import { StockPhotos } from "./StockPhotos";
import { useConfirmDelete } from "../../hooks";

interface Props {
  aspectRatio: number,
  onSelect: (img: string) => void,
  // Supports both onClose and onCancel; callers across B1Admin use either name.
  onClose?: () => void,
  onCancel?: () => void,
  // Optional override; defaults to the environment's content root.
  contentRoot?: string
}

export const GalleryModal: React.FC<Props> = (props: Props) => {
  const [images, setImages] = useState<string[]>([]);
  const [tabIndex, setTabIndex] = React.useState(0);
  const [aspectRatio, setAspectRatio] = React.useState(Math.round(props.aspectRatio * 100) / 100);
  const [editorPhotoUrl, setEditorPhotoUrl] = React.useState("");
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const contentRoot = props.contentRoot || CommonEnvironmentHelper.ContentRoot;
  const handleClose = () => { if (props.onClose) props.onClose(); else if (props.onCancel) props.onCancel(); };

  const handleTabChange = (_el: any, newValue: any) => { setTabIndex(newValue); };

  const loadData = () => { ApiHelper.get("/gallery/" + aspectRatio.toString(), "ContentApi").then((data: any) => setImages(data.images)); };

  const handleImageUpdated = async (dataUrl: string) => {

    if (!dataUrl) {
      console.warn("No dataUrl provided to handleImageUpdated");
      return;
    }

    try {
      const fileName = Math.floor(Date.now() / 1000).toString() + ".jpg";
      const blob = FileHelper.dataURLtoBlob(dataUrl);
      const file = new File([blob], fileName, { type: blob.type });

      const params = { folder: aspectRatio.toString(), fileName };

      const presigned = await ApiHelper.post("/gallery/requestUpload", params, "ContentApi");
      const doUpload = presigned.key !== undefined;

      if (doUpload) {
        await FileHelper.postPresignedFile(presigned, file, () => { });
      } else {
        console.warn("Upload failed - no presigned key received");
      }

      setTabIndex(0);
      loadData();
    } catch (error) {
      console.error("Error in handleImageUpdated:", error);
      // In case of API failure, still provide feedback to user
      alert("Image processing completed, but upload failed. API may not be available in this environment.");
    }
  };

  const handleDelete = async (folder: string, image: string) => {
    if (await confirm(Locale.label("gallery.confirmDelete"))) {
      ApiHelper.delete("/gallery/" + folder + "/" + image, "ContentApi").then(() => { loadData(); });
    }
  };

  React.useEffect(() => { if (aspectRatio !== props.aspectRatio) setAspectRatio(Math.round(props.aspectRatio * 100) / 100) }, [props.aspectRatio]); //eslint-disable-line
  React.useEffect(loadData, [aspectRatio]);

  const getImages = () => {
    const result: React.ReactElement[] = [];
    images.forEach((img: any, index: number) => {
      const parts = img.split("/");

      result.push(<Grid key={img || index} size={{ xs: 12, md: 4 }}>
        <Box sx={{ position: "relative", ":hover #deleteIcon": { visibility: "visible" } }}>
          <a href="about:blank" onClick={(e) => { e.preventDefault(); props.onSelect(contentRoot + "/" + img); }} aria-label="Select image" data-testid="select-image">
            <Box
              component="img"
              src={contentRoot + "/" + img}
              alt="custom"
              sx={{
                width: "100%",
                height: "auto",
                maxWidth: "100%",
                display: "block"
              }}
            />
          </a>
          <Box id="deleteIcon" sx={{ position: "absolute", top: 3, right: 3, visibility: "hidden", backgroundColor: "whitesmoke", borderRadius: 5 }}>
            <AppIconButton intent="remove" label={Locale.label("common.delete")} icon={<DeleteOutlineIcon />} onClick={() => handleDelete(parts[2], parts[3])} data-testid="delete-image" />
          </Box>
        </Box>
      </Grid>);
    });
    return result;
  };

  const handleStockSelect = (url: string) => {
    setEditorPhotoUrl(url);
    setTabIndex(1);
  };

  const getDisplayAspect = () => {
    let result = aspectRatio.toString();
    if (aspectRatio === 0) result = "Free Form";
    else if (aspectRatio === 1) result = "1:1";
    else if (aspectRatio === 2) result = "2:1";
    else if (aspectRatio === 3) result = "3:1";
    else if (aspectRatio === 4) result = "4:1";
    else if (aspectRatio === 1.33) result = "4:3";
    else if (aspectRatio === 1.78) result = "16:9";
    else if (aspectRatio === 0.5) result = "1:2";
    else if (aspectRatio === 0.5625) result = "9:16";
    return result;
  };

  return (<>
    {ConfirmDialogElement}
    <Dialog open={true} onClose={handleClose}>
      <DialogTitle>Select a Photo</DialogTitle>
      <DialogContent style={{ overflowX: "hidden" }}>

        {(props.aspectRatio === 0) && (
          <FormControl fullWidth>
            <InputLabel>{Locale.label("gallery.aspectRatio")}</InputLabel>
            <Select size="small" label={Locale.label("gallery.aspectRatio")} name="aspectRatio" value={aspectRatio} onChange={(e) => setAspectRatio(parseFloat(e.target.value.toString()))}>
              <MenuItem value="0">{Locale.label("gallery.freeForm")}</MenuItem>
              <MenuItem value="1">1:1</MenuItem>
              <MenuItem value="2">2:1</MenuItem>
              <MenuItem value="3">3:1</MenuItem>
              <MenuItem value="4">4:1</MenuItem>
              <MenuItem value="1.33">4:3</MenuItem>
              <MenuItem value="1.78">16:9</MenuItem>
              <MenuItem value="0.5">1:2</MenuItem>
              <MenuItem value="0.5625">9:16</MenuItem>
            </Select>
          </FormControl>
        )}

        <Tabs variant="fullWidth" value={tabIndex} onChange={handleTabChange}>
          <Tab label="Gallery" />
          <Tab label="Upload" />
          <Tab label="Stock Photos" />
        </Tabs>
        <TabPanel value={tabIndex} index={0}>

          <Grid container spacing={3} alignItems="center">
            {getImages()}
          </Grid>
        </TabPanel>
        <TabPanel value={tabIndex} index={1}>
          <div>{Locale.label("gallery.aspectRatio")}: {getDisplayAspect()}</div>
          <ImageEditor onUpdate={handleImageUpdated} photoUrl={editorPhotoUrl} aspectRatio={aspectRatio} outputWidth={1280} outputHeight={768} hideDelete={true} />
        </TabPanel>
        <TabPanel value={tabIndex} index={2}>
          <StockPhotos aspectRatio={aspectRatio} onSelect={props.onSelect} onStockSelect={handleStockSelect} />
        </TabPanel>
      </DialogContent>
      <DialogActions sx={{ paddingX: "16px", paddingBottom: "12px" }}>
        <Button variant="outlined" onClick={handleClose}>Close</Button>
      </DialogActions>
    </Dialog>
  </>);
};
