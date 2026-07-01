import { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Alert, Button, Dialog, FormControl, Grid, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from "@mui/material";
import { ApiHelper, UserHelper, SlugHelper, Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { FormCard } from "../../components/ui";
import { Permissions } from "@churchapps/helpers";
import type { LinkInterface } from "@churchapps/helpers";
import type { PageInterface } from "../../helpers/Interfaces";
import EditIcon from "@mui/icons-material/Edit";

type Props = {
  page: PageInterface;
  link?: LinkInterface;
  embedded?: boolean;
  updatedCallback: (page: PageInterface | null, link: LinkInterface | null) => void;
  onDone: () => void;
};

type AnyRecord = Record<string, any>;

export function PageLinkEdit(props: Props) {
  const [checked, setChecked] = useState<boolean>(false);

  const { control, register, handleSubmit, reset, setValue, setError, watch, formState } = useForm<AnyRecord>({ defaultValues: { title: "", url: "", layout: "", linkText: "", linkUrl: "" } });
  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.url?.message) summaryErrors.push(e.url.message);
  if (e.title?.message) summaryErrors.push(e.title.message);
  if (e.root?.message) summaryErrors.push(e.root.message);
  if (e._checkUrl?.message) summaryErrors.push(e._checkUrl.message);

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

    let pageData = props.page ? { ...props.page, title: values.title, url: values.url, layout: values.layout } : null;
    let linkData = props.link ? { ...props.link, text: values.linkText, url: values.linkUrl || values.url } : null;

    if (pageData) { [pageData] = await ApiHelper.post("/pages", [pageData], "ContentApi"); }
    if (linkData) { [linkData] = await ApiHelper.post("/links", [linkData], "ContentApi"); }

    props.updatedCallback(pageData, linkData);
  };

  const handleDelete = () => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) {
      setError("root", { message: Locale.label("site.pageLinkEdit.unauthorizedDelete") });
      return;
    }
    if (props.page) {
      if (window.confirm(Locale.label("site.pageLink.confirmDelete"))) {
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

  const handleDuplicate = (e: React.MouseEvent) => {
    e.preventDefault();
    if (confirm(Locale.label("site.pageLink.confirmDuplicate"))) {
      ApiHelper.post("/pages/duplicate/" + props.page?.id, {}, "ContentApi").then((data: any) => {
        props.updatedCallback(data, props.link || null);
      });
    }
  };

  useEffect(() => {
    reset({
      title: props.page?.title || "",
      url: props.page?.url || "",
      layout: props.page?.layout || "",
      linkText: props.link?.text || "",
      linkUrl: props.link?.url || ""
    });
    setChecked(!!props.page?.url);
  }, [props.page, props.link, reset]);

  const urlValue = watch("url");

  if (!props.page && !props.link) return <></>;
  return (
    <Dialog open={true} onClose={props.onDone} style={{ minWidth: 800 }}>
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
        </Grid>
      </FormCard>
    </Dialog>
  );
}
