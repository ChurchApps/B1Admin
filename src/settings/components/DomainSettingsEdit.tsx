import React from "react";
import { type DomainInterface } from "@churchapps/helpers";
import { ArrayHelper, ApiHelper, Locale } from "@churchapps/apphelper";
import { TextField, TableCell, TableBody, TableRow, Table, TableHead, Alert, Box, Typography, FormControl, MenuItem, Select, type SelectChangeEvent } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import LinkIcon from "@mui/icons-material/Link";
import { AppIconButton } from "../../components/ui/AppIconButton";
import type { SiteInterface } from "../../helpers/Interfaces";

interface DomainWithSite extends DomainInterface {
  siteId?: string;
}

interface Props {
  churchId: string;
  saveTrigger: Date | null;
  onSaveComplete?: (ok: boolean) => void;
}

export const DomainSettingsEdit: React.FC<Props> = (props) => {
  const [domains, setDomains] = React.useState<DomainWithSite[]>([]);
  const [originalDomains, setOriginalDomains] = React.useState<DomainWithSite[]>([]);
  const [addDomainName, setAddDomainName] = React.useState("");
  const [error, setError] = React.useState("");
  const [sites, setSites] = React.useState<SiteInterface[]>([]);

  const validateDomainName = (domain: string): string => {
    if (!domain || domain.trim() === "") {
      return Locale.label("settings.domain.errorInvalid");
    }

    let cleanDomain = domain.trim().toLowerCase();

    // Remove protocol if present
    if (cleanDomain.startsWith("http://") || cleanDomain.startsWith("https://")) {
      return Locale.label("settings.domain.errorInvalid");
    }

    // Remove trailing slash if present
    if (cleanDomain.endsWith("/")) {
      cleanDomain = cleanDomain.slice(0, -1);
    }

    // Check for path or other invalid characters
    if (cleanDomain.includes("/")) {
      return Locale.label("settings.domain.errorInvalid");
    }

    // Domain must have at least one dot (e.g., example.com)
    if (!cleanDomain.includes(".")) {
      return Locale.label("settings.domain.errorInvalid");
    }

    // Basic domain format validation
    const domainRegex = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return Locale.label("settings.domain.errorInvalid");
    }

    // Check for duplicate
    if (domains.some(d => d.domainName?.toLowerCase() === cleanDomain)) {
      return Locale.label("settings.domain.errorInvalid");
    }

    return "";
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    e.preventDefault();
    switch (e.target.name) {
      case "domainName":
        setAddDomainName(e.target.value);
        setError("");
        break;
    }
  };

  const save = async () => {
    try {
      for (const d of originalDomains) {
        if (!ArrayHelper.getOne(domains, "id", d.id)) await ApiHelper.delete("/domains/" + d.id, "MembershipApi");
      }
      // One upsert for the whole list: rows without id are creates, rows with id are
      // updates carrying their (possibly changed) siteId.
      if (domains.length > 0) await ApiHelper.post("/domains", domains, "MembershipApi");
      setError("");
      props.onSaveComplete?.(true);
    } catch (e: any) {
      setError(e?.message || Locale.label("common.saveError"));
      props.onSaveComplete?.(false);
    }
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const loadData = async () => {
    const data = await ApiHelper.get("/domains", "MembershipApi");
    setOriginalDomains(data);
    setDomains(data);
    try {
      const siteData = await ApiHelper.get("/sites", "MembershipApi");
      setSites(Array.isArray(siteData) ? siteData : []);
    } catch {
      // Older APIs may not expose /sites — hide the per-domain site column.
      setSites([]);
    }
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    const validationError = validateDomainName(addDomainName);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Clean the domain name before adding
    let cleanDomain = addDomainName.trim().toLowerCase();
    if (cleanDomain.endsWith("/")) {
      cleanDomain = cleanDomain.slice(0, -1);
    }

    const doms: DomainWithSite[] = [...domains];
    doms.push({ domainName: cleanDomain });
    setDomains(doms);
    setAddDomainName("");
    setError("");
  };

  const handleDelete = (index: number) => {
    const doms: DomainWithSite[] = [...domains];
    doms.splice(index, 1);
    setDomains(doms);
  };

  const handleSiteChange = (index: number, e: SelectChangeEvent) => {
    const doms: DomainWithSite[] = [...domains];
    doms[index] = { ...doms[index], siteId: e.target.value };
    setDomains(doms);
  };

  const getRows = () => {
    const result: JSX.Element[] = [];
    let idx = 0;
    domains.forEach((d) => {
      const index = idx;
      result.push(
        <TableRow key={index} sx={{ "&:hover": { bgcolor: "action.hover" } }}>
          <TableCell sx={{ py: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LinkIcon sx={{ color: "text.disabled", fontSize: 18 }} />
              <Typography variant="body2">{d.domainName}</Typography>
            </Box>
          </TableCell>
          {sites.length > 0 && (
            <TableCell sx={{ py: 1.5 }}>
              <FormControl size="small" fullWidth>
                <Select value={d.siteId || ""} onChange={(e) => handleSiteChange(index, e)} displayEmpty data-testid={`domain-site-select-${d.domainName}`} aria-label={Locale.label("settings.domainSettingsEdit.site")}>
                  <MenuItem value="">{Locale.label("settings.domainSettingsEdit.mainWebsite")}</MenuItem>
                  {sites.map((s) => (<MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>))}
                </Select>
              </FormControl>
            </TableCell>
          )}
          <TableCell sx={{ py: 1.5, width: 50 }}>
            <AppIconButton label={Locale.label("common.delete")} icon={<DeleteOutlineIcon />} intent="remove" onClick={() => handleDelete(index)} />
          </TableCell>
        </TableRow>
      );
      idx++;
    });
    return result;
  };

  React.useEffect(() => {
    if (props.churchId) loadData();
  }, [props.churchId]);
  React.useEffect(checkSave, [props.saveTrigger]);

  return (
    <Box>
      <Box sx={{
        p: 2,
        mb: 2,
        bgcolor: "action.hover",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider"
      }}>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          {Locale.label("settings.domainSettingsEdit.domMsg")} <code style={{ backgroundColor: "rgba(0,0,0,0.08)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>CNAME: proxy.b1.church</code>
          {Locale.label("settings.domainSettingsEdit.domMsg2")} <code style={{ backgroundColor: "rgba(0,0,0,0.08)", padding: "2px 6px", borderRadius: 4, fontFamily: "monospace" }}>A: 3.23.251.61</code>
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Table size="small" sx={{ "& .MuiTableCell-root": { borderColor: "divider" } }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ py: 1.5 }}>{Locale.label("settings.domainSettingsEdit.domain")}</TableCell>
            {sites.length > 0 && <TableCell sx={{ py: 1.5 }}>{Locale.label("settings.domainSettingsEdit.site")}</TableCell>}
            <TableCell sx={{ py: 1.5, width: 50 }}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {getRows()}
          <TableRow>
            <TableCell sx={{ py: 1 }}>
              <TextField
                fullWidth
                name="domainName"
                size="small"
                value={addDomainName}
                onChange={handleChange}
                placeholder={Locale.label("settings.domain.domainPlaceholder")}
                error={!!error}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 1.5 } }}
              />
            </TableCell>
            {sites.length > 0 && <TableCell sx={{ py: 1 }} />}
            <TableCell sx={{ py: 1 }}>
              <AppIconButton label={Locale.label("common.add")} icon={<AddCircleOutlineIcon />} tone="card" intent="add" onClick={handleAdd} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
};
