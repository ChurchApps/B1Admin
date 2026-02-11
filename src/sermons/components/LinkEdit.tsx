import React, { useState } from "react";
import {
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Box,
  Card,
  CardContent,
  Button,
  Icon,
  IconButton
} from "@mui/material";
import { Close as CloseIcon, Save as SaveIcon, Delete as DeleteIcon, Link as LinkIcon } from "@mui/icons-material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { ErrorMessages } from "@churchapps/apphelper";
import { UserHelper } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/helpers";
import type { LinkInterface } from "@churchapps/helpers";

interface Props {
  currentLink: LinkInterface,
  updatedFunction?: () => void,
  links: LinkInterface[],
}

export const LinkEdit: React.FC<Props> = (props) => {
  const [currentLink, setCurrentLink] = useState<LinkInterface>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [links, setLinks] = useState<LinkInterface[]>(null);
  const [subName, setSubName] = useState<string>(null);
  const [toggleSubName, setToggleSubName] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);

  const filteredGroupLinks = links && links.filter((link) => link.id !== currentLink.id);

  const handleDelete = async () => {
    setIsLoading(true);
    const errors: string[] = [];
    let i = 0;
    links.forEach(link => {
      if (currentLink.id === link.parentId) { i++; }
    });

    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) errors.push(Locale.label("sermons.liveStreamTimes.linkEdit.errors.unauthorizedDelete"));
    if (i > 0) errors.push(Locale.label("sermons.liveStreamTimes.linkEdit.errors.deleteNestedFirst"));

    if (errors.length > 0) {
      setErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      await ApiHelper.delete("/links/" + currentLink.id, "ContentApi");
      setCurrentLink(null);
      props.updatedFunction();
    } catch {
      setErrors([Locale.label("sermons.liveStreamTimes.linkEdit.errors.deleteFailed")]);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.currentTarget.value;
    const l = { ...currentLink };
    switch (e.currentTarget.name) {
      case "text": l.text = val; break;
      case "url": l.url = val; break;
    }
    setCurrentLink(l);
  };

  const toggleChange = (e: React.MouseEvent<HTMLElement>, val: string | null) => {
    setSubName(e?.currentTarget?.innerText);
    const l = { ...currentLink };
    l.parentId = val;
    setCurrentLink(l);
  };

  const handleSave = async () => {
    setIsLoading(true);
    const errors: string[] = [];
    if (!currentLink.text.trim()) errors.push(Locale.label("sermons.liveStreamTimes.linkEdit.errors.textRequired"));
    if (!currentLink.url.trim()) errors.push(Locale.label("sermons.liveStreamTimes.linkEdit.errors.urlRequired"));
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) errors.push(Locale.label("sermons.liveStreamTimes.linkEdit.errors.unauthorized"));

    if (errors.length > 0) {
      setErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      await ApiHelper.post("/links", [currentLink], "ContentApi");
      props.updatedFunction();
    } catch {
      setErrors([Locale.label("sermons.liveStreamTimes.linkEdit.errors.saveFailed")]);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => { setCurrentLink(props.currentLink); }, [props.currentLink]);
  React.useEffect(() => { setLinks(props.links); }, [props.links]);

  if (!currentLink) return <></>;

  return (
    <>
      <Dialog
        open={true}
        onClose={() => props.updatedFunction()}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            minHeight: "400px"
          }
        }}
      >
        <DialogTitle sx={{
          backgroundColor: "#1976d2",
          color: "#FFF",
          p: 3
        }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  backgroundColor: "rgba(255,255,255,0.2)",
                  borderRadius: "12px",
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <LinkIcon sx={{ fontSize: 24, color: "#FFF" }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {currentLink?.id ? Locale.label("sermons.liveStreamTimes.linkEdit.editNavigationLink") : Locale.label("sermons.liveStreamTimes.linkEdit.createNewLink")}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>
                  {Locale.label("sermons.liveStreamTimes.linkEdit.configureSettings")}
                </Typography>
              </Box>
            </Stack>
            <IconButton
              onClick={() => props.updatedFunction()}
              sx={{ color: "#FFF" }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          <ErrorMessages errors={errors} />

          <Stack spacing={3} sx={{ mt: 2 }}>
            {/* Link Details Section */}
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Icon sx={{ color: "#1976d2", fontSize: 18 }}>edit</Icon>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#1976d2" }}>
                    {Locale.label("sermons.liveStreamTimes.linkEdit.linkDetails")}
                  </Typography>
                </Stack>

                <Stack spacing={2}>
                  <TextField
                    fullWidth
                    label={Locale.label("sermons.liveStreamTimes.linkEdit.displayText")}
                    name="text"
                    type="text"
                    value={currentLink?.text || ""}
                    onChange={handleChange}
                    data-testid="link-text-input"
                    aria-label="Link display text"
                    placeholder={Locale.label("sermons.liveStreamTimes.linkEdit.displayTextPlaceholder")}
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label={Locale.label("sermons.liveStreamTimes.linkEdit.linkUrl")}
                    name="url"
                    type="text"
                    value={currentLink?.url || ""}
                    onChange={handleChange}
                    data-testid="link-url-input"
                    aria-label="Link URL"
                    placeholder={Locale.label("sermons.liveStreamTimes.linkEdit.linkUrlPlaceholder")}
                    size="small"
                  />
                </Stack>
              </CardContent>
            </Card>

            {/* Submenu Configuration Section */}
            {filteredGroupLinks?.length > 0 && (
              <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                    <Icon sx={{ color: "#1976d2", fontSize: 18 }}>account_tree</Icon>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: "#1976d2" }}>
                      {Locale.label("sermons.liveStreamTimes.linkEdit.menuOrganization")}
                    </Typography>
                  </Stack>

                  <Stack spacing={2}>
                    <Box>
                      {subName && toggleSubName === true
                        ? (
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                            <Icon sx={{ fontSize: 16, color: "success.main" }}>check_circle</Icon>
                            <Typography variant="body2" color="success.main">
                              {Locale.label("sermons.liveStreamTimes.linkEdit.submenuMessage")} <strong>{subName}</strong>
                            </Typography>
                          </Stack>
                        )
                        : (
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                            <Icon sx={{ fontSize: 16, color: "text.secondary" }}>info</Icon>
                            <Typography variant="body2" color="text.secondary">
                              {Locale.label("sermons.liveStreamTimes.linkEdit.optionalSubmenuMessage")}
                            </Typography>
                          </Stack>
                        )}
                    </Box>

                    <Box>
                      <ToggleButtonGroup
                        exclusive
                        value={currentLink?.parentId}
                        onChange={toggleChange}
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 1
                        }}
                      >
                        {filteredGroupLinks.map((link: LinkInterface) => (
                          <ToggleButton
                            key={link.id}
                            value={link.id}
                            size="small"
                            color="primary"
                            onClick={() => setToggleSubName(!toggleSubName)}
                            data-testid={`submenu-toggle-${link.id}`}
                            aria-label={`Set as submenu under ${link.text}`}
                            sx={{
                              borderRadius: 1,
                              textTransform: "none",
                              fontWeight: 500,
                              "&.Mui-selected": {
                                backgroundColor: "#1976d2",
                                color: "#FFF",
                                "&:hover": { backgroundColor: "#1565c0" }
                              }
                            }}
                          >
                            <Stack direction="row" alignItems="center" spacing={1}>
                              <Icon sx={{ fontSize: 16 }}>folder</Icon>
                              <Typography variant="body2">{link.text}</Typography>
                            </Stack>
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, backgroundColor: "grey.50" }}>
          <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
            {currentLink?.id && (
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialogOpen(true)}
                disabled={isLoading}
                sx={{
                  textTransform: "none",
                  fontWeight: 500
                }}
              >
                {Locale.label("sermons.liveStreamTimes.linkEdit.delete")}
              </Button>
            )}
            <Box sx={{ flex: 1 }} />
            <Button
              variant="outlined"
              onClick={() => props.updatedFunction()}
              disabled={isLoading}
              sx={{
                textTransform: "none",
                fontWeight: 500
              }}
            >
              {Locale.label("sermons.liveStreamTimes.linkEdit.cancel")}
            </Button>
            <Button
              variant="contained"
              startIcon={isLoading ? null : <SaveIcon />}
              onClick={handleSave}
              disabled={isLoading}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                minWidth: 100
              }}
            >
              {isLoading ? Locale.label("sermons.liveStreamTimes.linkEdit.saving") : Locale.label("sermons.liveStreamTimes.linkEdit.saveLink")}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Icon sx={{ color: "error.main" }}>warning</Icon>
            <Typography variant="h6">{Locale.label("sermons.liveStreamTimes.linkEdit.deleteLink")}</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography>
            {Locale.label("sermons.liveStreamTimes.linkEdit.deleteConfirm")}
          </Typography>
          {links?.some(link => link.parentId === currentLink.id) && (
            <Box sx={{ mt: 2, p: 2, backgroundColor: "warning.light", borderRadius: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Icon sx={{ color: "warning.main" }}>info</Icon>
                <Typography variant="body2" color="warning.dark">
                  {Locale.label("sermons.liveStreamTimes.linkEdit.deleteNestedLinksFirst")}
                </Typography>
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isLoading}
            sx={{ textTransform: "none" }}
          >
            {Locale.label("sermons.liveStreamTimes.linkEdit.cancel")}
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isLoading}
            sx={{ textTransform: "none" }}
          >
            {isLoading ? Locale.label("sermons.liveStreamTimes.linkEdit.deleting") : Locale.label("sermons.liveStreamTimes.linkEdit.delete")}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
