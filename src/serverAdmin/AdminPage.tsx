import React from "react";
import { Locale, Permissions } from "@churchapps/apphelper";
import { Grid, Box } from "@mui/material";
import { Church as ChurchIcon, ShowChart as UsageIcon, Book as TranslationIcon, HealthAndSafety as HealthIcon, SwitchAccount as ImpersonateIcon, AdminPanelSettings as AdminIcon } from "@mui/icons-material";
import { PageHeader } from "@churchapps/apphelper";
import { UsageTrendsTab } from "./components/UsageTrendTab";
import { ChurchesTab } from "./components/ChurchesTab";
import { TranslationTab } from "./components/TranslationTab";
import { ImpersonateTab } from "./components/ImpersonateTab";
import { ServerHealthTab } from "./components/ServerHealthTab";
import { SettingsConfigList, type ConfigSection } from "../settings/components/SettingsConfigList";
import { useRequirePermission } from "../hooks";

export const AdminPage = () => {
  const [selectedTab, setSelectedTab] = React.useState("churches");

  const denied = useRequirePermission(Permissions.membershipApi.server.admin);
  if (denied) return denied;

  const getCurrentTab = () => {
    switch (selectedTab) {
      case "churches": return <ChurchesTab key="churches" />;
      case "impersonate": return <ImpersonateTab key="impersonate" />;
      case "usage": return <UsageTrendsTab key="usage" />;
      case "translation": return <TranslationTab key="translation" />;
      case "serverHealth": return <ServerHealthTab key="serverHealth" />;
      default: return <div></div>;
    }
  };

  const sections: ConfigSection[] = [
    { key: "churches", title: Locale.label("serverAdmin.adminPage.churches"), subtitle: Locale.label("serverAdmin.adminPage.churchesSubtitle"), icon: <ChurchIcon />, color: "primary" },
    { key: "impersonate", title: Locale.label("serverAdmin.adminPage.impersonateUser"), subtitle: Locale.label("serverAdmin.adminPage.impersonateSubtitle"), icon: <ImpersonateIcon />, color: "secondary" },
    { key: "usage", title: Locale.label("serverAdmin.adminPage.usageTrends"), subtitle: Locale.label("serverAdmin.adminPage.usageSubtitle"), icon: <UsageIcon />, color: "info" },
    { key: "translation", title: Locale.label("serverAdmin.adminPage.translationLookups"), subtitle: Locale.label("serverAdmin.adminPage.translationSubtitle"), icon: <TranslationIcon />, color: "warning" },
    { key: "serverHealth", title: Locale.label("serverAdmin.adminPage.serverHealth"), subtitle: Locale.label("serverAdmin.adminPage.serverHealthSubtitle"), icon: <HealthIcon />, color: "success" }
  ];

  return (
    <>
      <PageHeader icon={<AdminIcon />} title={Locale.label("serverAdmin.adminPage.servAdmin")} subtitle={Locale.label("serverAdmin.adminPage.subtitle")} />

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <SettingsConfigList sections={sections} selected={selectedTab} onSelect={setSelectedTab} />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Box>{getCurrentTab()}</Box>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};
