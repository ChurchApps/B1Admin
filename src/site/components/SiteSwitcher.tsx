import { Divider, FormControl, MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import type { SiteInterface } from "../../helpers";

const MANAGE_VALUE = "__manage__";

type Props = {
  siteId: string;
  onChange: (siteId: string) => void;
  sites: SiteInterface[];
  onManage: () => void;
};

export function SiteSwitcher(props: Props) {
  const canManage = UserHelper.checkAccess(Permissions.membershipApi.settings.edit);

  const handleChange = (e: SelectChangeEvent) => {
    const value = e.target.value;
    if (value === MANAGE_VALUE) { props.onManage(); return; }
    props.onChange(value);
  };

  return (
    <FormControl size="small" sx={{ minWidth: 180 }}>
      <Select
        value={props.siteId}
        onChange={handleChange}
        displayEmpty
        data-testid="site-switcher"
        aria-label={Locale.label("site.siteSwitcher.mainWebsite", "Main Website")}
        sx={{ bgcolor: "background.paper", fontWeight: 600 }}
      >
        <MenuItem value="">{Locale.label("site.siteSwitcher.mainWebsite", "Main Website")}</MenuItem>
        {props.sites.map((s) => (<MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>))}
        {canManage && <Divider />}
        {canManage && <MenuItem value={MANAGE_VALUE} data-testid="manage-sites">{Locale.label("site.siteSwitcher.manageSites", "Manage websites…")}</MenuItem>}
      </Select>
    </FormControl>
  );
}
