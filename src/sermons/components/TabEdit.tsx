import React, { useState } from "react";
import {
  FormControl,
  InputLabel,
  Select,
  TextField,
  MenuItem,
  Stack,
  Icon,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Card,
  CardContent,
  IconButton,
  type SelectChangeEvent
} from "@mui/material";
import { Close as CloseIcon, Delete as DeleteIcon, Save as SaveIcon } from "@mui/icons-material";
import { ErrorMessages, Locale } from "@churchapps/apphelper";
import { ApiHelper } from "@churchapps/apphelper";
import type { LinkInterface } from "@churchapps/helpers";
import { IconPicker } from "../../components/iconPicker";

interface Props { currentTab: LinkInterface, updatedFunction?: () => void }

export const TabEdit: React.FC<Props> = (props) => {
  const [currentTab, setCurrentTab] = useState<LinkInterface>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [iconPickerOpen, setIconPickerOpen] = React.useState(false);

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await ApiHelper.delete("/links/" + currentTab.id, "ContentApi");
      setCurrentTab(null);
      props.updatedFunction();
    } catch {
      setErrors([Locale.label("sermons.liveStreamTimes.tabEdit.errors.deleteFailed")]);
    } finally {
      setIsLoading(false);
      setDeleteDialogOpen(false);
    }
  };

  const handleIconUpdate = (icon: string) => {
    const t = { ...currentTab };
    t.icon = icon;
    setCurrentTab(t);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const val = e.target.value;
    const t = { ...currentTab };
    switch (e.target.name) {
      case "text": t.text = val; break;
      case "type": t.linkType = val; break;
      case "url": t.url = val; break;
    }
    setCurrentTab(t);
  };

  const handleSave = async () => {
    setIsLoading(true);
    const errors: string[] = [];

    if (!currentTab.text) errors.push(Locale.label("sermons.liveStreamTimes.tabEdit.errors.textRequired"));
    if (currentTab?.linkType === "url" && !currentTab.url) errors.push(Locale.label("sermons.liveStreamTimes.tabEdit.errors.urlRequired"));

    if (errors.length > 0) {
      setErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      if (currentTab.linkType !== "url") currentTab.url = "";
      await ApiHelper.post("/links", [currentTab], "ContentApi");
      props.updatedFunction();
    } catch {
      setErrors([Locale.label("sermons.liveStreamTimes.tabEdit.errors.saveFailed")]);
    } finally {
      setIsLoading(false);
    }
  };

  const getUrl = () => {
    if (currentTab?.linkType === "url") {
      return (
        <TextField
          fullWidth
          label={Locale.label("sermons.liveStreamTimes.tabEdit.externalUrl")}
          name="url"
          type="text"
          value={currentTab?.url || ""}
          onChange={handleChange}
          data-testid="tab-url-input"
          placeholder={Locale.label("sermons.liveStreamTimes.tabEdit.externalUrlPlaceholder")}
          size="small"
          sx={{ mt: 1 }}
        />
      );
    } else return null;
  };

  React.useEffect(() => { setCurrentTab(props.currentTab); }, [props.currentTab]);

  if (!currentTab) return <></>;

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
                <Icon sx={{ fontSize: 24, color: "#FFF" }}>folder</Icon>
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  {currentTab?.id ? Locale.label("sermons.liveStreamTimes.tabEdit.editTab") : Locale.label("sermons.liveStreamTimes.tabEdit.createNewTab")}
                </Typography>
                <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.9)" }}>
                  {Locale.label("sermons.liveStreamTimes.tabEdit.configureSettings")}
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
            {/* Tab Display Section */}
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Icon sx={{ color: "#1976d2", fontSize: 18 }}>visibility</Icon>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#1976d2" }}>
                    {Locale.label("sermons.liveStreamTimes.tabEdit.tabDisplay")}
                  </Typography>
                </Stack>

                <Stack direction="row" spacing={2} alignItems="start">
                  <Box sx={{ flex: 1 }}>
                    <TextField
                      fullWidth
                      label={Locale.label("sermons.liveStreamTimes.tabEdit.tabText")}
                      name="text"
                      type="text"
                      value={currentTab?.text || ""}
                      onChange={handleChange}
                      placeholder={Locale.label("sermons.liveStreamTimes.tabEdit.tabTextPlaceholder")}
                      size="small"
                      sx={{ mb: 2 }}
                    />
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "text.secondary", mb: 1, display: "block" }}>
                      {Locale.label("sermons.liveStreamTimes.tabEdit.icon")}
                    </Typography>
                    <Box
                      onClick={() => setIconPickerOpen(true)}
                      sx={{
                        minWidth: 60,
                        height: 40,
                        borderRadius: 1,
                        border: "1px solid",
                        borderColor: "grey.400",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#1976d2",
                        backgroundColor: "#fff",
                        cursor: "pointer",
                        "&:hover": {
                          borderColor: "#1976d2",
                          backgroundColor: "#f5f5f5"
                        }
                      }}
                    >
                      <Icon>{currentTab?.icon || "link"}</Icon>
                    </Box>
                  </Box>
                </Stack>
              </CardContent>
            </Card>

            {/* Link Configuration Section */}
            <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200" }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <Icon sx={{ color: "#1976d2", fontSize: 18 }}>settings</Icon>
                  <Typography variant="h6" sx={{ fontWeight: 600, color: "#1976d2" }}>
                    {Locale.label("sermons.liveStreamTimes.tabEdit.linkConfiguration")}
                  </Typography>
                </Stack>

                <Stack spacing={2}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="type">{Locale.label("sermons.liveStreamTimes.tabEdit.linkType")}</InputLabel>
                    <Select
                      labelId="type"
                      label={Locale.label("sermons.liveStreamTimes.tabEdit.linkType")}
                      name="type"
                      value={currentTab?.linkType || ""}
                      onChange={handleChange}
                    >
                      <MenuItem value="url">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Icon sx={{ fontSize: 18 }}>open_in_new</Icon>
                          <Typography>{Locale.label("sermons.liveStreamTimes.tabEdit.externalUrl")}</Typography>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="chat">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Icon sx={{ fontSize: 18 }}>chat</Icon>
                          <Typography>{Locale.label("sermons.liveStreamTimes.tabEdit.chat")}</Typography>
                        </Stack>
                      </MenuItem>
                      <MenuItem value="prayer">
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Icon sx={{ fontSize: 18 }}>favorite</Icon>
                          <Typography>{Locale.label("sermons.liveStreamTimes.tabEdit.prayer")}</Typography>
                        </Stack>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  {getUrl()}

                  {/* Link Type Helper */}
                  <Box sx={{ mt: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Icon sx={{ fontSize: 16, color: "text.secondary" }}>info</Icon>
                      <Typography variant="caption" color="text.secondary">
                        {currentTab?.linkType === "url" && Locale.label("sermons.liveStreamTimes.tabEdit.linkTypeHelp.url")}
                        {currentTab?.linkType === "chat" && Locale.label("sermons.liveStreamTimes.tabEdit.linkTypeHelp.chat")}
                        {currentTab?.linkType === "prayer" && Locale.label("sermons.liveStreamTimes.tabEdit.linkTypeHelp.prayer")}
                        {!currentTab?.linkType && Locale.label("sermons.liveStreamTimes.tabEdit.linkTypeHelp.none")}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 3, backgroundColor: "grey.50" }}>
          <Stack direction="row" spacing={2} sx={{ width: "100%" }}>
            {currentTab?.id && (
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
                {Locale.label("sermons.liveStreamTimes.tabEdit.delete")}
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
              {Locale.label("sermons.liveStreamTimes.tabEdit.cancel")}
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
              {isLoading ? Locale.label("sermons.liveStreamTimes.tabEdit.saving") : Locale.label("sermons.liveStreamTimes.tabEdit.saveTab")}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={2}>
            <Icon sx={{ color: "error.main" }}>warning</Icon>
            <Typography variant="h6">{Locale.label("sermons.liveStreamTimes.tabEdit.deleteTab")}</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Typography>
            {Locale.label("sermons.liveStreamTimes.tabEdit.deleteConfirm")}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={isLoading}
            sx={{ textTransform: "none" }}
          >
            {Locale.label("sermons.liveStreamTimes.tabEdit.cancel")}
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={isLoading}
            sx={{ textTransform: "none" }}
          >
            {isLoading ? Locale.label("sermons.liveStreamTimes.tabEdit.deleting") : Locale.label("sermons.liveStreamTimes.tabEdit.delete")}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Icon Picker Dialog */}
      {iconPickerOpen && (
        <IconPicker
          currentIcon={currentTab?.icon}
          onUpdate={handleIconUpdate}
          onClose={() => setIconPickerOpen(false)}
        />
      )}
    </>
  );
};
