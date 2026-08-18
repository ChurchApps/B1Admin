import { useState, useEffect, useRef } from "react";
import { FileHelper } from "@churchapps/helpers";
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
  accept?: string;
  errorCallback?: () => void;
}

export function CustomFileUpload(props: Props) {
  const [file] = useState<any>({});
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(-1);
  const [uploadError, setUploadError] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      setUploadedFile(e.target.files[0]);
      setUploadError("");
    }
  };

  const handleClear = () => {
    setUploadedFile(null);
    setUploadProgress(-1);
    setUploadError("");
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

    try {
      const preUploaded = await preUpload();
      if (!preUploaded) {
        const base64 = await convertBase64();
        f.fileContents = base64;
      } else if (preUploaded.externalId) f.externalId = preUploaded.externalId;
      const data = await ApiHelper.post("/files", [f], "ContentApi");
      handleClear();
      props.saveCallback(data[0]);
    } catch (error) {
      setUploadProgress(-1);
      const message = String((error as Error)?.message || error);
      if (message.includes("storage_quota_exceeded")) {
        setUploadError(Locale.label("fileUpload.quotaExceeded", "Storage quota exceeded. Delete unused files or upgrade your storage plan."));
      } else if (message.includes("storage_provider_error")) {
        setUploadError(message.substring(message.indexOf("storage_provider_error")));
      } else if (message.includes("unsupported_audio_format")) {
        setUploadError(Locale.label("songs.audio.unsupportedFormat", "Unsupported audio format. Please upload an MP3, M4A, or AAC file."));
      } else if (message.includes("file_too_large")) {
        setUploadError(Locale.label("songs.audio.tooLarge", "File is too large. Maximum size is 25 MB."));
      } else {
        setUploadError(Locale.label("fileUpload.uploadFailed", "Upload failed. Please try again."));
      }
      props.errorCallback?.();
    }
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

  const preUpload = async (): Promise<{ externalId?: string } | false> => {
    if (!uploadedFile) return false;
    const params = {
      fileName: uploadedFile.name,
      contentType: props.contentType,
      contentId: props.contentId,
      size: uploadedFile.size,
      mimeType: uploadedFile.type
    };
    const presigned = await ApiHelper.post("/files/postUrl", params, "ContentApi");
    if (presigned.error) throw new Error(presigned.error);
    if (presigned.key === undefined) return false;
    return FileHelper.uploadPresignedFile(presigned, uploadedFile, setUploadProgress);
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
          {uploadError && (
            <Typography variant="body2" color="error" data-testid="file-upload-error">
              {uploadError}
            </Typography>
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
        accept={props.accept}
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

