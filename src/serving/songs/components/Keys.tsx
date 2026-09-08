import React, { useEffect, memo, useCallback, useMemo } from "react";
import { type ArrangementInterface, type ArrangementKeyInterface, type SongDetailInterface } from "../../../helpers";
import { type LinkInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import { Box, Menu, MenuItem, Stack, List, ListItem, ListItemButton, ListItemText } from "@mui/material";
import { ListPills, Pill, SectionLabel, Verb, Verbs, platedColor } from "../../plated";
import { Download as DownloadIcon, Link as LinkIcon, Edit as EditIcon, CloudDownload as ImportIcon, AudioFile as AudioFileIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { AppIconButton } from "../../../components/ui/AppIconButton";
import { PraiseChartsProducts } from "./PraiseChartsProducts";
import { KeyEdit } from "./KeyEdit";
import { PraiseChartsHelper } from "../../../helpers/PraiseChartsHelper";
import { LinkEdit } from "./LinkEdit";
import { AudioFilesEdit } from "./AudioFilesEdit";
import { useConfirmDelete } from "../../../hooks";

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
  const [products, setProducts] = React.useState<any[]>([]);
  const [links, setLinks] = React.useState<LinkInterface[]>([]);
  const [audioFiles, setAudioFiles] = React.useState<any[]>([]);
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

  const loadData = useCallback(async () => {
    if (props.arrangement) {
      const keys = await ApiHelper.get("/arrangementKeys/arrangement/" + props.arrangement.id, "ContentApi");
      setKeys(keys);
      if (keys.length > 0) setSelectedKey(keys[0]);
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
      ApiHelper.get("/links?category=arrangementKey_" + selectedKey.id, "ContentApi").then((data: any) => {
        setLinks(data);
      });
    }
  }, [selectedKey]);

  // Scoped to the arrangement, not the selected key, so tracks persist across key tabs.
  const loadAudioFiles = useCallback(() => {
    if (props.arrangement?.id) {
      ApiHelper.get("/files/arrangement/" + props.arrangement.id, "ContentApi").then((data: any) => {
        setAudioFiles(data || []);
      });
    }
  }, [props.arrangement?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    loadPraiseCharts();
    loadLinks();
  }, [loadPraiseCharts, loadLinks]);
  useEffect(() => {
    loadAudioFiles();
  }, [loadAudioFiles]);

  //<DisplayBox headerText="Keys" headerIcon="music_note">
  //<PraiseChartsProducts praiseChartsId={songDetail?.praiseChartsId} />

  const download = useCallback(async (product: any) => {
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
                sx={{
                  borderRadius: 1,
                  "&:hover": { backgroundColor: "action.hover" }
                }}>
                <DownloadIcon sx={{ mr: 1, fontSize: 18, color: "primary.main" }} />
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
                  sx={{
                    borderRadius: 1,
                    flex: 1,
                    "&:hover": { backgroundColor: "action.hover" }
                  }}>
                  <LinkIcon sx={{ mr: 1, fontSize: 18, color: "secondary.main" }} />
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

  const handleDeleteAudio = useCallback(
    async (file: any) => {
      if (await confirm(Locale.label("songs.audio.deleteConfirm") || "Are you sure you want to delete this audio file?")) {
        await ApiHelper.delete("/files/" + file.id, "ContentApi");
        loadAudioFiles();
      }
    },
    [confirm, loadAudioFiles]
  );

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
                <AudioFileIcon sx={{ fontSize: 18, color: "primary.main" }} />
                <Stack sx={{ flex: 1, minWidth: 0 }}>
                  <ListItemText primary={f.fileName} primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
                  <Box component="audio" controls preload="none" src={f.contentPath} sx={{ width: "100%", maxWidth: 420 }} />
                </Stack>
                {canEdit && (
                  <AppIconButton label={Locale.label("common.delete")} icon={<DeleteIcon />} tone="card" onClick={() => handleDeleteAudio(f)} />
                )}
              </Stack>
            </ListItem>
          ))}
        </List>
      </Box>
    );
  }, [audioFiles, canEdit, handleDeleteAudio]);

  const tabsComponent = useMemo(
    () =>
      keys.map((k) => (
        <Pill key={k.id} on={selectedKey?.id === k.id} onClick={() => handleTabChange(k.id || "")}>
          {k.shortDescription} {k.keySignature}
        </Pill>
      )),
    [keys, selectedKey?.id, handleTabChange]
  );

  if (editKey && canEdit) {
    return (
      <KeyEdit
        arrangementKey={editKey}
        onSave={() => {
          setEditKey(null);
          loadData();
        }}
        onCancel={() => setEditKey(null)}
      />
    );
  }

  return (
    <>
      <Box sx={{ mt: 3 }}>
        <SectionLabel>{Locale.label("songs.keys.title") || "Keys & Downloads"}</SectionLabel>
        <Verbs>
          {selectedKey && canEdit && <Verb onClick={() => setEditKey(selectedKey)}>{Locale.label("common.edit")}</Verb>}
        </Verbs>
        <ListPills>
          {tabsComponent}
          {canEdit && (
            <Pill on={false} onClick={() => handleTabChange("add")}>{Locale.label("songs.keys.add") || "Add Key"}</Pill>
          )}
        </ListPills>

        {selectedKey ? (
          <Box>
            {productsList}
            {linksList}
            {audioFilesList}

            {canEdit && (
              <Verbs>
                <Verb onClick={handleClick}>{Locale.label("songs.keys.addFiles") || "Add Files"}</Verb>
              </Verbs>
            )}
          </Box>
        ) : (
          <p style={{ color: platedColor.mute }}>{Locale.label("songs.keys.noKeysAvailable")}</p>
        )}
      </Box>

      <Menu id="add-menu" anchorEl={anchorEl} open={open} onClose={handleClose} MenuListProps={{ "aria-labelledby": "addBtnGroup" }}>
        <MenuItem
          onClick={() => {
            handleClose();
            setShowImport(true);
          }}>
          <ImportIcon sx={{ mr: 2, color: "primary.main" }} />
          {Locale.label("songs.keys.importFromPraiseCharts") || "Import from PraiseCharts"}
        </MenuItem>
        <MenuItem
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
          <LinkIcon sx={{ mr: 2, color: "secondary.main" }} />
          {Locale.label("songs.keys.addExternalLink") || "Add External Link"}
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleClose();
            setShowAudioUpload(true);
          }}>
          <AudioFileIcon sx={{ mr: 2, color: "primary.main" }} />
          {Locale.label("songs.keys.uploadAudio") || "Upload Audio"}
        </MenuItem>
      </Menu>

      {ConfirmDialogElement}

      {showAudioUpload && canEdit && (
        <AudioFilesEdit
          arrangementId={props.arrangement.id}
          onSave={() => {
            setShowAudioUpload(false);
            loadAudioFiles();
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
