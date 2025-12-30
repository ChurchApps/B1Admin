import React, { useEffect, useState, useContext } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Box, Button, Stack, Typography, Paper } from "@mui/material";
import { Edit as EditIcon, Settings as SettingsIcon, Web as WebIcon } from "@mui/icons-material";
import { ApiHelper, PageHeader, Locale } from "@churchapps/apphelper";
import UserContext from "../UserContext";
import { EnvironmentHelper } from "../helpers/EnvironmentHelper";
import type { PageInterface } from "../helpers/Interfaces";
import type { LinkInterface } from "@churchapps/helpers";
import { PageLinkEdit } from "./components/PageLinkEdit";

export const PagePreview: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const context = useContext(UserContext);
  const [pageData, setPageData] = useState<PageInterface | null>(null);
  const [link, setLink] = useState<LinkInterface | null>(null);
  const [showSettings, setShowSettings] = useState(false);

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

  if (!pageData) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  const previewUrl = EnvironmentHelper.B1Url.replace('{subdomain}', context.userChurch?.church?.subDomain || '') + pageData.url + '?t=' + Date.now();

  return (
    <>
      <PageHeader icon={<WebIcon />} title={Locale.label("site.pagePreview.title")} subtitle={Locale.label("site.pagePreview.subtitle").replace("{title}", pageData.title)}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ width: { xs: '100%', sm: 'auto' } }}>
          <Button variant="outlined" startIcon={<EditIcon />} onClick={handleEditContent} sx={{ color: '#FFF', borderColor: 'rgba(255,255,255,0.5)', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#FFF', backgroundColor: 'rgba(255,255,255,0.1)' } }}>{Locale.label("site.pagePreview.editContent")}</Button>
          <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setShowSettings(true)} sx={{ color: '#FFF', borderColor: 'rgba(255,255,255,0.5)', textTransform: 'none', fontWeight: 600, '&:hover': { borderColor: '#FFF', backgroundColor: 'rgba(255,255,255,0.1)' } }}>{Locale.label("site.pagePreview.pageSettings")}</Button>
        </Stack>
      </PageHeader>

      {showSettings && (<PageLinkEdit link={link || undefined} page={pageData} updatedCallback={handlePageUpdated} onDone={() => setShowSettings(false)} />)}

      <Box sx={{ p: 3 }}>
        <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'grey.200' }}>
          <Box sx={{ backgroundColor: 'grey.50', p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" justifyContent="center">
              <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main' }}>
                {pageData.title}
              </Typography>
            </Stack>
          </Box>

          <Box sx={{ position: 'relative' }}>
            <iframe src={previewUrl} style={{ width: '100%', height: '80vh', minHeight: '600px', border: 'none', display: 'block' }} title={`Preview of ${pageData.title}`} />
          </Box>
        </Paper>
      </Box>
    </>
  );
};
