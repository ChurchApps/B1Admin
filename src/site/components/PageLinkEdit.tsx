import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Alert, Box, Button, Checkbox, CircularProgress, Dialog, FormControl, FormControlLabel, FormGroup, Grid, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import { ApiHelper, UserHelper, SlugHelper, Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { FormCard } from "../../components/ui";
import { useConfirmDelete, useErrorSummary } from "../../hooks";
import { Permissions } from "@churchapps/helpers";
import type { LinkInterface, GroupInterface } from "@churchapps/helpers";
import type { PageInterface } from "../../helpers/Interfaces";
import { WEBSITE_ELEMENT_TYPES, extractPageText } from "../admin/websiteContent";
import EditIcon from "@mui/icons-material/Edit";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";

type Props = {
  page: PageInterface;
  link?: LinkInterface;
  embedded?: boolean;
  updatedCallback: (page: PageInterface | null, link: LinkInterface | null) => void;
  onDone: () => void;
};

type AnyRecord = Record<string, any>;

export function PageLinkEdit(props: Props) {
  "use no memo"; // compiler caches register() results, breaking RHF field re-registration after reset()
  const [checked, setChecked] = useState<boolean>(false);
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [groupIdsJson, setGroupIdsJson] = useState<string>("");
  const [metaGenerating, setMetaGenerating] = useState<boolean>(false);
  const [metaError, setMetaError] = useState<string>("");

  const { control, register, handleSubmit, reset, setValue, setError, watch, formState } = useForm<AnyRecord>({ defaultValues: { title: "", url: "", layout: "", linkText: "", linkUrl: "", visibility: "everyone", metaDescription: "" } });
  const visibility = watch("visibility");
  const metaDescription = watch("metaDescription") || "";
  const e = formState.errors as any;
  const summaryErrors = useErrorSummary(formState.errors, ["url", "title", "root", "_checkUrl"]);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const handleCancel = () => props.updatedCallback(props.page, props.link || null);

  const onValid = async (values: AnyRecord) => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) {
      setError("root", { message: Locale.label("site.pageLinkEdit.unauthorizedCreate") });
      return;
    }
    if (!checked) {
      setError("_checkUrl", { message: Locale.label("site.pageLinkEdit.errCheckUrl") });
      return;
    }

    let pageData = (props.page ? { ...props.page, title: values.title, url: values.url, layout: values.layout, visibility: values.visibility, metaDescription: values.metaDescription || null, groupIds: values.visibility === "groups" ? (groupIdsJson || null) : null } : null) as PageInterface | null;
    let linkData = props.link ? { ...props.link, text: values.linkText, url: values.linkUrl || values.url } : null;

    if (pageData) { [pageData] = await ApiHelper.post("/pages", [pageData], "ContentApi"); }
    if (linkData) { [linkData] = await ApiHelper.post("/links", [linkData], "ContentApi"); }

    props.updatedCallback(pageData, linkData);
  };

  const handleDelete = async () => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) {
      setError("root", { message: Locale.label("site.pageLinkEdit.unauthorizedDelete") });
      return;
    }
    if (props.page) {
      if (await confirm(Locale.label("site.pageLink.confirmDelete"))) {
        ApiHelper.delete("/pages/" + props.page.id?.toString(), "ContentApi").then(() => {
          if (props.link) {
            ApiHelper.delete("/links/" + props.link.id?.toString(), "ContentApi").then(() => props.updatedCallback(null, null));
          } else {
            props.updatedCallback(null, props.link || null);
          }
        });
      }
    } else {
      if (props.link) {
        ApiHelper.delete("/links/" + props.link.id?.toString(), "ContentApi").then(() => props.updatedCallback(null, null));
      }
    }
  };

  const handleSlugValidation = () => {
    const currentUrl = watch("url") || "";
    const slugged = SlugHelper.slugifyString(currentUrl, "urlPath");
    setValue("url", slugged);
    setChecked(true);
  };

  const handleDuplicate = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (await confirm(Locale.label("site.pageLink.confirmDuplicate"), { destructive: false, confirmLabel: Locale.label("common.confirm", "Confirm") })) {
      ApiHelper.post("/pages/duplicate/" + props.page?.id, {}, "ContentApi").then((data: any) => {
        props.updatedCallback(data, props.link || null);
      });
    }
  };

  const handleGenerateMeta = async () => {
    if (!props.page?.id) return;
    setMetaError("");
    setMetaGenerating(true);
    try {
      const tree = await ApiHelper.get("/pages/" + UserHelper.currentUserChurch.church.id + "/tree?id=" + props.page.id, "ContentApi");
      const pageContentText = extractPageText(tree?.sections || []);
      if (!pageContentText || pageContentText.trim().length < 10) {
        setMetaError(Locale.label("site.pageLinkEdit.metaNoContent"));
        return;
      }
      const result = await ApiHelper.post("/website/generateMetaDescription", {
        pageTitle: watch("title") || props.page.title || "",
        pageContentText,
        churchName: UserHelper.currentUserChurch.church.name,
        availableElementTypes: WEBSITE_ELEMENT_TYPES
      }, "AskApi");
      if (result?.metaDescription) setValue("metaDescription", result.metaDescription, { shouldDirty: true });
      else setMetaError(Locale.label("site.pageLinkEdit.metaGenerateFailed"));
    } catch {
      setMetaError(Locale.label("site.pageLinkEdit.metaGenerateFailed"));
    } finally {
      setMetaGenerating(false);
    }
  };

  const handleGroupChange = (groupId: string, isChecked: boolean) => {
    let ids: string[] = groupIdsJson ? JSON.parse(groupIdsJson) : [];
    if (isChecked) { if (!ids.includes(groupId)) ids.push(groupId); } else ids = ids.filter((id) => id !== groupId);
    setGroupIdsJson(ids.length > 0 ? JSON.stringify(ids) : "");
  };

  const getSelectedGroupIds = (): string[] => {
    if (!groupIdsJson) return [];
    try { return JSON.parse(groupIdsJson); } catch { return []; }
  };

  useEffect(() => {
    reset({
      title: props.page?.title || "",
      url: props.page?.url || "",
      layout: props.page?.layout || "",
      linkText: props.link?.text || "",
      linkUrl: props.link?.url || "",
      visibility: props.page?.visibility || "everyone",
      metaDescription: props.page?.metaDescription || ""
    });
    setGroupIdsJson(props.page?.groupIds || "");
    setChecked(!!props.page?.url);
  }, [props.page, props.link, reset]);

  useEffect(() => {
    if (props.page) ApiHelper.get("/groups", "MembershipApi").then((data: GroupInterface[]) => setGroups(data || []));
  }, [props.page]);

  const urlValue = watch("url");

  if (!props.page && !props.link) return <></>;
  return (
    <Dialog open={true} onClose={props.onDone} style={{ minWidth: 800 }}>
      {ConfirmDialogElement}
      <FormCard
        id="pageDetailsBox"
        title={props.page ? Locale.label("site.pageLink.pageSettings") : Locale.label("site.pageLink.linkSettings")}
        icon="article"
        onSave={handleSubmit(onValid)}
        onCancel={handleCancel}
        onDelete={handleDelete}
        elevation={0}

        headerActions={
          props.page?.id && (
            <a href="about:blank" onClick={handleDuplicate}>
              {Locale.label("site.pageLinkEdit.duplicate")}
            </a>
          )
        }
      >
        {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
        <Grid container spacing={2} style={{ minWidth: 500 }}>
          {props.page && <Grid size={{ xs: 6 }}>
            <TextField size="small" fullWidth label={Locale.label("site.pageLinkEdit.pageTitle")} placeholder={Locale.label("placeholders.page.title")} error={!!e.title} helperText={e.title?.message} {...register("title", { required: Locale.label("site.pageLinkEdit.errTitle") })} name="title" />
          </Grid>}
          {props.link && <Grid size={{ xs: 6 }}>
            <TextField size="small" fullWidth label={Locale.label("site.pageLinkEdit.linkText")} placeholder={Locale.label("placeholders.page.linkText")} {...register("linkText")} name="linkText" />
          </Grid>}
          {props.page && <Grid size={{ xs: 6 }}>
            {!props.embedded && <FormControl fullWidth size="small">
              <InputLabel>{Locale.label("site.pageLinkEdit.layout")}</InputLabel>
              <Controller name="layout" control={control} render={({ field }) => (
                <Select {...field} size="small" fullWidth label={Locale.label("site.pageLinkEdit.layout")}>
                  <MenuItem value="headerFooter">{Locale.label("site.pageLinkEdit.headerFooter")}</MenuItem>
                  <MenuItem value="cleanCentered">{Locale.label("site.pageLinkEdit.cleanCentered")}</MenuItem>
                </Select>
              )} />
            </FormControl>}
          </Grid>}
          {props.page && <Grid size={{ xs: 6 }}>
            {checked
              ? (<div style={{ marginTop: "5px", paddingLeft: "4px" }}>
                <Paper elevation={0}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between">
                    <Typography>{urlValue}</Typography>
                    <AppIconButton label={Locale.label("common.edit")} icon={<EditIcon />} tone="card" onClick={() => setChecked(false)} />
                  </Stack>
                </Paper>
              </div>)
              : (<TextField size="small" fullWidth label={Locale.label("site.pageLinkEdit.urlPath")} placeholder={Locale.label("placeholders.page.urlPath")} helperText={Locale.label("site.pageLink.urlHelper")} InputProps={{ endAdornment: (<Button variant="contained" color="primary" size="small" onClick={handleSlugValidation}>{Locale.label("site.pageLink.check")}</Button>) }} error={!!e.url} {...register("url", { required: Locale.label("site.pageLinkEdit.errPath") })} name="url" />)
            }
          </Grid>}
          {!props.page && props.link && <Grid size={{ xs: 6 }}>
            <TextField size="small" fullWidth label={Locale.label("site.pageLinkEdit.url")} placeholder={Locale.label("placeholders.page.linkUrl")} {...register("linkUrl")} name="linkUrl" />
          </Grid>}
          {props.page && <Grid size={{ xs: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>{Locale.label("site.pageLinkEdit.visibility")}</InputLabel>
              <Controller name="visibility" control={control} render={({ field }) => (
                <Select {...field} size="small" fullWidth label={Locale.label("site.pageLinkEdit.visibility")} data-testid="page-visibility-select">
                  <MenuItem value="everyone">{Locale.label("site.pageLinkEdit.everyone")}</MenuItem>
                  <MenuItem value="visitors">{Locale.label("site.pageLinkEdit.loggedInUsers")}</MenuItem>
                  <MenuItem value="members">{Locale.label("site.pageLinkEdit.membersStaff")}</MenuItem>
                  <MenuItem value="staff">{Locale.label("site.pageLinkEdit.staffOnly")}</MenuItem>
                  <MenuItem value="team">{Locale.label("site.pageLinkEdit.team")}</MenuItem>
                  <MenuItem value="groups">{Locale.label("site.pageLinkEdit.groups")}</MenuItem>
                </Select>
              )} />
            </FormControl>
          </Grid>}
          {props.page && visibility === "groups" && <Grid size={{ xs: 12 }}>
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 1, p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>{Locale.label("site.pageLinkEdit.selectGroups")}</Typography>
              <FormGroup>
                {groups.map((group) => (
                  <FormControlLabel key={group.id} control={<Checkbox checked={getSelectedGroupIds().includes(group.id || "")} onChange={(ev) => handleGroupChange(group.id || "", ev.target.checked)} />} label={group.name} />
                ))}
              </FormGroup>
              {groups.length === 0 && <Typography variant="body2" color="text.secondary">{Locale.label("site.pageLinkEdit.noGroupsFound")}</Typography>}
            </Box>
          </Grid>}
          {props.page && <Grid size={{ xs: 12 }}>
            <TextField
              size="small"
              fullWidth
              multiline
              minRows={2}
              label={Locale.label("site.pageLinkEdit.metaDescription")}
              placeholder={Locale.label("site.pageLinkEdit.metaDescriptionPlaceholder")}
              helperText={`${metaDescription.length}/155 · ${Locale.label("site.pageLinkEdit.metaDescriptionHelper")}`}
              inputProps={{ maxLength: 300 }}
              error={metaDescription.length > 165}
              {...register("metaDescription")}
              name="metaDescription"
            />
            {metaError && <Typography variant="body2" color="error" sx={{ mt: 0.5 }}>{metaError}</Typography>}
            {props.page?.id && (
              <Button
                size="small"
                startIcon={metaGenerating ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
                onClick={handleGenerateMeta}
                disabled={metaGenerating}
                data-testid="generate-meta-button"
                sx={{ mt: 0.5, textTransform: "none" }}
              >
                {Locale.label("site.pageLinkEdit.generateMeta")}
              </Button>
            )}
          </Grid>}
        </Grid>
      </FormCard>
    </Dialog>
  );
}
