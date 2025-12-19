import React from "react";
import { type DomainInterface } from "@churchapps/helpers";
import { ArrayHelper, ApiHelper, Locale } from "@churchapps/apphelper";
import { TextField, TableCell, TableBody, TableRow, Table, TableHead, Alert, Box, Typography, IconButton } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import LinkIcon from "@mui/icons-material/Link";

interface Props {
  churchId: string;
  saveTrigger: Date | null;
}

export const DomainSettingsEdit: React.FC<Props> = (props) => {
  const [domains, setDomains] = React.useState<DomainInterface[]>([]);
  const [originalDomains, setOriginalDomains] = React.useState<DomainInterface[]>([]);
  const [addDomainName, setAddDomainName] = React.useState("");
  const [error, setError] = React.useState("");

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

  const save = () => {
    for (const d of originalDomains) {
      if (!ArrayHelper.getOne(domains, "id", d.id)) ApiHelper.delete("/domains/" + d.id, "MembershipApi");
    }

    for (const d of domains) {
      const toAdd: DomainInterface[] = [];
      if (!d.id) toAdd.push(d);
      if (toAdd.length > 0) ApiHelper.post("/domains", toAdd, "MembershipApi");
    }
  };

  const checkSave = () => {
    if (props.saveTrigger !== null) save();
  };

  const loadData = async () => {
    const data = await ApiHelper.get("/domains", "MembershipApi");
    setOriginalDomains(data);
    setDomains(data);
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

    const doms: DomainInterface[] = [...domains];
    doms.push({ domainName: cleanDomain });
    setDomains(doms);
    setAddDomainName("");
    setError("");
  };

  const handleDelete = (index: number) => {
    const doms: DomainInterface[] = [...domains];
    doms.splice(index, 1);
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
          <TableCell sx={{ py: 1.5, width: 50 }}>
            <IconButton
              size="small"
              onClick={() => handleDelete(index)}
              sx={{ color: "error.main", "&:hover": { bgcolor: "error.light", color: "error.contrastText" } }}
              aria-label={Locale.label("common.delete")}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </TableCell>
        </TableRow>
      );
      idx++;
    });
    return result;
  };

  const relink = (e: React.MouseEvent) => {
    e.preventDefault();
    ApiHelper.get("/domains/caddy", "MembershipApi").then(() => {
      alert(Locale.label("settings.domain.doneAlert"));
    });
  };

  React.useEffect(() => {
    if (props.churchId) loadData();
  }, [props.churchId]);
  React.useEffect(checkSave, [props.saveTrigger]); //eslint-disable-line

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
          {Locale.label("settings.domainSettingsEdit.domMsg3")}{" "}
          <Typography
            component="span"
            onClick={relink}
            sx={{ color: "primary.main", cursor: "pointer", textDecoration: "underline", "&:hover": { color: "primary.dark" } }}
          >
            {Locale.label("settings.domainSettingsEdit.domMsgConnect")}
          </Typography>
          {Locale.label("settings.domainSettingsEdit.domMsg4")}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Table size="small" sx={{ "& .MuiTableCell-root": { borderColor: "divider" } }}>
        <TableHead>
          <TableRow sx={{ bgcolor: "action.hover" }}>
            <TableCell sx={{ fontWeight: 600, py: 1.5 }}>{Locale.label("settings.domainSettingsEdit.domain")}</TableCell>
            <TableCell sx={{ fontWeight: 600, py: 1.5, width: 50 }}></TableCell>
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
            <TableCell sx={{ py: 1 }}>
              <IconButton
                size="small"
                onClick={handleAdd}
                sx={{ color: "primary.main", "&:hover": { bgcolor: "primary.light", color: "primary.contrastText" } }}
                aria-label={Locale.label("common.add")}
              >
                <AddCircleOutlineIcon />
              </IconButton>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
};
