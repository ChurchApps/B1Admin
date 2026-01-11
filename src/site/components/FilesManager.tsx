import { useEffect, useState } from "react";
import type { FileInterface } from "../../helpers/Interfaces";
import { FileUpload } from "../../components/FileUpload";
import {
  Box, Grid, Table, TableBody, TableCell, TableHead, TableRow, Typography, Stack, LinearProgress
} from "@mui/material";
import { InputBox, ApiHelper, SmallButton, Locale } from "@churchapps/apphelper";
import { Folder as FolderIcon, InsertDriveFile as FileIcon } from "@mui/icons-material";
import { CardWithHeader, EmptyState } from "../../components/ui";

export function FilesManager() {
  const [pendingFileSave, setPendingFileSave] = useState(false);
  const [files, setFiles] = useState<FileInterface[]>(null);

  let usedSpace = 0;
  files?.forEach((f) => (usedSpace += f.size));

  const handleFileSaved = () => {
    setPendingFileSave(false);
    loadData();
  };

  const handleSave = () => {
    setPendingFileSave(true);
  };

  const loadData = () => {
    ApiHelper.get("/files", "ContentApi").then((d: any) => setFiles(d));
  };

  const handleDelete = async (file: FileInterface) => {
    if (confirm(Locale.label("site.files.confirmDelete") + " '" + file.fileName + "'?")) {
      await ApiHelper.delete("/files/" + file.id, "ContentApi");
      loadData();
    }
  };

  const formatSize = (bytes: number) => {
    let result = bytes.toString() + "b";
    if (bytes > 1000000) result = (Math.round(bytes / 10000) / 100).toString() + "MB";
    else if (bytes > 1000) result = (Math.round(bytes / 10) / 100).toString() + "KB";
    return result;
  };

  const getStorage = () => {
    const percent = (usedSpace / 100000000) * 100;
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          Storage: {formatSize(usedSpace)} / 100MB
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <Box sx={{ width: "100%", mr: 1 }}>
            <LinearProgress variant="determinate" value={percent} sx={{ height: 8, borderRadius: 4 }} />
          </Box>
          <Box sx={{ minWidth: 35 }}>
            <Typography variant="body2" color="text.secondary">
              {`${Math.round(percent)}%`}
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  };

  useEffect(() => {
    ApiHelper.get("/files", "ContentApi").then((d: any) => setFiles(d));
  }, []);

  const fileRows = files?.length > 0
    ? files.map((file) => (
      <TableRow key={file.id} sx={{ "&:hover": { backgroundColor: "action.hover" }, transition: "background-color 0.2s ease" }}>
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <FileIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <a href={file.contentPath} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <Typography variant="body2" sx={{ color: "primary.main", "&:hover": { textDecoration: "underline" } }}>
                {file.fileName}
              </Typography>
            </a>
          </Stack>
        </TableCell>
        <TableCell>
          <Typography variant="body2" color="text.secondary">
            {formatSize(file.size)}
          </Typography>
        </TableCell>
        <TableCell align="right">
          <SmallButton icon="delete" onClick={() => handleDelete(file)} data-testid={`delete-file-${file.id}-button`} />
        </TableCell>
      </TableRow>
    ))
    : (
      <TableRow>
        <TableCell colSpan={3}>
          <EmptyState icon={<FolderIcon />} title={Locale.label("site.filesManager.noFilesYet")} description={Locale.label("site.filesManager.getStarted")} variant="table" colSpan={3} />
        </TableCell>
      </TableRow>
    );

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        <Grid size={{ md: 8, xs: 12 }}>
          <CardWithHeader
            title={Locale.label("site.filesManager.files")}
            icon={<FileIcon sx={{ color: "primary.main" }} />}
            actions={
              <Typography variant="body2" color="text.secondary">
                {files?.length || 0} file{files?.length !== 1 ? "s" : ""}
              </Typography>
            }>
            <Table sx={{ minWidth: 650 }}>
              <TableHead sx={{ backgroundColor: "var(--bg-card)", "& .MuiTableCell-root": { borderBottom: "2px solid", borderBottomColor: "divider" } }}>
                <TableRow>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Name</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Size</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Actions</Typography>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody data-testid="files-table-body">
                {fileRows}
              </TableBody>
            </Table>
          </CardWithHeader>
        </Grid>
        <Grid size={{ md: 4, xs: 12 }}>
          <InputBox headerIcon="cloud_upload" headerText={Locale.label("site.files.uploadFiles")} saveFunction={handleSave} saveText={Locale.label("site.files.upload")} data-testid="file-upload-inputbox">
            {getStorage()}
            <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
              {Locale.label("site.files.storageInfo")}
            </Typography>
            {usedSpace < 100000000 && (
              <Box sx={{
                border: "2px dashed",
                borderColor: "var(--border-main)",
                borderRadius: 2,
                p: 3,
                textAlign: "center",
                "&:hover": { borderColor: "primary.main", backgroundColor: "action.hover" },
                transition: "all 0.2s ease"
              }}>
                <FileUpload contentType="website" contentId="" pendingSave={pendingFileSave} saveCallback={handleFileSaved} />
              </Box>
            )}
          </InputBox>
        </Grid>
      </Grid>
    </Box>
  );
}
