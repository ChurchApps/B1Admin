import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { LinearProgress, Box, Typography, Button, IconButton, Stack } from "@mui/material";
import {
  InsertDriveFile as FileIcon,
  Cancel as CancelIcon,
  CloudUpload as UploadIcon,
  CheckCircle as CheckCircleIcon
} from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";

interface Props {
  contentType: string;
  contentId: string;
  pendingSave: boolean;
  saveCallback: (file: any) => void;
}

export function CustomFileUpload(props: Props) {
  const [file] = useState<any>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
    }
  };

  const handleClear = () => {
    setUploadedFile(null);
    setUploadProgress(-1);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const convertBase64 = (): Promise<string | ArrayBuffer | null> =>
    new Promise((resolve, reject) => {
      if (!uploadedFile) return resolve(null);
      const fileReader = new FileReader();
      fileReader.readAsDataURL(uploadedFile);
      fileReader.onload = () => {
        resolve(fileReader.result);
      };
      fileReader.onerror = (error) => {
        reject(error);
      };
    });

  const handleSave = async () => {
    if (!uploadedFile) return;
    const f: any = { ...file };
    f.size = uploadedFile.size;
    f.fileType = uploadedFile.type;
    f.fileName = uploadedFile.name;
    f.contentType = props.contentType;
    f.contentId = props.contentId;

    const preUploaded = await preUpload();
    if (!preUploaded) {
      const base64 = await convertBase64();
      f.fileContents = base64;
    }
    const data = await ApiHelper.post("/files", [f], "ContentApi");
    handleClear();
    props.saveCallback(data[0]);
  };

  const checkSave = () => {
    if (props.pendingSave) {
      if (uploadedFile && uploadedFile.size > 0) {
        handleSave();
      } else {
        props.saveCallback(file);
      }
    }
  };

  const preUpload = async () => {
    if (!uploadedFile) return false;
    const params = {
      fileName: uploadedFile.name,
      contentType: props.contentType,
      contentId: props.contentId
    };
    const presigned = await ApiHelper.post("/files/postUrl", params, "ContentApi");
    const doUpload = presigned.key !== undefined;
    if (doUpload) await postPresignedFile(presigned);
    return doUpload;
  };

  const postPresignedFile = (presigned: any) => {
    if (!uploadedFile) return;
    const formData = new FormData();
    formData.append("acl", "public-read");
    formData.append("Content-Type", uploadedFile.type);
    for (const property in presigned.fields) {
      formData.append(property, presigned.fields[property]);
    }
    formData.append("file", uploadedFile);

    const axiosConfig = {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (progressEvent: any) => {
        if (progressEvent.total) {
          setUploadProgress(
            Math.round((100 * progressEvent.loaded) / progressEvent.total)
          );
        }
      }
    };
    return axios.post(presigned.url, formData, axiosConfig);
  };

  useEffect(checkSave, [props.pendingSave]);



  if (uploadedFile) {
    const isUploading = uploadProgress > -1 && props.pendingSave;
    return (
      <Box
        sx={{
          border: "2px dashed",
          borderColor: "#3dc13c",
          backgroundColor: "rgba(61, 193, 60, 0.2)",
          color: "#278e26",
          borderRadius: 2,
          p: 3,
          animation: "fadeIn 0.3s ease",
          transition: "all 0.2s ease"
        }}
      >
        <Stack spacing={1.5} sx={{ width: "100%" }}>
          <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" sx={{ overflow: "hidden" }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ overflow: "hidden" }}>
              <CheckCircleIcon sx={{ color: "#278e26" }} />
              <FileIcon sx={{ color: "#278e26" }} />
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  textOverflow: "ellipsis",
                  overflow: "hidden",
                  whiteSpace: "nowrap"
                }}
              >
                {uploadedFile.name}
              </Typography>
            </Stack>
            {!isUploading && (
              <IconButton size="small" onClick={handleClear} sx={{ color: "#278e26" }}>
                <CancelIcon />
              </IconButton>
            )}
          </Stack>
          {isUploading && (
            <Box sx={{ width: "100%" }}>
              <LinearProgress variant="determinate" value={uploadProgress} sx={{ height: 4, borderRadius: 2, backgroundColor: "#ffffff", "& .MuiLinearProgress-bar": { backgroundColor: "#278e26" } }} />
              <Typography variant="caption" sx={{ color: "#278e26", display: "block", mt: 0.5, textAlign: "right", fontWeight: "bold" }}>
                {uploadProgress}%
              </Typography>
            </Box>
          )}


        </Stack>
      </Box>
    );
  }



  return (
    <Box
      sx={{
        border: "2px dashed",
        borderColor: "divider",
        borderRadius: 2,
        p: 3,
        textAlign: "center",
        "&:hover": { borderColor: "primary.main", backgroundColor: "action.hover" },
        transition: "all 0.2s ease"
      }}
    >
      <input
        id="fileUpload"
        type="file"
        ref={fileInputRef}
        onChange={handleChange}
        style={{ display: "none" }}
        data-testid="file-upload-input"
      />
      <Button
        variant="outlined"
        color="primary"
        startIcon={<UploadIcon />}
        onClick={() => fileInputRef.current?.click()}
        data-testid="choose-file-btn"
      >
        {Locale.label("fileUpload.chooseFile", "Choose File")}
      </Button>
    </Box>
  );
}

