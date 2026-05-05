import { useState, useEffect, SyntheticEvent } from "react";
import { ErrorMessages, InputBox, ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/helpers";
import type { LinkInterface } from "@churchapps/helpers";
import { Autocomplete, Dialog, FormControl, InputLabel, MenuItem, Select, TextField } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import { PageHelper } from "../../helpers";
import type { PageLink } from "../../helpers";

type Props = {
  link: LinkInterface;
  embedded?: boolean;
  updatedCallback: (link: LinkInterface | null) => void;
  onDone: () => void;
};

export function NavLinkEdit(props: Props) {
  const [link, setLink] = useState<LinkInterface>(props.link);
  const [errors, setErrors] = useState<string[]>([]);
  const [pageTree, setPageTree] = useState<PageLink[]>([]);
  const [allLinks, setAllLinks] = useState<LinkInterface[]>([]);

  const handleCancel = () => props.onDone();
  const handleKeyDown = (e: React.KeyboardEvent<any>) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const l = { ...link };
    const val = e.target.value;
    switch (e.target.name) {
      case "linkText": l.text = val; break;
      case "linkUrl": l.url = val; break;
      case "parentId": {
        l.parentId = val || null;
        const siblings = allLinks.filter((al) => (al.parentId || "") === (val || "") && al.id !== l.id);
        const maxSort = siblings.reduce((m, s) => Math.max(m, s.sort || 0), 0);
        l.sort = maxSort + 1;
        break;
      }
    }
    setLink(l);
  };

  const getDescendantIds = (parentId: string, links: LinkInterface[]): string[] => {
    const result: string[] = [];
    links.filter((l) => l.parentId === parentId).forEach((c) => {
      if (c.id) {
        result.push(c.id);
        result.push(...getDescendantIds(c.id, links));
      }
    });
    return result;
  };

  const getEligibleParents = (): LinkInterface[] => {
    const excluded = new Set<string>();
    if (link?.id) {
      excluded.add(link.id);
      getDescendantIds(link.id, allLinks).forEach((id) => excluded.add(id));
    }
    return allLinks.filter((l) => l.id && !excluded.has(l.id));
  };

  const handleUrlChange = (e: SyntheticEvent<Element, Event>, value: string) => {
    e?.preventDefault();
    const l = { ...link };
    l.url = value;
    setLink(l);
  };

  const validate = () => {
    const errors = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) errors.push(Locale.label("site.navLinkEdit.unauthorizedCreate"));
    if (!link?.text || link?.text === "" || link?.text?.trim().length === 0) errors.push(Locale.label("site.navLinkEdit.errLinkText"));
    setErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (validate()) {
      let linkData = link;

      if (link) {
        [linkData] = await ApiHelper.post("/links", [link], "ContentApi");
      }

      props.updatedCallback(linkData);
    }
  };

  const handleDelete = () => {
    const errors = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) errors.push(Locale.label("site.navLinkEdit.unauthorizedDelete"));

    if (errors.length > 0) {
      setErrors(errors);
      return;
    }

    if (link) ApiHelper.delete("/links/" + link.id.toString(), "ContentApi").then(() => { props.updatedCallback(null); });
  };

  const getPageOptions = () => {
    const options: string[] = [];
    pageTree.forEach((p) => {
      options.push(p.url);
    });
    return options;
  };

  useEffect(() => { setLink(props.link); }, [props.link]);
  useEffect(() => { PageHelper.loadPageTree().then((data) => { setPageTree(PageHelper.flatten(data)); }); }, []);
  useEffect(() => {
    const category = props.link?.category || "website";
    ApiHelper.get("/links?category=" + category, "ContentApi").then((data: LinkInterface[]) => {
      setAllLinks(data || []);
    });
  }, [props.link?.category]);

  if (!link) return <></>;
  else {
    return (
      <Dialog
        open={true}
        onClose={props.onDone}
        style={{ minWidth: 800 }}
        sx={{ zIndex: 2000 }}
      >
        <InputBox id="pageDetailsBox" headerText={link?.id ? Locale.label("site.navLink.linkSettings") : Locale.label("site.navLink.addLink")} headerIcon="article" saveFunction={handleSave} cancelFunction={handleCancel} deleteFunction={handleDelete}>
          <ErrorMessages errors={errors} />
          <Autocomplete disablePortal limitTags={3} freeSolo options={getPageOptions()} onChange={handleUrlChange} onInputChange={handleUrlChange} sx={{ width: 300 }} ListboxProps={{ style: { maxHeight: 150 } }} value={link.url} renderInput={(params) => <TextField {...params} size="small" fullWidth label={Locale.label("site.navLinkEdit.url")} name="linkUrl" onKeyDown={handleKeyDown} />} />
          <TextField size="small" fullWidth label={Locale.label("site.navLinkEdit.linkText")} name="linkText" value={link.text || ""} onChange={handleLinkChange} onKeyDown={handleKeyDown} />
          <FormControl fullWidth size="small" sx={{ mt: 2 }}>
            <InputLabel>{Locale.label("site.navLinkEdit.parentPage")}</InputLabel>
            <Select size="small" fullWidth label={Locale.label("site.navLinkEdit.parentPage")} value={link.parentId || ""} name="parentId" onChange={handleLinkChange} displayEmpty data-testid="parent-page-select" MenuProps={{ disablePortal: true }}>
              <MenuItem value="">{Locale.label("site.navLinkEdit.noParent")}</MenuItem>
              {getEligibleParents().map((p) => (
                <MenuItem key={p.id} value={p.id}>{p.text || p.url}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </InputBox>
      </Dialog>
    );
  }
}
