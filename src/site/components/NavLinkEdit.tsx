import { useState, useEffect, SyntheticEvent } from "react";
import { ErrorMessages, InputBox, ApiHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { Permissions } from "@churchapps/helpers";
import type { LinkInterface } from "@churchapps/helpers";
import { Autocomplete, Dialog, TextField } from "@mui/material";
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

  const handleCancel = () => props.onDone();
  const handleKeyDown = (e: React.KeyboardEvent<any>) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const l = { ...link };
    const val = e.target.value;
    switch (e.target.name) {
      case "linkText": l.text = val; break;
      case "linkUrl": l.url = val; break;
    }
    setLink(l);
  };

  const handleUrlChange = (e: SyntheticEvent<Element, Event>, value: string) => {
    e?.preventDefault();
    const l = { ...link };
    l.url = value;
    setLink(l);
  };

  const validate = () => {
    const errors = [];
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) errors.push("Unauthorized to create pages");
    if (!link?.text || link?.text === "" || link?.text?.trim().length === 0) errors.push("Please enter link text");
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
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) errors.push("Unauthorized to delete pages");

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
          <Autocomplete disablePortal limitTags={3} freeSolo options={getPageOptions()} onChange={handleUrlChange} onInputChange={handleUrlChange} sx={{ width: 300 }} ListboxProps={{ style: { maxHeight: 150 } }} value={link.url} renderInput={(params) => <TextField {...params} size="small" fullWidth label="Url" name="linkUrl" onKeyDown={handleKeyDown} />} />
          <TextField size="small" fullWidth label="Link Text" name="linkText" value={link.text || ""} onChange={handleLinkChange} onKeyDown={handleKeyDown} />
        </InputBox>
      </Dialog>
    );
  }
}
