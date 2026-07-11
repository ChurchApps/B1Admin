import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Box, Chip, Stack, Typography, Paper } from "@mui/material";
import { Edit as EditIcon, Settings as SettingsIcon, Web as WebIcon } from "@mui/icons-material";
import { ApiHelper, PageHeader, Locale } from "@churchapps/apphelper";
import UserContext from "../UserContext";
import { EnvironmentHelper } from "../helpers/EnvironmentHelper";
import type { PageInterface, SiteInterface } from "../helpers/Interfaces";
import type { LinkInterface } from "@churchapps/helpers";
import { PageLinkEdit } from "./components/PageLinkEdit";
import { Breadcrumbs, type BreadcrumbItem, HeaderPrimaryButton, HeaderSecondaryButton } from "../components/ui";

export const PagePreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const context = useContext(UserContext);
  const [pageData, setPageData] = useState<PageInterface | null>(null);
  const [link, setLink] = useState<LinkInterface | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [siteSubDomain, setSiteSubDomain] = useState<string>("");

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
  const previewUrl = EnvironmentHelper.B1Url.replace("{subdomain}", previewSubDomain) + pageData.url + "?t=" + Date.now();

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
          </Box>

          <Box sx={{ position: "relative" }}>
            <iframe src={previewUrl} style={{ width: "100%", height: "80vh", minHeight: "600px", border: "none", display: "block" }} title={Locale.label("site.pagePreview.previewOf").replace("{title}", pageData.title || "")} />
          </Box>
        </Paper>
      </Box>
    </>
  );
};
