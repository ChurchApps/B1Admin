import { useEffect, useState } from "react";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import type { GenericSettingInterface } from "@churchapps/helpers";
import { CardWithHeader } from "../../components/ui";
import { clearSiteCache } from "../siteCache";

export const BlogFooterEdit: React.FC = () => {
  const [setting, setSetting] = useState<GenericSettingInterface>({ keyName: "blogFooterHtml", value: "", public: 1 } as GenericSettingInterface);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    ApiHelper.get("/settings", "ContentApi").then((data: GenericSettingInterface[]) => {
      const s = (data || []).find((d) => d.keyName === "blogFooterHtml");
      if (s) setSetting(s);
    });
  }, []);

  const handleSave = () => {
    ApiHelper.post("/settings", [setting], "ContentApi").then((data: GenericSettingInterface[]) => {
      if (data?.[0]) setSetting(data[0]);
      clearSiteCache();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    });
  };

  return (
    <CardWithHeader title={Locale.label("site.blog.footerTitle")}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{Locale.label("site.blog.footerDesc")}</Typography>
      <TextField multiline rows={6} fullWidth label={Locale.label("site.blog.footerLabel")} value={setting.value || ""} onChange={(e) => setSetting({ ...setting, value: e.target.value })} placeholder={"<div id=\"comments\"></div>\n<script src=\"https://...\"></script>"} sx={{ "& .MuiInputBase-input": { fontFamily: "Monaco, Menlo, \"Ubuntu Mono\", monospace", fontSize: "0.875rem" } }} data-testid="blog-footer-input" />
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
        <Button variant="contained" onClick={handleSave} data-testid="blog-footer-save">{Locale.label("common.save")}</Button>
        {saved && <Typography variant="body2" color="success.main">{Locale.label("site.siteWidgets.saved")}</Typography>}
      </Stack>
    </CardWithHeader>
  );
};
