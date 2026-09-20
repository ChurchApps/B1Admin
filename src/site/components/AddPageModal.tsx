import { useState, useEffect } from "react";
import { ErrorMessages, UserHelper, SlugHelper, ApiHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { Permissions, type LinkInterface } from "@churchapps/helpers";
import { Button, Dialog, Grid, Icon, InputLabel, type SelectChangeEvent, TextField, Typography, CircularProgress, Box } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { type AiCandidate, gatherChurchFacts, resolvePhotos, setAiPageSession } from "../aiPageCandidates";

type Props = {
  mode: string,
  updatedCallback: () => void;
  onDone: () => void;
  requestedSlug?: string;
  siteId?: string;
};

interface PageInterface {
  id?: string;
  title?: string;
  url?: string;
  layout?: string;
  siteId?: string;
}

export function AddPageModal(props: Props) {
  const navigate = useNavigate();
  const [page, setPage] = useState<PageInterface | null>(null);
  const [link, setLink] = useState<LinkInterface | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [pageTemplate, setPageTemplate] = useState<string>("blank");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>("");
  const [aiErrors, setAiErrors] = useState<string[]>([]);
  const [aiGenerationStatus, setAiGenerationStatus] = useState<string>("");

  const handleCancel = () => props.onDone();
  const handleKeyDown = (e: React.KeyboardEvent<any>) => { if (e.key === "Enter") { e.preventDefault(); handleSave(); } };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const p = { ...page };
    const val = e.target.value;
    switch (e.target.name) {
      case "title": p.title = val; break;
      case "url":
        p.url = val.toLowerCase();
        if (link) {
          const l = { ...link };
          l.url = val.toLowerCase();
          setLink(l);
        }
        break;
      case "layout": p.layout = val; break;
    }
    setPage(p);
  };

  const handleLinkChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent<string>) => {
    e.preventDefault();
    const l = { ...link } as LinkInterface;
    const val = e.target.value;
    switch (e.target.name) {
      case "linkText": l.text = val; break;
      case "linkUrl": l.url = val; break;
    }
    setLink(l);
  };

  const validate = () => {
    const errors: string[] = [];
    if (pageTemplate === "ai") {
      // AI mode validation is handled in handleAiGenerate
      return true;
    } else if (pageTemplate === "link") {
      if (!link?.url || link.url === "") errors.push(Locale.label("site.addPageModal.errLinkUrl"));
    } else {
      if (!page?.title || page.title === "") errors.push(Locale.label("site.addPageModal.errTitle"));
    }
    if (props.mode === "navigation") {
      if (!link?.text || link.text === "") errors.push(Locale.label("site.addPageModal.errLinkText"));
    }
    if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) errors.push(Locale.label("site.addPageModal.unauthorizedCreate"));
    setErrors(errors);
    return errors.length === 0;
  };

  const handleAiGenerate = async () => {
    const promptErrors: string[] = [];
    if (!page?.title) promptErrors.push(Locale.label("site.addPageModal.errTitle"));
    if (!aiPrompt || aiPrompt.trim().length < 10) promptErrors.push(Locale.label("site.addPageModal.errAiPromptTooShort"));
    if (promptErrors.length > 0) {
      setAiErrors(promptErrors);
      return;
    }

    setIsSubmitting(true);
    setAiErrors([]);
    setAiGenerationStatus(Locale.label("site.addPageModal.statusGatheringInfo"));

    try {
      const church = UserHelper.currentUserChurch.church;
      const [globalStyles, records, existingPages] = await Promise.all([
        ApiHelper.get("/globalStyles", "ContentApi"),
        gatherChurchFacts(church.id),
        ApiHelper.get("/pages", "ContentApi").catch((): any[] => [])
      ]);
      const palette = typeof globalStyles?.palette === "string" ? JSON.parse(globalStyles.palette || "{}") : globalStyles?.palette;
      const address = [church.address1, church.city, church.state].filter(Boolean).join(", ");
      const request = { prompt: aiPrompt.trim(), churchContext: { churchName: church.name, address: address || undefined, theme: { palette }, resolvesPhotos: true, ...records } };

      // Each phase is its own request so every call stays inside the API gateway timeout.
      setAiGenerationStatus(Locale.label("site.addPageModal.statusPlanning"));
      const plan = await ApiHelper.post("/website/planPage", request, "AskApi");
      if (!plan?.candidates?.length) throw new Error(plan?.error || Locale.label("site.addPageModal.errOutlineFailed"));

      // A brand-new site has no look of its own yet, so it takes the suggested palette and fonts. Existing sites keep theirs.
      if (Array.isArray(existingPages) && existingPages.length === 0 && plan.suggestedStyle?.palette) {
        const merged = { ...globalStyles, fonts: JSON.stringify(plan.suggestedStyle.fonts), palette: JSON.stringify({ ...palette, ...plan.suggestedStyle.palette }) };
        await ApiHelper.post("/globalStyles", [merged], "ContentApi").catch((): null => null);
        request.churchContext.theme = { palette: { ...palette, ...plan.suggestedStyle.palette } };
      }

      // Candidates are written lazily and memoized. The two best start now and whichever finishes first is shown;
      // the rest wait behind "try another layout" on the preview, so an unseen layout is never paid for.
      setAiGenerationStatus(Locale.label("site.addPageModal.statusGenerating").replace("{count}", plan.candidates[0].layout.length.toString()));
      const candidates: AiCandidate[] = plan.candidates.map((c: { layout: string[]; score: number }) => ({ layout: c.layout, layoutScore: c.score }));
      const started: Record<number, Promise<AiCandidate>> = {};
      const load = (index: number) => (started[index] ??= (async () => {
        const result = await ApiHelper.post("/website/writePage", { ...request, layout: candidates[index].layout, tone: plan.tone, pageType: plan.pageType }, "AskApi");
        if (!result?.sections?.length) throw new Error(result?.error || Locale.label("site.addPageModal.errAllSectionsFailed"));
        candidates[index].score = result.score;
        candidates[index].sections = await resolvePhotos(result.sections);
        return candidates[index];
      })());
      const first = await Promise.any(candidates.slice(0, 2).map((_c, i) => load(i))).catch(() => { throw new Error(Locale.label("site.addPageModal.errAllSectionsFailed")); });

      setAiGenerationStatus(Locale.label("site.addPageModal.statusCreatingSections"));
      const title = page.title;
      const url = props.requestedSlug || SlugHelper.slugifyString("/" + title.toLowerCase().replace(/\s+/g, "-"), "urlPath") || "/untitled";
      const savedPage = await ApiHelper.post("/pages/importTree", { title, url, layout: "headerFooter", siteId: props.siteId || undefined, sections: first.sections }, "ContentApi");
      setAiPageSession(savedPage.id, { pageType: plan.pageType, shown: candidates.indexOf(first), candidates, load });

      setAiGenerationStatus(Locale.label("site.addPageModal.statusOpening"));
      props.updatedCallback();
      navigate(`/site/pages/preview/${savedPage.id}`);

    } catch (error) {
      setAiErrors([(error as Error)?.message || Locale.label("site.addPageModal.errFailedGenerate")]);
    } finally {
      setIsSubmitting(false);
      setAiGenerationStatus("");
    }
  };

  const handleSave = async () => {
    if (pageTemplate === "ai") {
      handleAiGenerate();
    } else if (validate()) {
      setIsSubmitting(true);
      try {
        let pageData = null;
        if (pageTemplate !== "link") {
          const p = { ...page };
          p.siteId = props.siteId || undefined;
          const slugString = link?.text || page?.title || "new-page";
          p.url = props.requestedSlug || SlugHelper.slugifyString("/" + slugString.toLowerCase().replace(" ", "-"), "urlPath");
          if (!p.url) p.url = "/untitled";

          pageData = await ApiHelper.post("/pages", [p], "ContentApi").then((data: any) => {
            setPage(data[0]);
            return data[0];
          });
        }

        if (props.mode === "navigation") {
          const l: LinkInterface & { siteId?: string } = { ...link, siteId: props.siteId || undefined } as LinkInterface & { siteId?: string };
          if (pageTemplate !== "link") l.url = pageData.url;
          await ApiHelper.post("/links", [l], "ContentApi");
        }

        props.updatedCallback();
      } catch (err: any) {
        // Surface backend errors (e.g., duplicate URL) instead of silently
        // leaving the dialog open with no feedback.
        const message = err?.message || Locale.label("site.addPageModal.errFailedGenerate");
        setErrors([message]);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const selectTemplate = (template: string) => {
    const p = { ...page };
    const l = { ...link } as LinkInterface;
    const churchName = UserHelper.currentUserChurch.church.name || "";
    switch (template) {
      case "sermons": p.title = Locale.label("site.templates.viewSermons"); l.text = Locale.label("common.sermons"); break;
      case "about": p.title = "About " + churchName; l.text = Locale.label("site.addPageModal.aboutUs"); break;
      case "donate": p.title = "Support " + churchName; l.text = Locale.label("site.addPageModal.donate"); break;
      case "location": p.title = "Directions to " + churchName; l.text = Locale.label("site.addPageModal.location"); break;
    }
    setPage(p);
    setLink(l);
    setPageTemplate(template);
  };

  const getTemplateButton = (key: string, icon: string, text: string) => (
    <Grid size={3}>
      <Button variant={(pageTemplate.toLowerCase() === key) ? "contained" : "outlined"} startIcon={<Icon>{icon}</Icon>} onClick={() => { selectTemplate(key); }} fullWidth data-testid={`template-${key}-button`}>{text}</Button>
    </Grid>
  );

  useEffect(() => {
    setPage({ layout: "headerFooter" });
    setLink({ churchId: UserHelper.currentUserChurch.church.id, category: "website", linkType: "url", sort: 99 } as LinkInterface);
  }, [props.mode]);

  if (!page && !link) return <></>;
  else {
    return (

      <Dialog open={true} onClose={props.onDone} className="dialogForm">
        <FormCard id="dialogForm" title={(pageTemplate === "link") ? Locale.label("site.addPage.newLink") : Locale.label("site.addPage.newPage")} icon="article" onSave={handleSave} onCancel={handleCancel} data-testid="add-page-modal" isSubmitting={isSubmitting} elevation={0}>

          <ErrorMessages errors={errors} />

          <InputLabel>{Locale.label("site.addPage.pageType")}</InputLabel>


          <Grid container spacing={2}>
            {getTemplateButton("blank", "article", Locale.label("site.addPageModal.blank"))}
            {getTemplateButton("sermons", "subscriptions", Locale.label("common.sermons"))}
            {getTemplateButton("about", "quiz", Locale.label("site.addPageModal.aboutUs"))}
            {getTemplateButton("donate", "volunteer_activism", Locale.label("site.addPageModal.donate"))}
            {getTemplateButton("location", "location_on", Locale.label("site.addPageModal.location"))}
            {getTemplateButton("ai", "auto_awesome", "AI")}
            {(props.mode === "navigation") && getTemplateButton("link", "link", Locale.label("site.addPageModal.linkType"))}
          </Grid>

          {pageTemplate === "ai" && (
            <>
              <ErrorMessages errors={aiErrors} />
              {isSubmitting && aiGenerationStatus && (
                <Box sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  p: 2,
                  mb: 2,
                  backgroundColor: "primary.main",
                  color: "#ffffff",
                  borderRadius: 1
                }}>
                  <CircularProgress size={24} sx={{ color: "#ffffff" }} />
                  <Typography sx={{ color: "#ffffff" }}>{aiGenerationStatus}</Typography>
                </Box>
              )}
              <Typography sx={{ mt: 2, mb: 1, fontWeight: 500 }}>
                {Locale.label("site.addPageModal.describe")}
              </Typography>
              <TextField
                fullWidth
                multiline
                minRows={5}
                maxRows={8}
                placeholder={Locale.label("site.addPage.aiPlaceholder")}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={isSubmitting}
                data-testid="ai-prompt-input"
              />
              <Typography sx={{ fontSize: "12px", fontStyle: "italic", my: 1 }}>
                {Locale.label("site.addPageModal.examples")}
                <br />• {Locale.label("site.addPageModal.exampleHomepage")}
                <br />• {Locale.label("site.addPageModal.exampleMinistries")}
                <br />• {Locale.label("site.addPageModal.exampleContact")}
              </Typography>
            </>
          )}

          <Grid container spacing={2} sx={pageTemplate === "ai" ? { mt: 1 } : undefined}>
            {(pageTemplate !== "link") && <Grid size={(props.mode === "navigation") ? 6 : 12}>
              <TextField size="small" fullWidth label={Locale.label("site.addPageModal.pageTitle")} name="title" value={page?.title || ""} onChange={handleChange} onKeyDown={handleKeyDown} placeholder={Locale.label("placeholders.addPage.title")} data-testid="page-title-input" />
            </Grid>}
            {(pageTemplate === "link") && <Grid size={(props.mode === "navigation") ? 6 : 12}>
              <TextField size="small" fullWidth label={Locale.label("site.addPageModal.linkUrl")} name="linkUrl" value={link?.url || ""} onChange={handleLinkChange} onKeyDown={handleKeyDown} placeholder={Locale.label("placeholders.addPage.linkUrl")} />
            </Grid>}
            {(props.mode === "navigation") && <Grid size={6}>
              <TextField size="small" fullWidth label={Locale.label("site.addPageModal.linkText")} name="linkText" value={link?.text || ""} onChange={handleLinkChange} onKeyDown={handleKeyDown} placeholder={Locale.label("placeholders.addPage.linkText")} />
            </Grid>}
          </Grid>
        </FormCard>

      </Dialog>
    );
  }
}
