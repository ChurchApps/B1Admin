import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Chip, CircularProgress, Stack, Typography, Paper } from "@mui/material";
import { AutoAwesome as AutoAwesomeIcon, Edit as EditIcon, Settings as SettingsIcon, Web as WebIcon } from "@mui/icons-material";
import { ApiHelper, PageHeader, Locale } from "@churchapps/apphelper";
import UserContext from "../UserContext";
import { EnvironmentHelper } from "../helpers/EnvironmentHelper";
import type { PageInterface, SiteInterface } from "../helpers/Interfaces";
import type { LinkInterface } from "@churchapps/helpers";
import { PageLinkEdit } from "./components/PageLinkEdit";
import { Breadcrumbs, type BreadcrumbItem, HeaderPrimaryButton, HeaderSecondaryButton } from "../components/ui";
import { getAiPageSession, toSnapshot } from "./aiPageCandidates";
import { clearSiteCache } from "./siteCache";

export const PagePreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const context = useContext(UserContext);
  const [pageData, setPageData] = useState<PageInterface | null>(null);
  const [link, setLink] = useState<LinkInterface | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [siteSubDomain, setSiteSubDomain] = useState<string>("");
  const aiSession = getAiPageSession(id);
  const [aiShown, setAiShown] = useState<number>(aiSession?.shown ?? 0);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);

  // Swaps the page content for the next generated candidate. The candidate is only written when first asked for.
  const handleTryAnotherLayout = async () => {
    if (!aiSession || !id) return;
    const next = (aiShown + 1) % aiSession.candidates.length;
    setAiBusy(true);
    setAiError(false);
    try {
      const candidate = await aiSession.load(next);
      await ApiHelper.post("/pageHistory/restoreSnapshot", { pageId: id, snapshot: toSnapshot(id, candidate.sections || []) }, "ContentApi");
      clearSiteCache(siteSubDomain || undefined);
      aiSession.shown = next;
      setAiShown(next);
      setPreviewVersion((v) => v + 1);
      const candidates = aiSession.candidates.map((c) => ({ layout: c.layout, layoutScore: c.layoutScore, score: c.score }));
      ApiHelper.post("/website/feedback", { event: "switchLayout", pageType: aiSession.pageType, shown: next, candidates }, "AskApi").catch((): null => null);
    } catch {
      setAiError(true);
    } finally {
      setAiBusy(false);
    }
  };

  const loadData = () => {
    if (!id) return;

    ApiHelper.get("/pages/" + id, "ContentApi").then((data: PageInterface) => {
      setPageData(data);
    });

    const linkId = searchParams.get("linkId");
    if (linkId) {
      ApiHelper.get("/links/" + linkId, "ContentApi").then((data: LinkInterface) => {
        setLink(data);
      });
    }
  };

  const handlePageUpdated = (page: PageInterface | null, updatedLink: LinkInterface | null) => {
    setShowSettings(false);

    if (!page) {
      navigate("/site/pages");
      return;
    }

    loadData();

    if (updatedLink) {
      navigate(`/site/pages/preview/${page.id}?linkId=${updatedLink.id}`);
    } else {
      navigate(`/site/pages/preview/${page.id}`);
    }
  };

  const handleEditContent = () => {
    if (pageData?.id) navigate(`/site/pages/${pageData.id}`);
  };

  useEffect(() => {
    loadData();
  }, [id, searchParams]);

  // A secondary-site page previews on its own subdomain, not the church's.
  useEffect(() => {
    if (pageData?.siteId) {
      ApiHelper.get("/sites", "MembershipApi").then((sites: SiteInterface[]) => {
        const match = (Array.isArray(sites) ? sites : []).find((s) => s.id === pageData.siteId);
        setSiteSubDomain(match?.subDomain || "");
      }).catch(() => setSiteSubDomain(""));
    } else {
      setSiteSubDomain("");
    }
  }, [pageData?.siteId]);

  if (!pageData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>{Locale.label("site.pagePreview.loading")}</Typography>
      </Box>
    );
  }

  const previewSubDomain = siteSubDomain || context?.userChurch?.church?.subDomain || "";
  const previewUrl = EnvironmentHelper.B1Url.replace("{subdomain}", previewSubDomain) + pageData.url + "?t=" + Date.now() + "&v=" + previewVersion;

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: Locale.label("helpers.secondaryMenuHelper.site"), path: "/site" },
    { label: Locale.label("helpers.secondaryMenuHelper.pages"), path: "/site/pages" },
    { label: pageData.title || "" }
  ];

  return (
    <>
      <PageHeader icon={<WebIcon />} title={Locale.label("site.pagePreview.title")} subtitle={Locale.label("site.pagePreview.subtitle").replace("{title}", pageData.title || "")} breadcrumbs={<Breadcrumbs items={breadcrumbItems} showHome={true} />}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ width: { xs: "100%", sm: "auto" } }}>
          <HeaderSecondaryButton startIcon={<EditIcon />} onClick={handleEditContent}>{Locale.label("site.pagePreview.editContent")}</HeaderSecondaryButton>
          <HeaderPrimaryButton startIcon={<SettingsIcon />} onClick={() => setShowSettings(true)}>{Locale.label("site.pagePreview.pageSettings")}</HeaderPrimaryButton>
        </Stack>
      </PageHeader>

      {showSettings && (<PageLinkEdit link={link || undefined} page={pageData} updatedCallback={handlePageUpdated} onDone={() => setShowSettings(false)} />)}

      <Box sx={{ p: 3 }}>
        <Paper elevation={0} sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "grey.200" }}>
          <Box sx={{ backgroundColor: "grey.50", p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "primary.main" }}>
                {pageData.title}
              </Typography>
              <Chip
                size="small"
                data-testid="preview-publish-status"
                label={pageData.publishedAt ? Locale.label("site.editorToolbar.statusPublished") : Locale.label("site.editorToolbar.statusLiveOnSave")}
                sx={pageData.publishedAt
                  ? { fontWeight: 600, fontSize: "0.7rem", backgroundColor: "rgba(46, 125, 50, 0.1)", color: "success.dark" }
                  : { fontWeight: 600, fontSize: "0.7rem", backgroundColor: "var(--bg-sub)", color: "text.secondary" }}
              />
            </Stack>
            {pageData.publishedAt && (
              <Typography variant="caption" component="p" sx={{ display: "block", textAlign: "center", color: "text.secondary", mt: 0.5 }}>
                {Locale.label("site.pagePreview.showingPublished")}
              </Typography>
            )}
            {aiSession && aiSession.candidates.length > 1 && (
              <Stack direction="row" alignItems="center" justifyContent="center" spacing={1.5} sx={{ mt: 1.5 }}>
                <Typography variant="body2" color="text.secondary" data-testid="ai-layout-count">
                  {Locale.label("site.pagePreview.layoutCount").replace("{current}", (aiShown + 1).toString()).replace("{total}", aiSession.candidates.length.toString())}
                </Typography>
                <Button size="small" variant="outlined" startIcon={aiBusy ? <CircularProgress size={14} /> : <AutoAwesomeIcon />} disabled={aiBusy} onClick={handleTryAnotherLayout} data-testid="ai-try-another-layout">
                  {aiBusy ? Locale.label("site.pagePreview.preparingLayout") : Locale.label("site.pagePreview.tryAnotherLayout")}
                </Button>
              </Stack>
            )}
            {aiError && <Alert severity="warning" sx={{ mt: 1 }}>{Locale.label("site.pagePreview.layoutFailed")}</Alert>}
          </Box>

          <Box sx={{ position: "relative" }}>
            <iframe src={previewUrl} style={{ width: "100%", height: "80vh", minHeight: "600px", border: "none", display: "block" }} title={Locale.label("site.pagePreview.previewOf").replace("{title}", pageData.title || "")} />
          </Box>
        </Paper>
      </Box>
    </>
  );
};
