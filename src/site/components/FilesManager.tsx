import { useState } from "react";
import type { FileInterface } from "../../helpers/Interfaces";
import { Box, Grid, Table, TableBody, TableCell, TableHead, TableRow, Typography, Stack, LinearProgress } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Folder as FolderIcon, InsertDriveFile as FileIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { CardWithHeader, CountChip, EmptyState, FormCard, hoverRowSx } from "../../components/ui";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { useConfirmDelete } from "../../hooks";
import { CustomFileUpload } from "./CustomFileUpload";


export function FilesManager() {
  const [pendingFileSave, setPendingFileSave] = useState(false);
  const filesQuery = useQuery<FileInterface[]>({ queryKey: ["/files", "ContentApi"], placeholderData: [] });
  const storageStatus = useQuery<{ provider?: string; usedBytes?: number; quotaBytes?: number }>({ queryKey: ["/storage/status", "ContentApi"] });
  const files = filesQuery.data || [];
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  let usedSpace = 0;
  files?.forEach((f) => (usedSpace += f.size || 0));
  const providerQuota = storageStatus.data?.quotaBytes || 0;
  if (providerQuota > 0 && storageStatus.data?.usedBytes !== undefined) usedSpace = storageStatus.data.usedBytes;
  const quotaLimit = providerQuota > 0 ? providerQuota : 100000000;

  const handleFileSaved = () => {
    setPendingFileSave(false);
    filesQuery.refetch();
  };

  const handleSave = () => {
    setPendingFileSave(true);
  };

  const handleDelete = async (file: FileInterface) => {
    if (await confirm(Locale.label("site.files.confirmDelete") + " '" + file.fileName + "'?")) {
      await ApiHelper.delete("/files/" + file.id, "ContentApi");
      filesQuery.refetch();
    }
  };

  const formatSize = (bytes: number) => {
    let result = bytes.toString() + "b";
    if (bytes > 1000000000) result = (Math.round(bytes / 10000000) / 100).toString() + "GB";
    else if (bytes > 1000000) result = (Math.round(bytes / 10000) / 100).toString() + "MB";
    else if (bytes > 1000) result = (Math.round(bytes / 10) / 100).toString() + "KB";
    return result;
  };

  const getStorage = () => {
    const percent = Math.min(100, (usedSpace / quotaLimit) * 100);
    return (
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1 }}>
          {Locale.label("site.filesManager.storage")} {formatSize(usedSpace)} / {formatSize(quotaLimit)}
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

  const fileRows = files?.length > 0
    ? files.map((file) => (
      <TableRow key={file.id} sx={hoverRowSx}>
        <TableCell>
          <Stack direction="row" spacing={1} alignItems="center">
            <FileIcon sx={{ fontSize: 20, color: "primary.main" }} />
            <a href={file.contentPath} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
              <Typography variant="body2" sx={{ color: "var(--link)", fontWeight: 500, "&:hover": { textDecoration: "underline" } }}>
                {file.fileName}
              </Typography>
            </a>
          </Stack>
        </TableCell>
        <TableCell align="right">
          <Typography variant="body2" color="text.secondary">
            {formatSize(file.size || 0)}
          </Typography>
        </TableCell>
        <TableCell align="right" className="rowActions">
          <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} intent="remove" onClick={() => handleDelete(file)} data-testid={`delete-file-${file.id}-button`} />
        </TableCell>
      </TableRow>
    ))
    : (
      <TableRow>
        <EmptyState icon={<FolderIcon />} title={Locale.label("site.filesManager.noFilesYet")} description={Locale.label("site.filesManager.getStarted")} variant="table" colSpan={3} />
      </TableRow>
    );

  return (
    <Box sx={{ p: 3 }}>
      {ConfirmDialogElement}
      <Grid container spacing={3}>
        <Grid size={{ md: 8, xs: 12 }}>
          <CardWithHeader
            title={Locale.label("site.filesManager.files")}
            icon={<FileIcon sx={{ color: "primary.main", fontSize: 20 }} />}
            actions={files?.length > 0 && <CountChip count={files.length} />}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("site.filesManager.name")}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>{Locale.label("site.filesManager.size")}</Typography>
                  </TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody data-testid="files-table-body">
                {fileRows}
              </TableBody>
            </Table>
          </CardWithHeader>
        </Grid>
        <Grid size={{ md: 4, xs: 12 }}>
          <FormCard icon="cloud_upload" title={Locale.label("site.files.uploadFiles")} onSave={handleSave} saveText={Locale.label("site.files.upload")} data-testid="file-upload-inputbox" isSubmitting={pendingFileSave}>

            {getStorage()}
            {providerQuota === 0 && (
              <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
                {Locale.label("site.files.storageInfo")}
              </Typography>
            )}
            {usedSpace < quotaLimit && (
              <CustomFileUpload contentType="website" contentId="" pendingSave={pendingFileSave} saveCallback={handleFileSaved} />
            )}
          </FormCard>
        </Grid>
      </Grid>
    </Box>
  );
}
