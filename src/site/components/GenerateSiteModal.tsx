import { useState } from "react";
import { Alert, Box, Button, Checkbox, Chip, Dialog, FormControl, FormControlLabel, Grid, InputLabel, LinearProgress, List, ListItem, ListItemText, MenuItem, Select, Stack, TextField, Typography } from "@mui/material";
import { ApiHelper, SlugHelper, UserHelper, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { WEBSITE_ELEMENT_TYPES } from "../admin/websiteContent";
import type { ElementInterface } from "../../helpers/Interfaces";

type Props = {
  onDone: () => void;
  updatedCallback: () => void;
  siteId?: string;
};

const TONE_KEYS = ["warm", "formal", "inspirational", "casual"];
const AUDIENCE_KEYS = ["families", "youth", "youngAdults", "seniors", "newcomers", "community"];

interface PlanSection { id: string; purpose: string; }
interface PlanPage { title: string; url?: string; layout?: string; sections: PlanSection[]; }

export function GenerateSiteModal(props: Props) {
  const church = UserHelper.currentUserChurch.church;
  const [phase, setPhase] = useState<"form" | "plan" | "building">("form");
  const [churchName, setChurchName] = useState<string>(church.name || "");
  const [description, setDescription] = useState("");
  const [tone, setTone] = useState("warm");
  const [audiences, setAudiences] = useState<string[]>([]);
  const [serviceTimes, setServiceTimes] = useState("");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlanPage[]>([]);
  const [includes, setIncludes] = useState<boolean[]>([]);
  const [progress, setProgress] = useState("");
  const [notes, setNotes] = useState<string[]>([]);

  const toggleAudience = (key: string) => setAudiences((a) => (a.includes(key) ? a.filter((x) => x !== key) : [...a, key]));

  const buildChurchContext = async (): Promise<any> => {
    let globalStyles: any;
    try { globalStyles = await ApiHelper.get("/globalStyles" + (props.siteId ? "?siteId=" + props.siteId : ""), "ContentApi"); } catch { globalStyles = null; }
    return {
      churchId: church.id,
      churchName,
      subdomain: church.subDomain,
      theme: { primaryColor: globalStyles?.palette?.primary, secondaryColor: globalStyles?.palette?.secondary, fonts: globalStyles?.fonts, palette: globalStyles?.palette }
    };
  };

  const handlePlan = async () => {
    if (!description || description.trim().length < 10) {
      setErrors([Locale.label("site.generateSite.errDescription")]);
      return;
    }
    setBusy(true);
    setErrors([]);
    try {
      const result: any = await ApiHelper.post("/website/generateSite", {
        churchName,
        description: description.trim(),
        tone,
        audiences: audiences.map((k) => Locale.label("site.generateSite.audience_" + k)),
        serviceTimesText: serviceTimes,
        availableElementTypes: WEBSITE_ELEMENT_TYPES,
        planOnly: true
      }, "AskApi");
      if (result?.error || !Array.isArray(result?.pages) || result.pages.length === 0) {
        setErrors([result?.error || Locale.label("site.generateSite.errPlan")]);
        return;
      }
      setPlan(result.pages);
      setIncludes(result.pages.map(() => true));
      setPhase("plan");
    } catch (err: any) {
      setErrors([err?.message || Locale.label("site.generateSite.errPlan")]);
    } finally {
      setBusy(false);
    }
  };

  const syncAnswers = (el: ElementInterface) => {
    if ((el as any).answers) el.answersJSON = JSON.stringify((el as any).answers);
    el.elements?.forEach(syncAnswers);
  };

  const handleBuild = async () => {
    setPhase("building");
    setBusy(true);
    setNotes([]);
    const churchContext = await buildChurchContext();
    const localNotes: string[] = [];
    let firstPageId: string | null = null;

    const selected = plan.filter((_, i) => includes[i]);
    for (let p = 0; p < selected.length; p++) {
      const page = selected[p];
      setProgress(Locale.label("site.generateSite.creatingPage").replace("{title}", page.title).replace("{n}", String(p + 1)).replace("{total}", String(selected.length)));
      let pageId: string;
      try {
        const url = page.url || SlugHelper.slugifyString("/" + page.title.toLowerCase().replace(/\s+/g, "-"), "urlPath") || "/untitled";
        const saved = await ApiHelper.post("/pages", [{ churchId: church.id, url, title: page.title, layout: page.layout || "headerFooter", siteId: props.siteId || "" }], "ContentApi");
        pageId = saved[0].id;
        if (!firstPageId) firstPageId = pageId;
      } catch {
        localNotes.push(Locale.label("site.generateSite.pageFailed").replace("{title}", page.title));
        continue;
      }

      for (let s = 0; s < page.sections.length; s++) {
        const outline = page.sections[s];
        setProgress(Locale.label("site.generateSite.buildingSection").replace("{title}", page.title).replace("{n}", String(s + 1)).replace("{total}", String(page.sections.length)));
        try {
          const secResult: any = await ApiHelper.post("/website/generateSection", {
            sectionOutline: outline,
            churchContext,
            availableElementTypes: WEBSITE_ELEMENT_TYPES,
            pageContext: { title: page.title, totalSections: page.sections.length, sectionIndex: s }
          }, "AskApi");
          if (!secResult?.section) { localNotes.push(Locale.label("site.generateSite.sectionSkipped").replace("{title}", page.title).replace("{n}", String(s + 1))); continue; }
          const section = secResult.section;
          section.elements?.forEach(syncAnswers);
          section.id = undefined;
          section.pageId = pageId;
          section.zone = "main";
          section.sort = s;
          await ApiHelper.post("/sections/tree", { section }, "ContentApi");
        } catch {
          localNotes.push(Locale.label("site.generateSite.sectionSkipped").replace("{title}", page.title).replace("{n}", String(s + 1)));
        }
      }
    }

    setNotes(localNotes);
    setBusy(false);
    setProgress(Locale.label("site.generateSite.done"));
    props.updatedCallback();
  };

  return (
    <Dialog open={true} onClose={busy ? undefined : props.onDone} className="dialogForm" maxWidth="sm" fullWidth>
      <FormCard
        id="generateSiteModal"
        title={Locale.label("site.generateSite.title")}
        icon="auto_awesome"
        onSave={phase === "form" ? handlePlan : phase === "plan" ? handleBuild : undefined}
        onCancel={busy ? undefined : props.onDone}
        saveText={phase === "form" ? Locale.label("site.generateSite.createPlan") : Locale.label("site.generateSite.generate")}
        isSubmitting={busy}
        elevation={0}
        data-testid="generate-site-modal"
      >
        {errors.length > 0 && <Alert severity="error" sx={{ mb: 2 }}>{errors.map((m) => <div key={m}>{m}</div>)}</Alert>}

        {phase === "form" && (
          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField size="small" fullWidth label={Locale.label("site.generateSite.churchName")} value={churchName} onChange={(e) => setChurchName(e.target.value)} data-testid="gs-church-name" />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField size="small" fullWidth multiline minRows={3} label={Locale.label("site.generateSite.describe")} placeholder={Locale.label("site.generateSite.describePlaceholder")} value={description} onChange={(e) => setDescription(e.target.value)} data-testid="gs-description" />
            </Grid>
            <Grid size={{ xs: 6 }}>
              <FormControl fullWidth size="small">
                <InputLabel>{Locale.label("site.generateSite.tone")}</InputLabel>
                <Select label={Locale.label("site.generateSite.tone")} value={tone} onChange={(e) => setTone(e.target.value)} data-testid="gs-tone">
                  {TONE_KEYS.map((k) => <MenuItem key={k} value={k}>{Locale.label("site.generateSite.tone_" + k)}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <TextField size="small" fullWidth label={Locale.label("site.generateSite.serviceTimes")} placeholder={Locale.label("site.generateSite.serviceTimesPlaceholder")} value={serviceTimes} onChange={(e) => setServiceTimes(e.target.value)} data-testid="gs-service-times" />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <Typography variant="body2" sx={{ mb: 0.5 }}>{Locale.label("site.generateSite.audiences")}</Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {AUDIENCE_KEYS.map((k) => (
                  <Chip key={k} label={Locale.label("site.generateSite.audience_" + k)} color={audiences.includes(k) ? "primary" : "default"} variant={audiences.includes(k) ? "filled" : "outlined"} onClick={() => toggleAudience(k)} data-testid={"gs-audience-" + k} />
                ))}
              </Stack>
            </Grid>
          </Grid>
        )}

        {phase === "plan" && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{Locale.label("site.generateSite.planIntro")}</Typography>
            {plan.map((page, i) => (
              <Box key={i} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "var(--b1-radius-control)", p: 1.5, mb: 1 }}>
                <FormControlLabel control={<Checkbox checked={includes[i]} onChange={(e) => setIncludes((inc) => inc.map((v, idx) => (idx === i ? e.target.checked : v)))} data-testid={"gs-include-" + i} />} label={<Typography sx={{ fontWeight: 600 }}>{page.title}</Typography>} />
                <List dense disablePadding sx={{ pl: 4 }}>
                  {page.sections.map((s) => <ListItem key={s.id} disableGutters sx={{ py: 0 }}><ListItemText primaryTypographyProps={{ variant: "body2", color: "text.secondary" }} primary={"• " + s.purpose} /></ListItem>)}
                </List>
              </Box>
            ))}
          </Box>
        )}

        {phase === "building" && (
          <Box>
            <Typography variant="body2" sx={{ mb: 1 }}>{progress}</Typography>
            {busy && <LinearProgress sx={{ mb: 2 }} />}
            {notes.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{notes.map((n) => <div key={n}>{n}</div>)}</Alert>}
            {!busy && <Button variant="contained" onClick={props.onDone} data-testid="gs-finish">{Locale.label("common.close")}</Button>}
          </Box>
        )}
      </FormCard>
    </Dialog>
  );
}
