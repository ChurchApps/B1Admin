import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Stack,
  TextField,
  FormControl,
  Icon,
  InputLabel,
  Select,
  MenuItem,
  Dialog,
  type SelectChangeEvent,
  Box,
  Divider,
  IconButton,
  Grid,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Typography
} from "@mui/material";
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from "@mui/icons-material";
import type { LinkInterface, GroupInterface } from "@churchapps/helpers";
import { IconPicker } from "../../components/iconPicker";
import { ApiHelper, UniqueIdHelper, ArrayHelper, Locale, GalleryModal } from "@churchapps/apphelper";
import { CardWithHeader, LoadingButton } from "../../components/ui";

interface PageInterface {
  id?: string;
  churchId?: string;
  url?: string;
  title?: string;
}

interface Props {
  currentTab: LinkInterface;
  updatedFunction?: () => void;
}

export function AppEdit({ currentTab: currentTabFromProps, updatedFunction = () => {} }: Props) {
  const [currentTab, setCurrentTab] = useState<LinkInterface>(null);
  const [pages, setPages] = useState<PageInterface[]>(null);
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState<boolean>(false);

  useEffect(() => {
    setCurrentTab(currentTabFromProps);
  }, [currentTabFromProps]);

  useEffect(() => {
    ApiHelper.get("/groups", "MembershipApi").then((data: GroupInterface[]) => setGroups(data || []));
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (currentTab.linkType !== "url" && currentTab.linkType !== "page") currentTab.url = "";
      await ApiHelper.post("/links", [currentTab], "ContentApi");
      updatedFunction();
    } catch (error) {
      console.error("Error saving tab:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    const val = e.target.value;
    const t = { ...currentTab };
    switch (e.target.name) {
      case "text": t.text = val; break;
      case "type": t.linkType = val; break;
      case "page": t.linkData = val; t.url = ArrayHelper.getOne(pages, "id", val).url; break;
      case "url": t.url = val; break;
      case "visibility":
        (t as any).visibility = val;
        if (val !== "groups") (t as any).groupIds = null;
        break;
    }
    setCurrentTab(t);
  };

  const handleGroupChange = (groupId: string, checked: boolean) => {
    const t = { ...currentTab } as any;
    let groupIds: string[] = t.groupIds ? JSON.parse(t.groupIds) : [];
    if (checked) {
      if (!groupIds.includes(groupId)) groupIds.push(groupId);
    } else {
      groupIds = groupIds.filter(id => id !== groupId);
    }
    t.groupIds = groupIds.length > 0 ? JSON.stringify(groupIds) : null;
    setCurrentTab(t);
  };

  const getSelectedGroupIds = (): string[] => {
    const groupIds = (currentTab as any)?.groupIds;
    if (!groupIds) return [];
    try {
      return JSON.parse(groupIds);
    } catch {
      return [];
    }
  };

  const onSelect = useCallback((iconName: string) => {
    const t = { ...currentTab };
    t.icon = iconName;
    setCurrentTab(t);
    setIsModalOpen(false);
  }, [currentTab]);

  const handleDelete = () => {
    if (window.confirm(Locale.label("settings.app.confirmDeleteTab"))) {
      ApiHelper.delete("/links/" + currentTab.id, "ContentApi").then(() => {
        setCurrentTab(null);
        updatedFunction();
      });
    }
  };

  const handlePhotoSelected = (image: string) => {
    const t = { ...currentTab };
    (t as any).photo = image;
    setCurrentTab(t);
    setShowPhotoGallery(false);
  };

  const loadPages = () => {
    ApiHelper.get("/pages", "ContentApi").then((_pages: PageInterface[]) => {
      const filteredPages: PageInterface[] = [];
      _pages.forEach(p => { if (p.url.startsWith("/member")) filteredPages.push(p); });
      setPages(filteredPages || []);
    });
  };

  const getPage = () => {
    if (currentTab?.linkType === "page") {
      let options: React.ReactElement[] = [];
      if (pages === null) loadPages();
      else {
        options = [];
        pages.forEach(page => {
          options.push(<MenuItem value={page.id} key={page.id}>{page.title}</MenuItem>);
        });
        if (currentTab.linkData === "") currentTab.linkData = pages[0]?.url;
      }
      return (
        <FormControl fullWidth>
          <InputLabel id="page">{Locale.label("settings.appEdit.page")}</InputLabel>
          <Select labelId="page" label={Locale.label("settings.appEdit.page")} name="page" value={currentTab?.linkData} onChange={handleChange} data-testid="page-select">
            {options}
          </Select>
        </FormControl>
      );
    } else return null;
  };

  if (!currentTab) return null;

  return (
    <>
      <CardWithHeader
        title={UniqueIdHelper.isMissing(currentTab?.id) ? Locale.label("settings.appEdit.addTab") : Locale.label("settings.appEdit.editTab")}
        icon={<EditIcon />}
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={updatedFunction}
              size="small"
              sx={{ textTransform: 'none' }}
            >
              {Locale.label("common.cancel")}
            </Button>
            <LoadingButton
              loading={isSaving}
              loadingText={Locale.label("settings.appEdit.saving")}
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              size="small"
              sx={{ textTransform: 'none' }}
            >
              {Locale.label("settings.appEdit.saveTab")}
            </LoadingButton>
          </Stack>
        }
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Stack spacing={3}>
              {/* Tab Name and Icon */}
              <TextField
                fullWidth
                label={Locale.label("settings.appEdit.tabName")}
                name="text"
                value={currentTab?.text || ""}
                onChange={handleChange}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      onClick={() => setIsModalOpen(true)}
                      data-testid="icon-dropdown-button"
                      sx={{ color: 'primary.main' }}
                    >
                      <Icon>{currentTab?.icon}</Icon>
                    </IconButton>
                  )
                }}
                helperText={Locale.label("settings.app.tabNameHelper")}
              />

              {/* Tab Image */}
              <Box>
                {(currentTab as any)?.photo && (
                  <Box sx={{ mb: 2, maxWidth: 300 }}>
                    <img
                      src={(currentTab as any).photo}
                      style={{
                        width: "100%",
                        height: "auto",
                        aspectRatio: "16/9",
                        objectFit: "cover",
                        borderRadius: 4
                      }}
                      alt="Tab icon"
                    />
                  </Box>
                )}
                <Button
                  variant="outlined"
                  onClick={() => setShowPhotoGallery(true)}
                  sx={{ textTransform: 'none' }}
                >
                  {(currentTab as any)?.photo ? Locale.label("settings.appEdit.changeImage") : Locale.label("settings.appEdit.selectImage")}
                </Button>
              </Box>

              {/* Tab Type */}
              <FormControl fullWidth>
                <InputLabel id="type">{Locale.label("settings.appEdit.tabType")}</InputLabel>
                <Select
                  labelId="type"
                  label={Locale.label("settings.appEdit.tabType")}
                  name="type"
                  value={currentTab?.linkType || ""}
                  onChange={handleChange}
                >
                  <MenuItem value="bible">{Locale.label("settings.appEdit.bible")}</MenuItem>
                  <MenuItem value="stream">{Locale.label("settings.appEdit.liveStream")}</MenuItem>
                  <MenuItem value="votd">{Locale.label("settings.appEdit.verseOfDay")}</MenuItem>
                  <MenuItem value="checkin">{Locale.label("settings.appEdit.checkin")}</MenuItem>
                  <MenuItem value="donation">{Locale.label("settings.appEdit.donation")}</MenuItem>
                  <MenuItem value="donationLanding">{Locale.label("settings.appEdit.donationLanding")}</MenuItem>
                  <MenuItem value="directory">{Locale.label("settings.appEdit.memberDirectory")}</MenuItem>
                  <MenuItem value="groups">{Locale.label("settings.appEdit.myGroups")}</MenuItem>
                  <MenuItem value="lessons">{Locale.label("settings.appEdit.lessons")}</MenuItem>
                  <MenuItem value="url">{Locale.label("settings.appEdit.externalUrl")}</MenuItem>
                  <MenuItem value="page">{Locale.label("settings.appEdit.internalPage")}</MenuItem>
                </Select>
              </FormControl>

              {/* URL Field */}
              {currentTab?.linkType === "url" && (
                <TextField
                  fullWidth
                  label={Locale.label("settings.appEdit.url")}
                  name="url"
                  type="url"
                  value={currentTab?.url || ""}
                  onChange={handleChange}
                  helperText={Locale.label("settings.app.urlHelper")}
                />
              )}

              {/* Page Selection */}
              {getPage()}

              {/* Visibility */}
              <FormControl fullWidth>
                <InputLabel id="visibility">Visibility</InputLabel>
                <Select
                  labelId="visibility"
                  label="Visibility"
                  name="visibility"
                  value={(currentTab as any)?.visibility || "everyone"}
                  onChange={handleChange}
                >
                  <MenuItem value="everyone">Everyone (including anonymous)</MenuItem>
                  <MenuItem value="visitors">Logged-in Users</MenuItem>
                  <MenuItem value="members">Members & Staff</MenuItem>
                  <MenuItem value="staff">Staff Only</MenuItem>
                  <MenuItem value="team">Team Members (serving teams)</MenuItem>
                  <MenuItem value="groups">Specific Groups...</MenuItem>
                </Select>
              </FormControl>

              {/* Group Selection */}
              {(currentTab as any)?.visibility === "groups" && (
                <Box sx={{ pl: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>Select Groups:</Typography>
                  <FormGroup>
                    {groups.map(group => (
                      <FormControlLabel
                        key={group.id}
                        control={
                          <Checkbox
                            checked={getSelectedGroupIds().includes(group.id)}
                            onChange={(e) => handleGroupChange(group.id, e.target.checked)}
                          />
                        }
                        label={group.name}
                      />
                    ))}
                  </FormGroup>
                  {groups.length === 0 && (
                    <Typography variant="body2" color="text.secondary">No groups found</Typography>
                  )}
                </Box>
              )}

              {/* Delete Action */}
              {!UniqueIdHelper.isMissing(currentTab?.id) && (
                <>
                  <Divider sx={{ mt: 2 }} />
                  <Box sx={{ textAlign: 'center' }}>
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<DeleteIcon />}
                      onClick={handleDelete}
                      size="small"
                      sx={{ textTransform: 'none' }}
                    >
                      {Locale.label("settings.appEdit.deleteTab")}
                    </Button>
                  </Box>
                </>
              )}
            </Stack>
          </Grid>
        </Grid>
      </CardWithHeader>

      {/* Icon Picker Modal */}
      {isModalOpen && (
        <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
          <IconPicker currentIcon={currentTab?.icon} onUpdate={onSelect} onClose={() => setIsModalOpen(false)} />
        </Dialog>
      )}

      {/* Photo Gallery Modal */}
      {showPhotoGallery && (
        <GalleryModal
          onClose={() => setShowPhotoGallery(false)}
          onSelect={handlePhotoSelected}
          aspectRatio={16 / 9}
        />
      )}
    </>
  );
}
