import React from "react";
import { useSearchParams } from "react-router-dom";
import { Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { Grid, Box } from "@mui/material";
import { Church as ChurchIcon, ShowChart as UsageIcon, Book as TranslationIcon, HealthAndSafety as HealthIcon, SwitchAccount as ImpersonateIcon, AdminPanelSettings as AdminIcon, PersonSearch as UsersIcon, Schedule as JobsIcon, Inventory2 as CommonsIcon } from "@mui/icons-material";
import { PageHeader } from "@churchapps/apphelper";
import { UsageTrendsTab } from "./components/UsageTrendTab";
import { ChurchesTab } from "./components/ChurchesTab";
import { TranslationTab } from "./components/TranslationTab";
import { ImpersonateTab } from "./components/ImpersonateTab";
import { ServerHealthTab } from "./components/ServerHealthTab";
import { UsersTab } from "./components/UsersTab";
import { JobsTab } from "./components/JobsTab";
import { CommonsTab } from "./components/CommonsTab";
import { SettingsConfigList, type ConfigSection } from "../settings/components/SettingsConfigList";
import { useRequirePermission } from "../hooks";
import { CommonsApi } from "./commonsApi";

const SECTION_KEYS = [
  "churches",
  "users",
  "impersonate",
  "jobs",
  "commons",
  "usage",
  "translation",
  "serverHealth"
] as const;

export const AdminPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingCount, setPendingCount] = React.useState(0);
  const denied = useRequirePermission(Permissions.membershipApi.server.admin);

  const tabParam = searchParams.get("tab") || "";
  const selectedTab = (SECTION_KEYS as readonly string[]).includes(tabParam) ? tabParam : "churches";

  const onSelect = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.set("tab", key);
    setSearchParams(next);
  };

  React.useEffect(() => {
    if (!UserHelper.checkAccess(Permissions.membershipApi.server.admin)) return;
    let cancelled = false;
    const load = async () => {
      try {
        const status = await CommonsApi.get("/admin/status");
        if (typeof status?.pendingCount === "number") {
          if (!cancelled) setPendingCount(status.pendingCount);
          return;
        }
      } catch { /* fall back to the queue length */ }
      try {
        const rows = await CommonsApi.get("/admin/submissions?status=pending");
        if (!cancelled) setPendingCount(Array.isArray(rows) ? rows.length : 0);
      } catch {
        if (!cancelled) setPendingCount(0);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  if (denied) return denied;

  const getCurrentTab = () => {
    switch (selectedTab) {
      case "churches": return <ChurchesTab key="churches" />;
      case "users": return <UsersTab key="users" />;
      case "impersonate": return <ImpersonateTab key="impersonate" />;
      case "jobs": return <JobsTab key="jobs" />;
      case "commons": return <CommonsTab key="commons" />;
      case "usage": return <UsageTrendsTab key="usage" />;
      case "translation": return <TranslationTab key="translation" />;
      case "serverHealth": return <ServerHealthTab key="serverHealth" />;
      default: return <div></div>;
    }
  };

  const sections: ConfigSection[] = [
    { key: "churches", title: Locale.label("serverAdmin.adminPage.churches"), subtitle: Locale.label("serverAdmin.adminPage.churchesSubtitle"), icon: <ChurchIcon />, color: "primary" },
    { key: "users", title: Locale.label("serverAdmin.adminPage.users"), subtitle: Locale.label("serverAdmin.adminPage.usersSubtitle"), icon: <UsersIcon />, color: "primary" },
    { key: "impersonate", title: Locale.label("serverAdmin.adminPage.impersonateUser"), subtitle: Locale.label("serverAdmin.adminPage.impersonateSubtitle"), icon: <ImpersonateIcon />, color: "secondary" },
    { key: "jobs", title: Locale.label("serverAdmin.adminPage.jobs"), subtitle: Locale.label("serverAdmin.adminPage.jobsSubtitle"), icon: <JobsIcon />, color: "info" },
    { key: "commons", title: Locale.label("serverAdmin.adminPage.commons"), subtitle: Locale.label("serverAdmin.adminPage.commonsSubtitle"), icon: <CommonsIcon />, color: "warning", count: pendingCount },
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
            <SettingsConfigList sections={sections} selected={selectedTab} onSelect={onSelect} />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            <Box>{getCurrentTab()}</Box>
          </Grid>
        </Grid>
      </Box>
    </>
  );
};
