import { useState } from "react";
import { Box, Card, Stack, Typography } from "@mui/material";
import { UserHelper, Permissions, PageHeader, Locale } from "@churchapps/apphelper";
import { StylesManager, SiteWidgetsEdit, RedirectsEdit, SiteSwitcher, SitesDialog, useSiteSelection } from "./components";
import { Palette as PaletteIcon } from "@mui/icons-material";
import { PermissionDenied } from "../components";

export const AppearancePage = () => {
  const { siteId, setSiteId, sites, selectedSite, reloadSites } = useSiteSelection();
  const [showSites, setShowSites] = useState(false);

  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  return (
    <>
      <PageHeader
        icon={<PaletteIcon />}
        title={Locale.label("site.appearancePage.title")}
        subtitle={Locale.label("site.appearancePage.subtitle")}
      >
        <SiteSwitcher siteId={siteId} onChange={setSiteId} sites={sites} onManage={() => setShowSites(true)} />
      </PageHeader>
      {showSites && (
        <SitesDialog open={showSites} onClose={() => setShowSites(false)} sites={sites} siteId={siteId} onChanged={reloadSites} onSelectSite={setSiteId} />
      )}
      <Box sx={{ p: 3 }}>
        {UserHelper.currentUserChurch && <SiteWidgetsEdit />}
        {UserHelper.currentUserChurch && <RedirectsEdit />}
        {UserHelper.currentUserChurch && (
          <Card sx={{ borderRadius: 2, border: "1px solid", borderColor: "grey.200", mb: 3 }}>
            <Box sx={{ p: 2, borderBottom: 1, borderColor: "var(--border-light)" }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <PaletteIcon sx={{ color: "primary.main", fontSize: 20 }} />
                <Typography variant="h6">{Locale.label("site.appearancePage.themeGroup")}</Typography>
              </Stack>
            </Box>
            <Box sx={{ p: 2 }}>
              <StylesManager siteId={siteId} selectedSite={selectedSite} />
            </Box>
          </Card>
        )}
      </Box>
    </>
  );
};
