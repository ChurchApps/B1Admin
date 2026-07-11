import React, { useEffect, useState } from "react";
import { Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Grid, Typography } from "@mui/material";
import { ApiHelper, ErrorMessages, Locale, UserHelper } from "@churchapps/apphelper";
import type { LinkInterface } from "@churchapps/helpers";
import { buildTemplateSection } from "./sectionTemplates";
import { getSectionDefs, siteTemplates, type SiteTemplateDef, type SiteTemplatePageDef } from "./siteTemplates";
import { SiteTemplatePreview } from "./SiteTemplatePreview";

interface Props {
  open: boolean;
  siteId?: string;
  onClose: () => void;
  updatedCallback: (firstCreatedPageId: string | null) => void;
}

interface PageSummary {
  id?: string;
  url?: string;
}

export const SiteTemplatePicker: React.FC<Props> = (props) => {
  const siteId = props.siteId || "";
  const [selected, setSelected] = useState<SiteTemplateDef | null>(null);
  const [existingPages, setExistingPages] = useState<PageSummary[]>([]);
  const [existingLinks, setExistingLinks] = useState<LinkInterface[]>([]);
  const [existingStyle, setExistingStyle] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState("");
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (props.open) {
      setSelected(null);
      setErrors([]);
      ApiHelper.get("/pages" + (siteId ? "?siteId=" + siteId : ""), "ContentApi").then((data: PageSummary[]) => setExistingPages(data || []));
      ApiHelper.get("/links?category=website" + (siteId ? "&siteId=" + siteId : ""), "ContentApi").then((data: LinkInterface[]) => setExistingLinks(data || []));
      ApiHelper.get("/globalStyles" + (siteId ? "?siteId=" + siteId : ""), "ContentApi").then((gs: any) => setExistingStyle(gs || {}));
    }
  }, [props.open, siteId]);

  const label = (key: string) => Locale.label("site.siteTemplates." + key);
  const pageTitle = (p: SiteTemplatePageDef) => label("pages." + p.titleKey);
  const pageExists = (p: SiteTemplatePageDef) => existingPages.some((e) => e.url === p.url);

  const customPages = (template: SiteTemplateDef) => template.pages.filter((p) => p.sections?.length);
  const navOnlyPages = (template: SiteTemplateDef) => template.pages.filter((p) => !p.sections?.length);
  const navLabels = (template: SiteTemplateDef) => template.pages.filter((p) => p.navKey).map((p) => label("nav." + p.navKey));
  const churchName = UserHelper.currentUserChurch?.church?.name;

  const handleCreate = async () => {
    if (!selected) return;
    setIsSubmitting(true);
    setErrors([]);
    try {
      const churchId = UserHelper.currentUserChurch.church.id;
      let firstCreatedPageId: string | null = null;
      let navSort = existingLinks.reduce((max, l) => Math.max(max, l.sort || 0), 0) + 1;
      for (const pageDef of selected.pages) {
        const isCustom = !!pageDef.sections?.length;
        if (isCustom && !pageExists(pageDef)) {
          const title = pageTitle(pageDef);
          setStatus(label("creating").replace("{title}", title));
          const saved = await ApiHelper.post("/pages", [{ churchId, siteId, title, url: pageDef.url, layout: "headerFooter" }], "ContentApi");
          const pageId = saved[0].id;
          if (!firstCreatedPageId) firstCreatedPageId = pageId;
          let sort = 1;
          for (const sectionDef of getSectionDefs(pageDef.sections)) {
            await ApiHelper.post("/sections/tree", { section: buildTemplateSection(sectionDef, { pageId, zone: "main", sort: sort++ }) }, "ContentApi");
          }
        }
        if (pageDef.navKey) {
          const navText = label("nav." + pageDef.navKey);
          const linkExists = existingLinks.some((l) => l.url === pageDef.url || (l.text || "").toLowerCase() === navText.toLowerCase());
          if (!linkExists) {
            await ApiHelper.post("/links", [{ churchId, siteId, category: "website", linkType: "url", linkData: "", icon: pageDef.navIcon || "", text: navText, url: pageDef.url, sort: navSort++ }], "ContentApi");
          }
        }
      }
      // Theme the site to the chosen template, but never overwrite a church's own palette.
      if (selected.theme && existingStyle && !existingStyle.palette) {
        const gs: any = { ...existingStyle, palette: JSON.stringify(selected.theme.palette), fonts: JSON.stringify(selected.theme.fonts) };
        // Copy-on-write: if the loaded row isn't this site's, fork it so we never overwrite the primary.
        if ((existingStyle.siteId || "") !== siteId) { delete gs.id; gs.siteId = siteId; }
        await ApiHelper.post("/globalStyles", [gs], "ContentApi");
      }
      props.updatedCallback(firstCreatedPageId);
    } catch (err: any) {
      setErrors([err?.message || label("errFailed")]);
    } finally {
      setIsSubmitting(false);
      setStatus("");
    }
  };

  const cardSx = {
    border: "1px solid",
    borderColor: "divider",
    borderRadius: "8px",
    padding: "10px",
    cursor: "pointer",
    height: "100%",
    transition: "border-color 0.15s, box-shadow 0.15s",
    "&:hover": { borderColor: "primary.main", boxShadow: 2 }
  };

  const getListView = () => (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 2 }}>{label("intro")}</Typography>
      <Grid container spacing={2}>
        {siteTemplates.map((template) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={template.key}>
            <Box sx={cardSx} onClick={() => setSelected(template)} data-testid={"site-template-" + template.key}>
              <SiteTemplatePreview page={template.pages[0]} navLabels={navLabels(template)} churchName={churchName} maxHeight={260} palette={template.theme?.palette} />
              <Typography sx={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "10px" }}>{label("names." + template.key)}</Typography>
              <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>{label("descriptions." + template.key)}</Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "text.disabled", marginTop: "4px" }}>
                {label("pageCount").replace("{count}", customPages(template).length.toString())}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </>
  );

  const getDetailView = () => {
    if (!selected) return null;
    const pages = customPages(selected);
    const navOnly = navOnlyPages(selected);
    const hasConflicts = pages.some(pageExists);
    return (
      <>
        <ErrorMessages errors={errors} />
        {isSubmitting && status && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, padding: 2, marginBottom: 2, backgroundColor: "primary.main", color: "#fff", borderRadius: 1 }}>
            <CircularProgress size={22} sx={{ color: "#fff" }} />
            <Typography sx={{ color: "#fff" }}>{status}</Typography>
          </Box>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ marginBottom: 2 }}>{label("descriptions." + selected.key)}</Typography>
        <Grid container spacing={2}>
          {pages.map((p) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.url}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, marginBottom: "4px" }}>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>{pageTitle(p)}</Typography>
                {pageExists(p) && <Chip label={label("exists")} size="small" color="warning" sx={{ fontSize: "0.65rem", height: 18 }} />}
              </Box>
              <SiteTemplatePreview page={p} navLabels={navLabels(selected)} churchName={churchName} maxHeight={340} palette={selected.theme?.palette} />
            </Grid>
          ))}
        </Grid>
        {navOnly.length > 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ marginTop: 2 }}>
            {label("navLinksNote")} {navOnly.map((p) => label("nav." + p.navKey)).join(", ")}
          </Typography>
        )}
        {hasConflicts && (
          <Typography variant="body2" color="text.secondary" sx={{ marginTop: 1 }}>{label("existsNote")}</Typography>
        )}
      </>
    );
  };

  return (
    <Dialog open={props.open} onClose={isSubmitting ? undefined : props.onClose} fullWidth maxWidth="lg">
      <DialogTitle>{selected ? label("names." + selected.key) : label("title")}</DialogTitle>
      <DialogContent dividers>{selected ? getDetailView() : getListView()}</DialogContent>
      <DialogActions>
        {selected && <Button onClick={() => setSelected(null)} disabled={isSubmitting} data-testid="site-template-back-button">{label("back")}</Button>}
        <Button onClick={props.onClose} disabled={isSubmitting}>{Locale.label("common.cancel")}</Button>
        {selected && (
          <Button variant="contained" onClick={handleCreate} disabled={isSubmitting} data-testid="site-template-create-button">
            {label("create")}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};
