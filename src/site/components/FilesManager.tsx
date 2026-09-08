import { useState } from "react";
import type { FileInterface } from "../../helpers/Interfaces";
import { Box, Grid, Table, TableBody, TableCell, TableHead, TableRow, Typography, Stack, LinearProgress } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { useQuery } from "@tanstack/react-query";
import { Folder as FolderIcon, InsertDriveFile as FileIcon, Delete as DeleteIcon, Link as LinkIcon, Check as CheckIcon } from "@mui/icons-material";
import { EmptyState, hoverRowSx } from "../../components/ui";
import { SectionLabel, addBarSx } from "../plated";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { useConfirmDelete } from "../../hooks";
import { CustomFileUpload } from "./CustomFileUpload";


export function FilesManager() {
  const [pendingFileSave, setPendingFileSave] = useState(false);
  const [copiedId, setCopiedId] = useState<string>("");
  const filesQuery = useQuery<FileInterface[]>({ queryKey: ["/files", "ContentApi"], placeholderData: [] });
  const storageStatus = useQuery<{ provider?: string; usedBytes?: number; quotaBytes?: number }>({ queryKey: ["/storage/status", "ContentApi"] });
  const files = filesQuery.data || [];
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  let usedSpace = 0;
  files?.forEach((f) => (usedSpace += f.size || 0));
  const providerQuota = storageStatus.data?.quotaBytes || 0;
  if (providerQuota > 0 && storageStatus.data?.usedBytes !== undefined) usedSpace = storageStatus.data.usedBytes;
  const quotaLimit = providerQuota > 0 ? providerQuota : 100000000;
  // linked BYOS storage reports no quota — the church's own account is the limit
  const storageProvider = storageStatus.data?.provider || "churchapps";
  const unlimited = storageProvider !== "churchapps" && providerQuota === 0;

  const handleFileSaved = () => {
    setPendingFileSave(false);
    filesQuery.refetch();
  };

  const handleCopyLink = async (file: FileInterface) => {
    await navigator.clipboard.writeText(file.contentPath || "");
    setCopiedId(file.id || "");
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
    if (unlimited) {
      return (
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2">
            {Locale.label("site.filesManager.storage")} {formatSize(usedSpace)} · {Locale.label("site.filesManager.externalStorage", "Stored in your linked account")}
          </Typography>
        </Box>
      );
    }
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
          <AppIconButton
            label={copiedId === file.id ? Locale.label("site.filesManager.copied") : Locale.label("site.filesManager.copyLink")}
            icon={copiedId === file.id ? <CheckIcon /> : <LinkIcon />}
            onClick={() => handleCopyLink(file)}
            data-testid={`copy-file-${file.id}-link`}
          />
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
    <Box>
      {ConfirmDialogElement}
      <Grid container spacing={3}>
        <Grid size={{ md: 8, xs: 12 }}>
          <SectionLabel sx={{ mt: 0 }}>{Locale.label("site.filesManager.files")}</SectionLabel>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("site.filesManager.name")}</TableCell>
                <TableCell align="right">{Locale.label("site.filesManager.size")}</TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
            </TableHead>
            <TableBody data-testid="files-table-body">
              {fileRows}
            </TableBody>
          </Table>
        </Grid>
        <Grid size={{ md: 4, xs: 12 }}>
          <SectionLabel sx={{ mt: 0 }}>{Locale.label("site.files.uploadFiles")}</SectionLabel>
          <Box data-testid="file-upload-inputbox">
            {getStorage()}
            {!unlimited && providerQuota === 0 && (
              <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
                {Locale.label("site.files.storageInfo")}
              </Typography>
            )}
            {(unlimited || usedSpace < quotaLimit) && (
              <Box sx={addBarSx}>
                <CustomFileUpload contentType="website" contentId="" pendingSave={pendingFileSave} saveCallback={handleFileSaved} onFileSelected={() => setPendingFileSave(true)} />
              </Box>
            )}
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
}
