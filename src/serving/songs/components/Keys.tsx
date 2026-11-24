import React, { useEffect, memo, useCallback, useMemo } from "react";
import { type ArrangementInterface, type ArrangementKeyInterface, type SongDetailInterface } from "../../../helpers";
import { type FileInterface, type LinkInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { Box, Button, Menu, MenuItem, Typography, Stack, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { MusicNote as KeyIcon, Add as AddIcon, Download as DownloadIcon, Link as LinkIcon, Edit as EditIcon, CloudDownload as ImportIcon, AudioFile as AudioFileIcon, Delete as DeleteIcon, PictureAsPdf as PdfIcon } from "@mui/icons-material";
import { PillTabs, RecordHeading, TextAction } from "../../../components/ui";
import { AppIconButton } from "../../../components/ui/AppIconButton";
import { PraiseChartsProducts } from "./PraiseChartsProducts";
import { KeyEdit } from "./KeyEdit";
import { PraiseChartsHelper } from "../../../helpers/PraiseChartsHelper";
import { LinkEdit } from "./LinkEdit";
import { AudioFilesEdit } from "./AudioFilesEdit";
import { EmptyState } from "../../../components/ui/EmptyState";
import { useConfirmDelete } from "../../../hooks";
import { type PraiseChartsArrangementProduct } from "../../types";

const isPdf = (f: FileInterface) => f.fileType === "application/pdf" || /\.pdf$/i.test(f.fileName || "");

interface Props {
  arrangement: ArrangementInterface;
  songDetail: SongDetailInterface | null;
}

export const Keys = memo((props: Props) => {
  const [keys, setKeys] = React.useState<ArrangementKeyInterface[]>([]);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [selectedKey, setSelectedKey] = React.useState<ArrangementKeyInterface | null>(null);
  const [editKey, setEditKey] = React.useState<ArrangementKeyInterface | null>(null);
  const [editLink, setEditLink] = React.useState<LinkInterface | null>(null);
  const [products, setProducts] = React.useState<PraiseChartsArrangementProduct[]>([]);
  const [links, setLinks] = React.useState<LinkInterface[]>([]);
  const [arrangementFiles, setArrangementFiles] = React.useState<FileInterface[]>([]);
  const [showImport, setShowImport] = React.useState(false);
  const [showAudioUpload, setShowAudioUpload] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState<Element | null>(null);
  const open = Boolean(anchorEl);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const handleClick = useCallback((e: React.MouseEvent) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleTabChange = useCallback(
    (newValue: string) => {
      if (newValue === "add") {
        setEditKey({
          arrangementId: props.arrangement.id,
          keySignature: "C",
          shortDescription: Locale.label("songs.key.default") || "Default"
        });
      } else {
        const k = ArrayHelper.getOne(keys, "id", newValue);
        setSelectedKey(k);
        setEditKey(null);
      }
    },
    [keys, props.arrangement.id]
  );

  const loadData = useCallback(async (selectId?: string) => {
    if (props.arrangement) {
      const keys: ArrangementKeyInterface[] = await ApiHelper.get("/arrangementKeys/arrangement/" + props.arrangement.id, "ContentApi");
      setKeys(keys);
      setSelectedKey((prev) => keys.find((k) => k.id === (selectId || prev?.id)) || keys[0] || null);
      if (keys.length === 0) {
        setLinks([]);
        setProducts([]);
      }
    }
  }, [props.arrangement]);

  const loadPraiseCharts = useCallback(async () => {
    if (selectedKey && props.songDetail?.praiseChartsId) {
      const data = await ApiHelper.get("/praiseCharts/arrangement/raw/" + props.songDetail.praiseChartsId + "?keys=" + selectedKey.keySignature, "ContentApi");
      const products = data[selectedKey.keySignature || ""];
      if (products) {
        setProducts(products);
      } else {
        setProducts([]);
      }
    }
  }, [selectedKey, props.songDetail?.praiseChartsId]);

  const loadLinks = useCallback(() => {
    if (selectedKey) {
      ApiHelper.get("/links?category=arrangementKey_" + selectedKey.id, "ContentApi").then((data: LinkInterface[]) => {
        setLinks(data);
      });
    }
  }, [selectedKey]);

  // Scoped to the arrangement, not the selected key, so tracks and charts persist across key tabs.
  const loadArrangementFiles = useCallback(() => {
    if (props.arrangement?.id) {
      ApiHelper.get("/files/arrangement/" + props.arrangement.id, "ContentApi").then((data: FileInterface[]) => {
        setArrangementFiles(data || []);
      });
    }
  }, [props.arrangement?.id]);
  const audioFiles = useMemo(() => arrangementFiles.filter((f) => !isPdf(f)), [arrangementFiles]);
  const chartFiles = useMemo(() => arrangementFiles.filter(isPdf), [arrangementFiles]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    loadPraiseCharts();
    loadLinks();
  }, [loadPraiseCharts, loadLinks]);
  useEffect(() => {
    loadArrangementFiles();
  }, [loadArrangementFiles]);

  //<DisplayBox headerText="Keys" headerIcon="music_note">
  //<PraiseChartsProducts praiseChartsId={songDetail?.praiseChartsId} />

  const download = useCallback(async (product: PraiseChartsArrangementProduct) => {
    if (!product?.download) return;
    const queryPart = product.download.split("?")[1];
    if (!queryPart) return;
    const qs = queryPart.split("&");
    const skus = qs[0]?.split("=")[1];
    const keys = qs[1]?.split("=")[1];
    if (!skus || !keys) return;
    const url = await PraiseChartsHelper.download(skus, product.name + "." + product.file_type, keys);
    const newWindow = window.open(url, "_blank");
    if (newWindow) {
      newWindow.opener = null;
    }
  }, []);

  const productsList = useMemo(() => {
    if (products.length === 0) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {Locale.label("songs.keys.availableDownloads")}
        </Typography>
        <List sx={{ p: 0 }}>
          {products.map((p, i) => (
            <ListItem key={`${p.name}-${i}`} sx={{ px: 0, py: 0.5 }}>
              <ListItemButton
                onClick={() => download(p)}
                sx={{ borderRadius: "var(--b1-radius-control)" }}>
                <DownloadIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                <ListItemText
                  primary={p.name}
                  primaryTypographyProps={{
                    variant: "body2",
                    fontWeight: 500
                  }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }, [products, download]);

  const linksList = useMemo(() => {
    if (links.length === 0) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {Locale.label("songs.keys.externalLinks")}
        </Typography>
        <List sx={{ p: 0 }}>
          {links.map((l) => (
            <ListItem key={l.id} sx={{ px: 0, py: 0.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                {canEdit && (
                  <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} tone="card" onClick={() => setEditLink(l)} />
                )}
                <ListItemButton
                  component="a"
                  href={/^https?:\/\//i.test(l.url || "") || /^mailto:/i.test(l.url || "") ? l.url : "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{ borderRadius: "var(--b1-radius-control)", flex: 1 }}>
                  <LinkIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                  <ListItemText
                    primary={l.text}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: 500
                    }}
                  />
                </ListItemButton>
              </Stack>
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }, [links, canEdit]);

  const handleDeleteFile = useCallback(
    async (file: FileInterface) => {
      const message = isPdf(file)
        ? Locale.label("songs.keys.deleteChartConfirm", "Are you sure you want to delete this chart?")
        : Locale.label("songs.audio.deleteConfirm") || "Are you sure you want to delete this audio file?";
      if (await confirm(message)) {
        await ApiHelper.delete("/files/" + file.id, "ContentApi");
        loadArrangementFiles();
      }
    },
    [confirm, loadArrangementFiles]
  );

  const chartFilesList = useMemo(() => {
    if (chartFiles.length === 0) return null;

    return (
      <Box sx={{ mt: 2 }} data-testid="arrangement-chart-files">
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {Locale.label("songs.keys.chartPdfs", "Chart PDFs")}
        </Typography>
        <List sx={{ p: 0 }}>
          {chartFiles.map((f) => (
            <ListItem key={f.id} sx={{ px: 0, py: 0.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                <ListItemButton component="a" href={f.contentPath} target="_blank" rel="noopener noreferrer" sx={{ borderRadius: "var(--b1-radius-control)", flex: 1 }}>
                  <PdfIcon fontSize="small" color="action" sx={{ mr: 1 }} />
                  <ListItemText primary={f.fileName} primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
                </ListItemButton>
                {canEdit && (
                  <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} tone="card" onClick={() => handleDeleteFile(f)} />
                )}
              </Stack>
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }, [chartFiles, canEdit, handleDeleteFile]);

  const audioFilesList = useMemo(() => {
    if (audioFiles.length === 0) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
          {Locale.label("songs.keys.audioTracks") || "Audio Tracks"}
        </Typography>
        <List sx={{ p: 0 }}>
          {audioFiles.map((f) => (
            <ListItem key={f.id} sx={{ px: 0, py: 0.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                <AudioFileIcon fontSize="small" color="action" />
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <ListItemText primary={f.fileName} primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
                  <Box component="audio" controls preload="none" src={f.contentPath} sx={{ width: "100%", maxWidth: 420 }} />
                </Stack>
                {canEdit && (
                  <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} tone="card" onClick={() => handleDeleteFile(f)} />
                )}
              </Stack>
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }, [audioFiles, canEdit, handleDeleteFile]);

  const keyOptions = useMemo(
    () => keys.map((k) => ({ value: k.id || "", label: `${k.shortDescription} · ${k.keySignature}`, "data-testid": "key-pill-" + k.id })),
    [keys]
  );

  if (editKey && canEdit) {
    return (
      <KeyEdit
        arrangementKey={editKey}
        onSave={(saved) => {
          setEditKey(null);
          loadData(saved?.id);
        }}
        onCancel={() => setEditKey(null)}
      />
    );
  }

  return (
    <>
      <Box component="section">
        <RecordHeading label={Locale.label("songs.keys.title")}>
          {selectedKey && canEdit && <TextAction small onClick={() => setEditKey(selectedKey)} data-testid="key-edit-button">{Locale.label("common.edit")}</TextAction>}
          {canEdit && <TextAction small onClick={() => handleTabChange("add")} data-testid="add-key-button">{Locale.label("serving.keys.addKey", "Add key")}</TextAction>}
        </RecordHeading>

        {keys.length > 0 && (
          <PillTabs tabs aria-label={Locale.label("songs.keys.keysTabsAria")} value={selectedKey?.id || ""} onChange={handleTabChange} options={keyOptions} sx={{ mb: 2 }} />
        )}

        {selectedKey ? (
          <Box>
            {productsList}
            {linksList}
            {chartFilesList}
            {audioFilesList}

            {canEdit && (
              <Box sx={{ mt: 2 }}>
                <Button id="addBtnGroup" variant="outlined" startIcon={<AddIcon />} onClick={handleClick}>
                  {Locale.label("songs.keys.addFiles") || "Add Files"}
                </Button>
              </Box>
            )}
          </Box>
        ) : (
          <EmptyState variant="plain" icon={<KeyIcon />} title={Locale.label("songs.keys.noKeysAvailable")} />
        )}
      </Box>

      <Menu id="add-menu" anchorEl={anchorEl} open={open} onClose={handleClose} MenuListProps={{ "aria-labelledby": "addBtnGroup" }}>
        <MenuItem
          onClick={() => {
            handleClose();
            setShowImport(true);
          }}>
          <ImportIcon color="action" sx={{ mr: 2 }} />
          {Locale.label("songs.keys.importFromPraiseCharts") || "Import from PraiseCharts"}
        </MenuItem>
        <MenuItem
          disabled={!selectedKey}
          onClick={() => {
            handleClose();
            setEditLink({
              category: "arrangementKey_" + selectedKey?.id,
              linkType: "url",
              sort: 1,
              linkData: "",
              icon: ""
            });
          }}>
          <LinkIcon color="action" sx={{ mr: 2 }} />
          {Locale.label("songs.keys.addExternalLink") || "Add External Link"}
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleClose();
            setShowAudioUpload(true);
          }}>
          <AudioFileIcon color="action" sx={{ mr: 2 }} />
          {Locale.label("songs.keys.uploadAudioOrChart", "Upload Audio or Chart PDF")}
        </MenuItem>
      </Menu>

      {ConfirmDialogElement}

      {showAudioUpload && canEdit && props.arrangement.id && (
        <AudioFilesEdit
          arrangementId={props.arrangement.id}
          onSave={() => {
            setShowAudioUpload(false);
            loadArrangementFiles();
          }}
          onCancel={() => setShowAudioUpload(false)}
        />
      )}

      {editLink && canEdit && (
        <LinkEdit
          link={editLink}
          onSave={() => {
            setEditLink(null);
            loadLinks();
          }}
          onCancel={() => setEditLink(null)}
        />
      )}
      {showImport && (
        <PraiseChartsProducts
          praiseChartsId={props.songDetail?.praiseChartsId || ""}
          keySignature={selectedKey?.keySignature || ""}
          onHide={() => {
            setShowImport(false);
            loadPraiseCharts();
          }}
        />
      )}
    </>
  );
});
