import { useState } from "react";
import { Box } from "@mui/material";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { StylesManager, SiteWidgetsEdit, RedirectsEdit, SiteSwitcher, SitesDialog, useSiteSelection } from "./components";
import { PermissionDenied } from "../components";
import { Plate, Record, h1Sx, ledeSx, SectionLabel } from "./plated";

export const AppearancePage = () => {
  const { siteId, setSiteId, sites, selectedSite, reloadSites } = useSiteSelection();
  const [showSites, setShowSites] = useState(false);

  if (!UserHelper.checkAccess(Permissions.contentApi.content.edit)) return <PermissionDenied permissions={[Permissions.contentApi.content.edit]} />;

  return (
    <Plate>
      {showSites && (
        <SitesDialog open={showSites} onClose={() => setShowSites(false)} sites={sites} siteId={siteId} onChanged={reloadSites} onSelectSite={setSiteId} />
      )}
      <Record
        who={(
          <>
            <Box component="h1" sx={h1Sx}>{Locale.label("site.appearancePage.title")}</Box>
            <Box sx={ledeSx}>{Locale.label("site.appearancePage.subtitle")}</Box>
            <Box sx={{ mt: 2 }}>
              <SiteSwitcher siteId={siteId} onChange={setSiteId} sites={sites} onManage={() => setShowSites(true)} />
            </Box>
          </>
        )}
        rest={(
          <>
            <SectionLabel sx={{ mt: 0 }}>{Locale.label("site.appearancePage.themeGroup")}</SectionLabel>
            {UserHelper.currentUserChurch && <StylesManager siteId={siteId} selectedSite={selectedSite} />}
            <SectionLabel>{Locale.label("common.more", "More")}</SectionLabel>
            {UserHelper.currentUserChurch && <SiteWidgetsEdit />}
            {UserHelper.currentUserChurch && <RedirectsEdit />}
          </>
        )}
      />
    </Plate>
  );
};
