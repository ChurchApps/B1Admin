import React, { useEffect, useState, useContext } from "react";
import { Link as RouterLink, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Box, Stack, Typography, Button } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import UserContext from "../UserContext";
import { EnvironmentHelper } from "../helpers/EnvironmentHelper";
import type { PageInterface, SiteInterface } from "../helpers/Interfaces";
import type { LinkInterface } from "@churchapps/helpers";
import { PageLinkEdit } from "./components/PageLinkEdit";
import { PageContainer, RecordLayout, StatusBadge, TextAction, RecordActions } from "../components/ui";

export const PagePreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const context = useContext(UserContext);
  const [pageData, setPageData] = useState<PageInterface | null>(null);
  const [link, setLink] = useState<LinkInterface | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [siteSubDomain, setSiteSubDomain] = useState<string>("");
  const [loadedAt, setLoadedAt] = useState<number>(0);

  const loadData = () => {
    if (!id) return;

    ApiHelper.get("/pages/" + id, "ContentApi").then((data: PageInterface) => {
      setPageData(data);
      setLoadedAt(Date.now());
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
  const previewUrl = EnvironmentHelper.B1Url.replace("{subdomain}", previewSubDomain) + pageData.url + "?t=" + loadedAt;

  return (
    <>
      {showSettings && (<PageLinkEdit link={link || undefined} page={pageData} updatedCallback={handlePageUpdated} onDone={() => setShowSettings(false)} />)}

      <PageContainer>
        <RecordLayout
          identity={(
            <Stack spacing={1.5} alignItems="flex-start">
              <Typography id="page-header-title" variant="h1" sx={{ overflowWrap: "anywhere" }}>{pageData.title}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: "anywhere" }}>{pageData.url}</Typography>
              <StatusBadge tone={pageData.publishedAt ? "success" : "neutral"} data-testid="preview-publish-status">
                {pageData.publishedAt ? Locale.label("site.editorToolbar.statusPublished") : Locale.label("site.editorToolbar.statusLiveOnSave")}
              </StatusBadge>
              {pageData.publishedAt && (
                <Typography variant="caption" component="p" color="text.secondary">
                  {Locale.label("site.pagePreview.showingPublished")}
                </Typography>
              )}
              <RecordActions
                sx={{ mt: 1 }}
                buttons={<>
                  <Button variant="contained" component={RouterLink} to={`/site/pages/${pageData.id}`}>{Locale.label("site.pagePreview.editContent")}</Button>
                  <Button variant="outlined" onClick={() => setShowSettings(true)}>{Locale.label("site.pagePreview.pageSettings")}</Button>
                </>}>
                <TextAction small to="/site/pages" component={RouterLink}>{Locale.label("helpers.secondaryMenuHelper.pages")}</TextAction>
              </RecordActions>
            </Stack>
          )}
          sliceSx={{ p: { xs: 0, md: 0 } }}>
          <Box component="iframe" src={previewUrl} title={Locale.label("site.pagePreview.previewOf").replace("{title}", pageData.title || "")} sx={{ width: "100%", height: "80vh", minHeight: 600, border: 0, display: "block", borderRadius: { md: "0 var(--b1-radius-panel) var(--b1-radius-panel) 0" } }} />
        </RecordLayout>
      </PageContainer>
    </>
  );
};
