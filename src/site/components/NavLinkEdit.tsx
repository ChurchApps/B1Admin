import { useState, useEffect, SyntheticEvent } from "react";
import { useForm, Controller } from "react-hook-form";
import { Alert, Autocomplete, Dialog, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import { InputBox, ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/helpers";
import type { LinkInterface } from "@churchapps/helpers";
import { PageHelper } from "../../helpers";
import type { PageLink } from "../../helpers";

type Props = {
  link: LinkInterface;
  embedded?: boolean;
  updatedCallback: (link: LinkInterface | null) => void;
  onDone: () => void;
};

type AnyRecord = Record<string, any>;

export function NavLinkEdit(props: Props) {
  const [pageTree, setPageTree] = useState<PageLink[]>([]);
  const [allLinks, setAllLinks] = useState<LinkInterface[]>([]);

  const { control, register, handleSubmit, reset, setError, formState } = useForm<AnyRecord>({ defaultValues: { linkText: "", url: "", parentId: "" } });
  const e = formState.errors as any;
  const summaryErrors: string[] = [];
  if (e.linkText?.message) summaryErrors.push(e.linkText.message);
  if (e.root?.message) summaryErrors.push(e.root.message);

  const handleCancel = () => props.onDone();

  const getDescendantIds = (parentId: string, links: LinkInterface[]): string[] => {
    const result: string[] = [];
    links.filter((l) => l.parentId === parentId).forEach((c) => {
      if (c.id) { result.push(c.id); result.push(...getDescendantIds(c.id, links)); }
    });
    return result;
  };

  const getEligibleParents = (): LinkInterface[] => {
    const excluded = new Set<string>();
    if (props.link?.id) {
      excluded.add(props.link.id);
      getDescendantIds(props.link.id, allLinks).forEach((id) => excluded.add(id));
    }
    return allLinks.filter((l) => l.id && !excluded.has(l.id));
  };

  const getPageOptions = (): string[] => pageTree.map((p) => p.url);

  const onValid = async (values: AnyRecord) => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) {
      setError("root", { message: Locale.label("site.navLinkEdit.unauthorizedCreate") });
      return;
    }
    const linkData = { ...props.link, text: values.linkText, url: values.url, parentId: values.parentId || null };
    // Recalculate sort when parentId changes
    if (values.parentId !== (props.link?.parentId || "")) {
      const siblings = allLinks.filter((al) => (al.parentId || "") === (values.parentId || "") && al.id !== props.link?.id);
      const maxSort = siblings.reduce((m, s) => Math.max(m, s.sort || 0), 0);
      linkData.sort = maxSort + 1;
    }
    const [saved] = await ApiHelper.post("/links", [linkData], "ContentApi");
    props.updatedCallback(saved);
  };

  const handleDelete = () => {
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) {
      setError("root", { message: Locale.label("site.navLinkEdit.unauthorizedDelete") });
      return;
    }
    if (!props.link?.id) { props.updatedCallback(null); return; }
    ApiHelper.delete("/links/" + props.link.id.toString(), "ContentApi").then(() => { props.updatedCallback(null); });
  };

  useEffect(() => {
    if (props.link) reset({ linkText: props.link.text || "", url: props.link.url || "", parentId: props.link.parentId || "" });
  }, [props.link, reset]);

  useEffect(() => { PageHelper.loadPageTree().then((data) => { setPageTree(PageHelper.flatten(data)); }); }, []);

  useEffect(() => {
    const category = props.link?.category || "website";
    ApiHelper.get("/links?category=" + category, "ContentApi").then((data: LinkInterface[]) => { setAllLinks(data || []); });
  }, [props.link?.category]);

  if (!props.link) return <></>;
  return (
    <Dialog open={true} onClose={props.onDone} style={{ minWidth: 800 }} sx={{ zIndex: 2000 }}>
      <InputBox id="pageDetailsBox" headerText={props.link?.id ? Locale.label("site.navLink.linkSettings") : Locale.label("site.navLink.addLink")} headerIcon="article" saveFunction={handleSubmit(onValid)} cancelFunction={handleCancel} deleteFunction={handleDelete}>
        {summaryErrors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{summaryErrors.map((msg) => <div key={msg}>{msg}</div>)}</Alert>}
        <Controller name="url" control={control} render={({ field }) => (
          <Autocomplete disablePortal limitTags={3} freeSolo options={getPageOptions()} value={field.value} onChange={(_e: SyntheticEvent, value: string) => { field.onChange(value); }} onInputChange={(_e: SyntheticEvent, value: string) => { field.onChange(value); }} sx={{ width: 300 }} ListboxProps={{ style: { maxHeight: 150 } }} renderInput={(params) => <TextField {...params} size="small" fullWidth label={Locale.label("site.navLinkEdit.url")} name="linkUrl" />} />
        )} />
        <TextField size="small" fullWidth label={Locale.label("site.navLinkEdit.linkText")} error={!!e.linkText} helperText={e.linkText?.message} {...register("linkText", { required: Locale.label("site.navLinkEdit.errLinkText") })} />
        <FormControl fullWidth size="small" sx={{ mt: 2 }}>
          <InputLabel>{Locale.label("site.navLinkEdit.parentPage")}</InputLabel>
          <Controller name="parentId" control={control} render={({ field }) => (
            <Select {...field} size="small" fullWidth label={Locale.label("site.navLinkEdit.parentPage")} displayEmpty data-testid="parent-page-select" MenuProps={{ disablePortal: true }}>
              <MenuItem value="">{Locale.label("site.navLinkEdit.noParent")}</MenuItem>
              {getEligibleParents().map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.text || p.url}</MenuItem>
              ))}
            </Select>
          )} />
        </FormControl>
      </InputBox>
    </Dialog>
  );
}
