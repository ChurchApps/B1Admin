import { useState } from "react";
import { Grid, Stack } from "@mui/material";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { CardWithHeader, PageHeader, PageContainer } from "../components/ui";
import { StylesManager, SiteWidgetsEdit, RedirectsEdit, SiteSwitcher, SitesDialog, useSiteSelection } from "./components";
import { PermissionDenied } from "../components";

export const AppearancePage = () => {
  const { siteId, setSiteId, sites, selectedSite, reloadSites } = useSiteSelection();
  const [showSites, setShowSites] = useState(false);

  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  return (
    <>
      <PageHeader
        title={Locale.label("site.appearancePage.title")}
        subtitle={Locale.label("site.appearancePage.subtitle")}
      >
        <SiteSwitcher siteId={siteId} onChange={setSiteId} sites={sites} onManage={() => setShowSites(true)} />
      </PageHeader>
      {showSites && (
        <SitesDialog open={showSites} onClose={() => setShowSites(false)} sites={sites} siteId={siteId} onChanged={reloadSites} onSelectSite={setSiteId} />
      )}
      <PageContainer>
        <Stack spacing={3}>
          {UserHelper.currentUserChurch && (
            <CardWithHeader title={Locale.label("site.appearancePage.themeGroup")}>
              <StylesManager siteId={siteId} selectedSite={selectedSite} />
            </CardWithHeader>
          )}
          {UserHelper.currentUserChurch && (
            <Grid container spacing={3} alignItems="stretch">
              <Grid size={{ xs: 12, lg: 6 }} sx={{ display: "flex", "& > *": { flexGrow: 1 } }}><SiteWidgetsEdit /></Grid>
              <Grid size={{ xs: 12, lg: 6 }} sx={{ display: "flex", "& > *": { flexGrow: 1 } }}><RedirectsEdit /></Grid>
            </Grid>
          )}
        </Stack>
      </PageContainer>
    </>
  );
};
