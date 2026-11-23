import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Box, Button, Link, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { type FileInterface, type LinkInterface } from "@churchapps/helpers";
import { ApiHelper, DateHelper, Loading, Locale } from "@churchapps/apphelper";
import { RecordHeading, TextAction, VerbRow, tableScrollSx } from "../../components/ui";
import { CustomFileUpload } from "../../site/components/CustomFileUpload";
import { useConfirmDelete } from "../../hooks";

// Matches the per-person cap the Api enforces for person documents.
const MAX_BYTES = 100000000;

const formatSize = (bytes?: number) => {
  const b = bytes || 0;
  if (b >= 1000000) return (Math.round(b / 10000) / 100) + " MB";
  if (b >= 1000) return Math.round(b / 1000) + " KB";
  return b + " B";
};

const formatDate = (value?: Date | string) => (value ? DateHelper.prettyDate(new Date(value)) : "");

const plainTableSx = { "& .MuiTableCell-root": { pl: 0, pr: 2 }, "& .MuiTableCell-root:last-of-type": { pr: 0 } } as const;

interface Props {
  personId: string;
  canEdit: boolean;
}

// Staff-only records kept on a person (baptism certificates, event records). Files are private in the
// Api and open through a short-lived signed link; links are plain URLs.
export const PersonDocumentsSummary: React.FC<Props> = ({ personId, canEdit }) => {
  const files = useQuery<FileInterface[]>({ queryKey: ["/files/person/" + personId, "ContentApi"], enabled: !!personId });
  const links = useQuery<LinkInterface[]>({ queryKey: ["/links?category=personLink&linkData=" + personId, "ContentApi"], enabled: !!personId });
  const [mode, setMode] = React.useState<"" | "upload" | "link">("");
  const [pendingSave, setPendingSave] = React.useState(false);
  const [linkText, setLinkText] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [linkError, setLinkError] = React.useState("");
  const { confirm, ConfirmDialogElement } = useConfirmDelete({ "data-testid": "person-documents-confirm" });

  React.useEffect(() => { setMode(""); }, [personId]);

  const usedBytes = (files.data || []).reduce((sum, f) => sum + (f.size || 0), 0);

  const closeForms = () => {
    setMode("");
    setPendingSave(false);
    setLinkText("");
    setLinkUrl("");
    setLinkError("");
  };

  const handleUploaded = () => {
    closeForms();
    files.refetch();
  };

  const handleSaveLink = async () => {
    const url = linkUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(url)) {
      setLinkError(Locale.label("people.documents.invalidUrl", "Enter a full web address starting with http:// or https://"));
      return;
    }
    const link: LinkInterface = { category: "personLink", linkData: personId, linkType: "url", icon: "", text: linkText.trim() || url, url };
    await ApiHelper.post("/links", [link], "ContentApi");
    closeForms();
    links.refetch();
  };

  const handleDownload = async (file: FileInterface) => {
    const result: { url?: string } = await ApiHelper.get("/files/download/" + file.id + "/link", "ContentApi");
    if (result?.url) window.location.assign(result.url);
  };

  const handleDeleteFile = async (file: FileInterface) => {
    const msg = Locale.label("people.documents.confirmDelete", "Delete {name}? This can't be undone.").replace("{name}", file.fileName || "");
    if (!(await confirm(msg))) return;
    await ApiHelper.delete("/files/" + file.id, "ContentApi");
    files.refetch();
  };

  const handleDeleteLink = async (link: LinkInterface) => {
    const msg = Locale.label("people.documents.confirmDelete", "Delete {name}? This can't be undone.").replace("{name}", link.text || "");
    if (!(await confirm(msg))) return;
    await ApiHelper.delete("/links/" + link.id, "ContentApi");
    links.refetch();
  };

  const uploadForm = mode === "upload" && (
    <Stack spacing={1.5} sx={{ mb: 2 }} data-testid="person-documents-upload">
      <CustomFileUpload contentType="person" contentId={personId} pendingSave={pendingSave} saveCallback={handleUploaded} errorCallback={() => setPendingSave(false)} />
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={() => setPendingSave(true)} disabled={pendingSave} data-testid="person-documents-upload-save">{Locale.label("people.documents.upload", "Upload")}</Button>
        <Button onClick={closeForms}>{Locale.label("common.cancel", "Cancel")}</Button>
      </Stack>
    </Stack>
  );

  const linkForm = mode === "link" && (
    <Stack spacing={1.5} sx={{ mb: 2, maxWidth: 480 }} data-testid="person-documents-link-form">
      <TextField size="small" label={Locale.label("people.documents.linkText", "Name")} value={linkText} onChange={(e) => setLinkText(e.target.value)} data-testid="person-documents-link-text" />
      <TextField size="small" label={Locale.label("people.documents.linkUrl", "Web address")} value={linkUrl} onChange={(e) => { setLinkUrl(e.target.value); setLinkError(""); }} error={!!linkError} helperText={linkError} data-testid="person-documents-link-url" />
      <Stack direction="row" spacing={1}>
        <Button variant="contained" onClick={handleSaveLink} data-testid="person-documents-link-save">{Locale.label("people.documents.addLink", "Add link")}</Button>
        <Button onClick={closeForms}>{Locale.label("common.cancel", "Cancel")}</Button>
      </Stack>
    </Stack>
  );

  const body = () => {
    if (files.isLoading || links.isLoading) return <Loading size="sm" />;
    const fileRows = files.data || [];
    const linkRows = links.data || [];
    if (fileRows.length === 0 && linkRows.length === 0) {
      return <Typography variant="body1" color="text.secondary">{Locale.label("people.documents.empty", "No documents yet.")}</Typography>;
    }
    return (
      <Box sx={tableScrollSx}>
        <Table size="small" sx={plainTableSx} data-testid="person-documents-table">
          <TableHead>
            <TableRow>
              <TableCell>{Locale.label("people.documents.name", "Name")}</TableCell>
              <TableCell>{Locale.label("people.documents.size", "Size")}</TableCell>
              <TableCell>{Locale.label("people.documents.added", "Added")}</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {fileRows.map((f) => (
              <TableRow key={"f" + f.id} data-testid="person-document-row">
                <TableCell sx={{ overflowWrap: "anywhere" }}>{f.fileName}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{formatSize(f.size)}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{formatDate(f.dateModified)}</TableCell>
                <TableCell align="right">
                  <VerbRow sx={{ justifyContent: "flex-end" }}>
                    <TextAction small onClick={() => handleDownload(f)} data-testid="person-document-download">{Locale.label("people.documents.download", "Download")}</TextAction>
                    {canEdit && <TextAction small onClick={() => handleDeleteFile(f)} data-testid="person-document-delete">{Locale.label("common.delete", "Delete")}</TextAction>}
                  </VerbRow>
                </TableCell>
              </TableRow>
            ))}
            {linkRows.map((l) => (
              <TableRow key={"l" + l.id} data-testid="person-document-row">
                <TableCell sx={{ overflowWrap: "anywhere" }}>{l.text}</TableCell>
                <TableCell>{Locale.label("people.documents.link", "Link")}</TableCell>
                <TableCell />
                <TableCell align="right">
                  <VerbRow sx={{ justifyContent: "flex-end" }}>
                    <Link href={l.url} target="_blank" rel="noopener noreferrer" underline="hover" sx={{ typography: "body2", fontWeight: 600, color: "var(--b1-link)" }} data-testid="person-document-open">{Locale.label("people.documents.open", "Open")}</Link>
                    {canEdit && <TextAction small onClick={() => handleDeleteLink(l)} data-testid="person-document-delete">{Locale.label("common.delete", "Delete")}</TextAction>}
                  </VerbRow>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {fileRows.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }} data-testid="person-documents-storage">
            {Locale.label("people.documents.storage", "{used} of {max} used").replace("{used}", formatSize(usedBytes)).replace("{max}", formatSize(MAX_BYTES))}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box component="section" aria-labelledby="person-documents-heading" data-testid="person-documents-section">
      <RecordHeading id="person-documents-heading" label={Locale.label("people.documents.title", "Documents")}>
        {canEdit && (
          <VerbRow>
            <TextAction small onClick={() => setMode(mode === "upload" ? "" : "upload")} data-testid="person-documents-upload-btn">{Locale.label("people.documents.upload", "Upload")}</TextAction>
            <TextAction small onClick={() => setMode(mode === "link" ? "" : "link")} data-testid="person-documents-link-btn">{Locale.label("people.documents.addLink", "Add link")}</TextAction>
          </VerbRow>
        )}
      </RecordHeading>
      {uploadForm}
      {linkForm}
      {body()}
      {ConfirmDialogElement}
    </Box>
  );
};
