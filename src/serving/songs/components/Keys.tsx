import React, { useEffect, memo, useCallback, useMemo } from "react";
import { type ArrangementInterface, type ArrangementKeyInterface, type SongDetailInterface } from "../../../helpers";
import { type LinkInterface } from "@churchapps/helpers";
import { ApiHelper, ArrayHelper, Locale, UserHelper, Permissions } from "@churchapps/apphelper";
import {
  Box, Button, Menu, MenuItem, Tab, Tabs, Card, CardContent, Typography, Stack, List, ListItem, ListItemButton, ListItemText, IconButton, Paper, Chip
} from "@mui/material";
import { MusicNote as KeyIcon, Add as AddIcon, Download as DownloadIcon, Link as LinkIcon, Edit as EditIcon, CloudDownload as ImportIcon } from "@mui/icons-material";
import { PraiseChartsProducts } from "./PraiseChartsProducts";
import { KeyEdit } from "./KeyEdit";
import { PraiseChartsHelper } from "../../../helpers/PraiseChartsHelper";
import { LinkEdit } from "./LinkEdit";

interface Props {
  arrangement: ArrangementInterface;
  songDetail: SongDetailInterface;
}

export const Keys = memo((props: Props) => {
  const [keys, setKeys] = React.useState<ArrangementKeyInterface[]>([]);
  const canEdit = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const [selectedKey, setSelectedKey] = React.useState<ArrangementKeyInterface>(null);
  const [editKey, setEditKey] = React.useState<ArrangementKeyInterface>(null);
  const [editLink, setEditLink] = React.useState<LinkInterface>(null);
  const [products, setProducts] = React.useState<any[]>([]);
  const [links, setLinks] = React.useState<LinkInterface[]>([]);
  const [showImport, setShowImport] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  const handleClick = useCallback((e: React.MouseEvent) => {
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  const handleTabChange = useCallback(
    (event: React.SyntheticEvent, newValue: string) => {
      if (newValue === "add") {
        setEditKey({
          arrangementId: props.arrangement.id,
          keySignature: "C",
          shortDescription: Locale.label("songs.key.default") || "Default",
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
      const products = data[selectedKey.keySignature];
      if (products) {
        setProducts(products);
      } else {
        setProducts([]);
      }
    }
  }, [selectedKey, props.songDetail?.praiseChartsId]);

  const loadLinks = useCallback(() => {
    if (selectedKey) {
      ApiHelper.get("/links?category=arrangementKey_" + selectedKey.id, "ContentApi").then((data) => {
        setLinks(data);
      });
    }
  }, [selectedKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  useEffect(() => {
    loadPraiseCharts();
    loadLinks();
  }, [loadPraiseCharts, loadLinks]);

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
          Available Downloads
        </Typography>
        <List sx={{ p: 0 }}>
          {products.map((p, i) => (
            <ListItem key={`${p.name}-${i}`} sx={{ px: 0, py: 0.5 }}>
              <ListItemButton
                onClick={() => download(p)}
                sx={{
                  borderRadius: 1,
                  "&:hover": { backgroundColor: "action.hover" },
                }}>
                <DownloadIcon sx={{ mr: 1, fontSize: 18, color: "primary.main" }} />
                <ListItemText
                  primary={p.name}
                  primaryTypographyProps={{
                    variant: "body2",
                    fontWeight: 500,
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
          External Links
        </Typography>
        <List sx={{ p: 0 }}>
          {links.map((l) => (
            <ListItem key={l.id} sx={{ px: 0, py: 0.5 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ width: "100%" }}>
                {canEdit && (
                  <IconButton size="small" onClick={() => setEditLink(l)} sx={{ color: "primary.main" }}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                )}
                <ListItemButton
                  component="a"
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  sx={{
                    borderRadius: 1,
                    flex: 1,
                    "&:hover": { backgroundColor: "action.hover" },
                  }}>
                  <LinkIcon sx={{ mr: 1, fontSize: 18, color: "secondary.main" }} />
                  <ListItemText
                    primary={l.text}
                    primaryTypographyProps={{
                      variant: "body2",
                      fontWeight: 500,
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

  const tabsComponent = useMemo(
    () =>
      keys.map((k) => (
        <Tab
          key={k.id}
          value={k.id}
          label={
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {k.shortDescription}
              </Typography>
              <Chip label={k.keySignature} size="small" variant="outlined" sx={{ fontSize: "0.75rem", height: 20 }} />
            </Stack>
          }
        />
      )),
    [keys]
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
      <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "var(--border-light)" }}>
        <CardContent>
          {/* Header */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <KeyIcon sx={{ color: "primary.main", fontSize: 24 }} />
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                {Locale.label("songs.keys.title") || "Keys & Downloads"}
              </Typography>
            </Stack>
            {selectedKey && canEdit && (
              <IconButton
                onClick={() => setEditKey(selectedKey)}
                sx={{
                  color: "primary.main",
                  "&:hover": { backgroundColor: "primary.light" },
                }}
                aria-label="Edit selected key">
                <EditIcon />
              </IconButton>
            )}
          </Stack>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
            <Tabs value={selectedKey?.id || ""} onChange={handleTabChange} variant="scrollable" scrollButtons="auto" aria-label="Keys tabs">
              {tabsComponent}
              {canEdit && (
                <Tab
                  value="add"
                  label={
                    <Stack direction="row" spacing={1} alignItems="center">
                      <AddIcon fontSize="small" />
                      <Typography variant="body2">{Locale.label("songs.keys.add") || "Add Key"}</Typography>
                    </Stack>
                  }
                />
              )}
            </Tabs>
          </Box>

          {/* Content */}
          {selectedKey ? (
            <Box>
              {/* Products and Links */}
              {productsList}
              {linksList}

              {/* Add Files Button */}
              {canEdit && (
                <Box
                  sx={{
                    mt: 3,
                    pt: 2,
                    borderTop: "1px solid",
                    borderColor: "var(--border-light)",
                  }}>
                  <Button
                    id="addBtnGroup"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={handleClick}
                    sx={{
                      borderStyle: "dashed",
                      color: "primary.main",
                      borderColor: "primary.main",
                      "&:hover": { backgroundColor: "primary.light" },
                    }}>
                    {Locale.label("songs.keys.addFiles") || "Add Files"}
                  </Button>
                </Box>
              )}
            </Box>
          ) : (
            <Paper
              sx={{
                p: 3,
                textAlign: "center",
                backgroundColor: "var(--bg-sub)",
                border: "1px dashed",
                borderColor: "var(--border-main)",
              }}>
              <KeyIcon sx={{ fontSize: 48, color: "text.secondary", mb: 1 }} />
              <Typography variant="body2" color="text.secondary">
                No keys available. Add a key to get started.
              </Typography>
            </Paper>
          )}
        </CardContent>
      </Card>

      {/* Menu */}
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
              category: "arrangementKey_" + selectedKey.id,
              linkType: "url",
              sort: 1,
              linkData: "",
              icon: "",
            });
          }}>
          <LinkIcon sx={{ mr: 2, color: "secondary.main" }} />
          {Locale.label("songs.keys.addExternalLink") || "Add External Link"}
        </MenuItem>
      </Menu>

      {/* Dialogs */}
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
          praiseChartsId={props.songDetail?.praiseChartsId}
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
