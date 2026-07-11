import { useState } from "react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from "@mui/material";
import { ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { AppIconButton } from "../../components/ui/AppIconButton";
import { useConfirmDelete } from "../../hooks";
import type { SiteInterface } from "../../helpers";

type Props = {
  open: boolean;
  onClose: () => void;
  sites: SiteInterface[];
  siteId: string;
  onChanged: () => void;
  onSelectSite: (siteId: string) => void;
};

export function SitesDialog(props: Props) {
  const [name, setName] = useState("");
  const [subDomain, setSubDomain] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const { confirm, ConfirmDialogElement } = useConfirmDelete();

  const handleAdd = async () => {
    setErrors([]);
    try {
      await ApiHelper.post("/sites", [{ name, subDomain }], "MembershipApi");
      setName("");
      setSubDomain("");
      props.onChanged();
    } catch (e: any) {
      setErrors([e?.message || e?.toString() || "Error"]);
    }
  };

  const handleDelete = async (site: SiteInterface) => {
    if (!(await confirm(Locale.label("site.sitesDialog.deleteConfirm", "Delete this website? Its pages, navigation and appearance will be permanently deleted. Its custom domains will be reassigned to the main website.")))) return;
    await ApiHelper.delete("/sites/" + site.id, "MembershipApi");
    if (props.siteId === site.id) props.onSelectSite("");
    props.onChanged();
  };

  return (
    <Dialog open={props.open} onClose={props.onClose} fullWidth maxWidth="sm">
      <DialogTitle>{Locale.label("site.sitesDialog.title", "Websites")}</DialogTitle>
      <DialogContent dividers>
        {ConfirmDialogElement}
        <ErrorMessages errors={errors} />
        {props.sites.length === 0 && <Typography color="text.secondary" sx={{ mb: 2 }}>{Locale.label("site.sitesDialog.empty", "No additional websites yet.")}</Typography>}
        <Stack spacing={1} sx={{ mb: 3 }}>
          {props.sites.map((s) => (
            <Box key={s.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid", borderColor: "divider", borderRadius: 1, px: 2, py: 1 }}>
              <Box>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>{s.name}</Typography>
                <Typography variant="body2" color="text.secondary">{s.subDomain}.b1.church</Typography>
              </Box>
              <AppIconButton label={Locale.label("common.delete")} icon={<DeleteOutlineIcon />} intent="remove" onClick={() => handleDelete(s)} data-testid={`delete-site-${s.subDomain}`} />
            </Box>
          ))}
        </Stack>
        <Stack spacing={2}>
          <TextField size="small" fullWidth label={Locale.label("site.sitesDialog.name", "Name")} value={name} onChange={(e) => setName(e.target.value)} data-testid="site-name-input" />
          <TextField size="small" fullWidth label={Locale.label("site.sitesDialog.subDomain", "Subdomain")} helperText={Locale.label("site.sitesDialog.subDomainHint", "Lowercase letters and numbers only. Becomes {subdomain}.b1.church")} value={subDomain} onChange={(e) => setSubDomain(e.target.value.toLowerCase())} data-testid="site-subdomain-input" />
          <Box>
            <Button variant="contained" onClick={handleAdd} disabled={!name || !subDomain} data-testid="add-site-button">{Locale.label("site.sitesDialog.add", "Add Website")}</Button>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={props.onClose} data-testid="close-sites-dialog">{Locale.label("common.close", "Close")}</Button>
      </DialogActions>
    </Dialog>
  );
}
