import React from "react";
import { useSearchParams } from "react-router-dom";
import { Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { UsageTrendsTab } from "./components/UsageTrendTab";
import { ChurchesTab } from "./components/ChurchesTab";
import { TranslationTab } from "./components/TranslationTab";
import { ImpersonateTab } from "./components/ImpersonateTab";
import { ServerHealthTab } from "./components/ServerHealthTab";
import { UsersTab } from "./components/UsersTab";
import { JobsTab } from "./components/JobsTab";
import { CommonsTab } from "./components/CommonsTab";
import { useRequirePermission } from "../hooks";
import { CommonsApi, type CommonsAdminStatus } from "./commonsApi";
import { DirectoryPage, type PillItem } from "./components/plate";

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
  const [commonsStatus, setCommonsStatus] = React.useState<CommonsAdminStatus>({});
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
        const status: CommonsAdminStatus = await CommonsApi.get("/admin/status");
        if (!cancelled && status) setCommonsStatus(status);
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
      case "commons": return <CommonsTab key="commons" musicEditor={!!commonsStatus.musicEditor && !commonsStatus.admin} />;
      case "usage": return <UsageTrendsTab key="usage" />;
      case "translation": return <TranslationTab key="translation" />;
      case "serverHealth": return <ServerHealthTab key="serverHealth" />;
      default: return <div></div>;
    }
  };

  const pills: PillItem[] = [
    { label: Locale.label("serverAdmin.adminPage.churches"), selected: selectedTab === "churches", onClick: () => onSelect("churches"), testId: "settings-section-churches" },
    { label: Locale.label("serverAdmin.adminPage.users"), selected: selectedTab === "users", onClick: () => onSelect("users"), testId: "settings-section-users" },
    { label: Locale.label("serverAdmin.adminPage.impersonateUser"), selected: selectedTab === "impersonate", onClick: () => onSelect("impersonate"), testId: "settings-section-impersonate" },
    { label: Locale.label("serverAdmin.adminPage.jobs"), selected: selectedTab === "jobs", onClick: () => onSelect("jobs"), testId: "settings-section-jobs" },
    { label: Locale.label("serverAdmin.adminPage.commons"), selected: selectedTab === "commons", onClick: () => onSelect("commons"), count: pendingCount, testId: "settings-section-commons" },
    { label: Locale.label("serverAdmin.adminPage.usageTrends"), selected: selectedTab === "usage", onClick: () => onSelect("usage"), testId: "settings-section-usage" },
    { label: Locale.label("serverAdmin.adminPage.translationLookups"), selected: selectedTab === "translation", onClick: () => onSelect("translation"), testId: "settings-section-translation" },
    { label: Locale.label("serverAdmin.adminPage.serverHealth"), selected: selectedTab === "serverHealth", onClick: () => onSelect("serverHealth"), testId: "settings-section-serverHealth" }
  ];

  return (
    <DirectoryPage
      title={Locale.label("serverAdmin.adminPage.servAdmin")}
      lede={Locale.label("serverAdmin.adminPage.subtitle")}
      pills={pills}
      wide>
      {getCurrentTab()}
    </DirectoryPage>
  );
};
