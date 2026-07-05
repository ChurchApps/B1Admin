import { useEffect, useState, useCallback } from "react";
import { Button, Stack, TextField, FormControl, Icon, InputLabel, Select, MenuItem, Dialog, Box, Divider, Grid, Checkbox, FormControlLabel, FormGroup, Typography } from "@mui/material";
import { Save as SaveIcon, Cancel as CancelIcon, Delete as DeleteIcon, Edit as EditIcon } from "@mui/icons-material";
import { Controller, useForm } from "react-hook-form";
import type { LinkInterface, GroupInterface } from "@churchapps/helpers";
import { IconPicker } from "../../components/iconPicker";
import { ApiHelper, UniqueIdHelper, ArrayHelper, Locale } from "@churchapps/apphelper";
import { GalleryModal } from "../../components/gallery";
import { CardWithHeader, LoadingButton } from "../../components/ui";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { useConfirmDelete } from "../../hooks";

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

type AnyRecord = Record<string, any>;

export function AppEdit({ currentTab: currentTabFromProps, updatedFunction = () => {} }: Props) {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [icon, setIcon] = useState<string>("");
  const [photo, setPhoto] = useState<string>("");
  const [groupIdsJson, setGroupIdsJson] = useState<string>("");
  const [pages, setPages] = useState<PageInterface[]>(null);
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showPhotoGallery, setShowPhotoGallery] = useState<boolean>(false);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const { register, handleSubmit, reset, control, watch, setValue } = useForm<AnyRecord>({ defaultValues: { text: "", linkType: "", linkData: "", url: "", visibility: "everyone" } });
  const linkType = watch("linkType");
  const visibility = watch("visibility");

  useEffect(() => {
    if (currentTabFromProps) {
      reset({
        text: currentTabFromProps.text || "",
        linkType: currentTabFromProps.linkType || "",
        linkData: currentTabFromProps.linkData || "",
        url: currentTabFromProps.url || "",
        visibility: (currentTabFromProps as any).visibility || "everyone"
      });
      setIcon(currentTabFromProps.icon || "");
      setPhoto((currentTabFromProps as any).photo || "");
      setGroupIdsJson((currentTabFromProps as any).groupIds || "");
    }
  }, [currentTabFromProps, reset]);

  useEffect(() => {
    ApiHelper.get("/groups", "MembershipApi").then((data: GroupInterface[]) => setGroups(data || []));
  }, []);

  const onValid = async (values: AnyRecord) => {
    setIsSaving(true);
    try {
      const t: LinkInterface = { ...currentTabFromProps, text: values.text, linkType: values.linkType, linkData: values.linkData, url: values.url, icon };
      (t as any).visibility = values.visibility;
      (t as any).photo = photo;
      (t as any).groupIds = values.visibility === "groups" ? (groupIdsJson || null) : null;
      if (t.linkType !== "url" && t.linkType !== "page") t.url = "";
      await ApiHelper.post("/links", [t], "ContentApi");
      updatedFunction();
    } finally {
      setIsSaving(false);
    }
  };

  const handleGroupChange = (groupId: string, checked: boolean) => {
    let ids: string[] = groupIdsJson ? JSON.parse(groupIdsJson) : [];
    if (checked) { if (!ids.includes(groupId)) ids.push(groupId); } else ids = ids.filter(id => id !== groupId);
    setGroupIdsJson(ids.length > 0 ? JSON.stringify(ids) : "");
  };

  const getSelectedGroupIds = (): string[] => {
    if (!groupIdsJson) return [];
    try { return JSON.parse(groupIdsJson); } catch { return []; }
  };

  const onIconSelect = useCallback((iconName: string) => {
    setIcon(iconName);
    setIsModalOpen(false);
  }, []);

  const handleDelete = async () => {
    if (await confirm(Locale.label("settings.app.confirmDeleteTab"))) {
      ApiHelper.delete("/links/" + currentTabFromProps.id, "ContentApi").then(() => updatedFunction());
    }
  };

  const handlePhotoSelected = (image: string) => {
    setPhoto(image);
    setShowPhotoGallery(false);
  };

  const loadPages = useCallback(() => {
    ApiHelper.get("/pages", "ContentApi").then((_pages: PageInterface[]) => setPages(_pages || []));
  }, []);

  useEffect(() => {
    if (linkType === "page" && pages === null) loadPages();
  }, [linkType, pages, loadPages]);

  useEffect(() => {
    if (linkType === "page" && pages && pages.length > 0 && !watch("linkData")) {
      setValue("linkData", pages[0]?.id || "");
    }
  }, [linkType, pages, setValue, watch]);

  const onPageChange = (id: string) => {
    setValue("linkData", id);
    const page = ArrayHelper.getOne(pages, "id", id);
    if (page) setValue("url", page.url);
  };

  const getPage = () => {
    if (linkType !== "page") return null;
    return (
      <Controller
        control={control}
        name="linkData"
        render={({ field }) => (
          <FormControl fullWidth>
            <InputLabel id="page">{Locale.label("settings.appEdit.page")}</InputLabel>
            <Select labelId="page" label={Locale.label("settings.appEdit.page")} value={field.value || ""} onChange={(ev) => onPageChange(ev.target.value as string)} data-testid="page-select">
              {pages?.map(page => <MenuItem value={page.id} key={page.id}>{page.title}</MenuItem>)}
            </Select>
          </FormControl>
        )}
      />
    );
  };

  if (!currentTabFromProps) return null;

  return (
    <>
      {ConfirmDialogElement}
      <CardWithHeader
        title={UniqueIdHelper.isMissing(currentTabFromProps?.id) ? Locale.label("settings.appEdit.addTab") : Locale.label("settings.appEdit.editTab")}
        icon={<EditIcon />}
        actions={
          <Stack direction="row" spacing={1}>
            <Button variant="outlined" startIcon={<CancelIcon />} onClick={updatedFunction} size="small" sx={{ textTransform: "none" }}>{Locale.label("common.cancel")}</Button>
            <LoadingButton loading={isSaving} loadingText={Locale.label("settings.appEdit.saving")} variant="contained" startIcon={<SaveIcon />} onClick={handleSubmit(onValid)} size="small" sx={{ textTransform: "none" }}>{Locale.label("settings.appEdit.saveTab")}</LoadingButton>
          </Stack>
        }
      >
        <Grid container spacing={3}>
          <Grid size={{ xs: 12 }}>
            <Stack spacing={3}>
              <TextField
                fullWidth
                label={Locale.label("settings.appEdit.tabName")}
                {...register("text")}
                InputProps={{ endAdornment: (<AppIconButton label={Locale.label("common.change")} icon={<Icon>{icon}</Icon>} tone="card" onClick={() => setIsModalOpen(true)} data-testid="icon-dropdown-button" />) }}
                helperText={Locale.label("settings.app.tabNameHelper")}
              />

              <Box>
                {photo && (
                  <Box sx={{ mb: 2, maxWidth: 300 }}>
                    <img src={photo} style={{ width: "100%", height: "auto", aspectRatio: "16/9", objectFit: "cover", borderRadius: 4 }} alt={Locale.label("settings.appEdit.tabIconAlt")} />
                  </Box>
                )}
                <Button variant="outlined" onClick={() => setShowPhotoGallery(true)} sx={{ textTransform: "none" }}>
                  {photo ? Locale.label("settings.appEdit.changeImage") : Locale.label("settings.appEdit.selectImage")}
                </Button>
              </Box>

              <Controller
                control={control}
                name="linkType"
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel id="type">{Locale.label("settings.appEdit.tabType")}</InputLabel>
                    <Select {...field} labelId="type" label={Locale.label("settings.appEdit.tabType")}>
                      <MenuItem value="bible">{Locale.label("settings.appEdit.bible")}</MenuItem>
                      <MenuItem value="stream">{Locale.label("settings.appEdit.liveStream")}</MenuItem>
                      <MenuItem value="votd">{Locale.label("settings.appEdit.verseOfDay")}</MenuItem>
                      <MenuItem value="sermons">{Locale.label("settings.appEdit.sermons")}</MenuItem>
                      <MenuItem value="checkin">{Locale.label("settings.appEdit.checkin")}</MenuItem>
                      <MenuItem value="donation">{Locale.label("settings.appEdit.donation")}</MenuItem>
                      <MenuItem value="donationLanding">{Locale.label("settings.appEdit.donationLanding")}</MenuItem>
                      <MenuItem value="directory">{Locale.label("settings.appEdit.memberDirectory")}</MenuItem>
                      <MenuItem value="groups">{Locale.label("settings.appEdit.myGroups")}</MenuItem>
                      <MenuItem value="lessons">{Locale.label("settings.appEdit.lessons")}</MenuItem>
                      <MenuItem value="volunteer">{Locale.label("settings.appEdit.volunteerOpportunities")}</MenuItem>
                      <MenuItem value="plans">{Locale.label("settings.appEdit.plans")}</MenuItem>
                      <MenuItem value="url">{Locale.label("settings.appEdit.externalUrl")}</MenuItem>
                      <MenuItem value="page">{Locale.label("settings.appEdit.internalPage")}</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              {linkType === "url" && (
                <TextField fullWidth label={Locale.label("settings.appEdit.url")} type="url" helperText={Locale.label("settings.app.urlHelper")} {...register("url")} />
              )}

              {getPage()}

              <Controller
                control={control}
                name="visibility"
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel id="visibility">{Locale.label("settings.appEdit.visibility")}</InputLabel>
                    <Select {...field} labelId="visibility" label={Locale.label("settings.appEdit.visibility")}>
                      <MenuItem value="everyone">{Locale.label("settings.appEdit.everyone")}</MenuItem>
                      <MenuItem value="visitors">{Locale.label("settings.appEdit.loggedInUsers")}</MenuItem>
                      <MenuItem value="members">{Locale.label("settings.appEdit.membersStaff")}</MenuItem>
                      <MenuItem value="staff">{Locale.label("settings.appEdit.staffOnly")}</MenuItem>
                      <MenuItem value="team">{Locale.label("settings.appEdit.team")}</MenuItem>
                      <MenuItem value="groups">{Locale.label("settings.appEdit.groups")}</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              {visibility === "groups" && (
                <Box sx={{ pl: 2, border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
                  <Typography variant="subtitle2" sx={{ mb: 1 }}>{Locale.label("settings.appEdit.selectGroups")}</Typography>
                  <FormGroup>
                    {groups.map(group => (
                      <FormControlLabel key={group.id} control={<Checkbox checked={getSelectedGroupIds().includes(group.id)} onChange={(ev) => handleGroupChange(group.id, ev.target.checked)} />} label={group.name} />
                    ))}
                  </FormGroup>
                  {groups.length === 0 && (
                    <Typography variant="body2" color="text.secondary">{Locale.label("settings.appEdit.noGroupsFound")}</Typography>
                  )}
                </Box>
              )}

              {!UniqueIdHelper.isMissing(currentTabFromProps?.id) && (
                <>
                  <Divider sx={{ mt: 2 }} />
                  <Box sx={{ textAlign: "center" }}>
                    <Button variant="outlined" startIcon={<DeleteIcon />} onClick={handleDelete} size="small" sx={{ textTransform: "none" }}>{Locale.label("settings.appEdit.deleteTab")}</Button>
                  </Box>
                </>
              )}
            </Stack>
          </Grid>
        </Grid>
      </CardWithHeader>

      {isModalOpen && (
        <Dialog open={isModalOpen} onClose={() => setIsModalOpen(false)} maxWidth="md" fullWidth>
          <IconPicker currentIcon={icon} onUpdate={onIconSelect} onClose={() => setIsModalOpen(false)} />
        </Dialog>
      )}

      {showPhotoGallery && (
        <GalleryModal onClose={() => setShowPhotoGallery(false)} onSelect={handlePhotoSelected} aspectRatio={16 / 9} />
      )}
    </>
  );
}
