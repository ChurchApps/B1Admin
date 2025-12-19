import React from "react";
import { ArrayHelper, type DomainInterface, ApiHelper, Locale } from "@churchapps/apphelper";
import { TextField, Grid, TableCell, TableBody, TableRow, Table, TableHead, Alert } from "@mui/material";

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
        <TableRow>
          <TableCell>{d.domainName}</TableCell>
          <TableCell>
            <button
              type="button"
              onClick={() => handleDelete(index)}
              style={{ background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer" }}>
              {Locale.label("common.delete")}
            </button>
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
    <>
      {/* <div className="subHead">{Locale.label("settings.domainSettingsEdit.domains")}</div> */}
      <p style={{ fontSize: 12 }}>
        {Locale.label("settings.domainSettingsEdit.domMsg")} <i style={{ fontSize: 12 }}>CNAME: proxy.b1.church</i>
        {Locale.label("settings.domainSettingsEdit.domMsg2")} <i style={{ fontSize: 12 }}>A: 3.23.251.61</i>
        {Locale.label("settings.domainSettingsEdit.domMsg3")}{" "}
        <button type="button" onClick={relink} style={{ background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer" }}>
          {Locale.label("settings.domainSettingsEdit.domMsgConnect")}
        </button>
        {Locale.label("settings.domainSettingsEdit.domMsg4")}
      </p>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          {error && <Alert severity="error" style={{ marginBottom: 16 }}>{error}</Alert>}
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{Locale.label("settings.domainSettingsEdit.domain")}</TableCell>
                <TableCell>{Locale.label("settings.domainSettingsEdit.act")}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {getRows()}
              <TableRow>
                <TableCell>
                  <TextField
                    fullWidth
                    name="domainName"
                    size="small"
                    value={addDomainName}
                    onChange={handleChange}
                    placeholder={Locale.label("settings.domain.domainPlaceholder")}
                    error={!!error}
                  />
                </TableCell>
                <TableCell>
                  <button type="button" onClick={handleAdd} style={{ background: "none", border: 0, padding: 0, color: "#1976d2", cursor: "pointer" }}>
                    {Locale.label("common.add")}
                  </button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Grid>
      </Grid>
    </>
  );
};
