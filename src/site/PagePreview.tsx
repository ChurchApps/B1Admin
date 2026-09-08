import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, useSearchParams, Link as RouterLink } from "react-router-dom";
import { Box, Chip, Typography } from "@mui/material";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import UserContext from "../UserContext";
import { EnvironmentHelper } from "../helpers/EnvironmentHelper";
import type { PageInterface, SiteInterface } from "../helpers/Interfaces";
import type { LinkInterface } from "@churchapps/helpers";
import { PageLinkEdit } from "./components/PageLinkEdit";
import { Plate, Record, Verbs, verbSx, h1Sx, ledeSx } from "./plated";

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
      <Plate directory>
        <Typography>{Locale.label("site.pagePreview.loading")}</Typography>
      </Plate>
    );
  }

  const previewSubDomain = siteSubDomain || context?.userChurch?.church?.subDomain || "";
  const previewUrl = EnvironmentHelper.B1Url.replace("{subdomain}", previewSubDomain) + pageData.url + "?t=" + Date.now();

  return (
    <Plate>
      {showSettings && (<PageLinkEdit link={link || undefined} page={pageData} updatedCallback={handlePageUpdated} onDone={() => setShowSettings(false)} />)}
      <Record
        who={(
          <>
            <Box component="h1" sx={h1Sx}>{pageData.title || ""}</Box>
            <Box sx={ledeSx}>{pageData.url}</Box>
            <Chip
              size="small"
              data-testid="preview-publish-status"
              label={pageData.publishedAt ? Locale.label("site.editorToolbar.statusPublished") : Locale.label("site.editorToolbar.statusLiveOnSave")}
              sx={pageData.publishedAt
                ? { fontWeight: 600, fontSize: "0.7rem", backgroundColor: "rgba(46, 125, 50, 0.1)", color: "success.dark" }
                : { fontWeight: 600, fontSize: "0.7rem", backgroundColor: "var(--bg-sub)", color: "text.secondary" }}
            />
            {pageData.publishedAt && (
              <Typography variant="caption" sx={{ display: "block", color: "text.secondary", mt: 1 }}>
                {Locale.label("site.pagePreview.showingPublished")}
              </Typography>
            )}
            <Verbs>
              <Box component={RouterLink} to="/site/pages" sx={verbSx}>{Locale.label("helpers.secondaryMenuHelper.pages")}</Box>
              <Box component="button" type="button" onClick={handleEditContent} sx={verbSx}>{Locale.label("site.pagePreview.editContent")}</Box>
              <Box component="button" type="button" onClick={() => setShowSettings(true)} sx={verbSx}>{Locale.label("site.pagePreview.pageSettings")}</Box>
            </Verbs>
          </>
        )}
        rest={(
          <iframe src={previewUrl} style={{ width: "100%", height: "70vh", minHeight: "480px", border: "1px solid var(--border-main)", borderRadius: 8, display: "block", background: "var(--bg-paper, #fff)" }} title={Locale.label("site.pagePreview.previewOf").replace("{title}", pageData.title || "")} />
        )}
      />
    </Plate>
  );
};
