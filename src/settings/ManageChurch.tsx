import React, { useCallback, useEffect, useState } from "react";
import { type ChurchInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, Locale, ApiHelper, Loading, DateHelper } from "@churchapps/apphelper";
import { useLocation, Link as RouterLink } from "react-router-dom";
import { PermissionDenied } from "../components";
import { Box, Link as MuiLink, Typography } from "@mui/material";
import { TextAction, VerbRow } from "../components/ui";
import { Business as BusinessIcon, Tune as TuneIcon, VolunteerActivism as VolunteerActivismIcon, Sms as SmsIcon, Language as LanguageIcon, Code as CodeIcon, School as SchoolIcon, HowToReg as HowToRegIcon, ListAlt as ListAltIcon, Cloud as CloudIcon, Public as PublicIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { SettingsLayout, SettingsRow, eyebrowSx } from "./components/SettingsPage";
import { type ConfigSection } from "./components/SettingsConfigList";
import { SectionNav } from "./components/SectionNav";
import { ChurchInfoSection } from "./components/ChurchInfoSection";
import { SettingsToggleSection } from "./components/SettingsToggleSection";
import { CampusesSection } from "./components/CampusesSection";
import { CustomFieldsSection } from "./components/CustomFieldsSection";
import { DeveloperSection } from "./components/DeveloperSection";
import { SupportContactSettingsEdit } from "./components/SupportContactSettingsEdit";
import { GivingSettingsEdit } from "./components/GivingSettingsEdit";
import { TextingSettingsEdit } from "./components/TextingSettingsEdit";
import { StorageSettingsEdit } from "./components/StorageSettingsEdit";
import { DomainSettingsEdit } from "./components/DomainSettingsEdit";
import { GradePromotionSettingsEdit } from "./components/GradePromotionSettingsEdit";
import { CheckinSettingsEdit } from "./components/CheckinSettingsEdit";
import { RegionSettingsEdit, regionName, regionSample } from "./components/RegionSettingsEdit";

const SECTION_KEYS = [
  "church-info", "general", "region", "giving", "texting", "storage", "domains", "grade-promotion", "check-ins", "campuses", "custom-fields", "developer"
];

export const ManageChurch = () => {
  const location = useLocation();
  const hash = location.hash?.replace("#", "");

  const jwt = ApiHelper.getConfig("MembershipApi").jwt;
  const churchId = UserHelper.currentUserChurch.church.id || "";

  const hasAccess = UserHelper.checkAccess(Permissions.membershipApi.settings.edit);
  const hasGiving = UserHelper.checkAccess(Permissions.givingApi.settings.edit);

  const [selected, setSelected] = useState(SECTION_KEYS.includes(hash) ? hash : "church-info");

  const church = useQuery<ChurchInterface>({
    queryKey: [`/churches/${churchId}?include=permissions`, "MembershipApi"],
    enabled: !!churchId
  });
  const settingsQ = useQuery<any[]>({ queryKey: ["/settings", "MembershipApi"], placeholderData: [], enabled: hasAccess });
  const gateways = useQuery<any[]>({ queryKey: ["/gateways", "GivingApi"], placeholderData: [], enabled: hasGiving });
  const texting = useQuery<any[]>({ queryKey: ["/texting/providers", "MessagingApi"], placeholderData: [], enabled: hasAccess });
  const storage = useQuery<any[]>({ queryKey: ["/storage/providers", "ContentApi"], placeholderData: [], enabled: hasAccess });
  const domains = useQuery<any[]>({ queryKey: ["/domains", "MembershipApi"], placeholderData: [], enabled: hasAccess });
  const campuses = useQuery<any[]>({ queryKey: ["/campuses", "MembershipApi"], placeholderData: [], enabled: hasAccess });
  const personFields = useQuery<any[]>({ queryKey: ["/personfields", "MembershipApi"], placeholderData: [], enabled: hasAccess });

  useEffect(() => {
    if (!hash || church.isLoading) return;
    document.getElementById(`section-${hash}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, church.isLoading]);

  // Router navigation remounts the whole Authenticated layout (it re-renders on every location change), wiping open editors, so the hash is written directly.
  const selectSection = (key: string) => {
    setSelected(key);
    window.history.replaceState(window.history.state, "", `#${key}`);
    document.getElementById(`section-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSaved = useCallback(() => {
    church.refetch();
    settingsQ.refetch();
    gateways.refetch();
    texting.refetch();
    storage.refetch();
    domains.refetch();
  }, [church, settingsQ, gateways, texting, storage, domains]);

  if (!hasAccess) return <PermissionDenied permissions={[Permissions.membershipApi.settings.edit]} />;
  if (church.isLoading) return <Loading />;
  if (!church.data) return <div>{Locale.label("settings.manageChurch.noData")}</div>;

  const supportContact = (settingsQ.data || []).find((s) => s.keyName === "supportContact")?.value;
  const region = DateHelper.normalizeLocale((settingsQ.data || []).find((s) => s.keyName === "region")?.value);
  const regionSubtitle = regionName(region);
  const gateway = (gateways.data || [])[0];
  const textingProvider = (texting.data || [])[0]?.provider;
  const domainList = domains.data || [];
  const campusCount = (campuses.data || []).length;
  const personFieldCount = (personFields.data || []).length;
  const gradePromotionDate = (settingsQ.data || []).find((s) => s.keyName === "gradePromotionDate")?.value;
  const ratioEnforcement = (settingsQ.data || []).find((s) => s.keyName === "ratioEnforcement")?.value === "block" ? "block" : "warn";
  const checkinsSubtitle = Locale.label("settings.checkinSettingsEdit." + ratioEnforcement);
  const gradePromotionSubtitle = gradePromotionDate
    ? Locale.label("settings.landing.gradePromotionOn").replace("{date}", new Date(2000, Number(gradePromotionDate.split("-")[0]) - 1, Number(gradePromotionDate.split("-")[1])).toLocaleDateString(DateHelper.locale, { month: "long", day: "numeric" }))
    : Locale.label("settings.landing.gradePromotionOff");

  const domainsSubtitle = domainList.length === 0
    ? Locale.label("settings.landing.domainsNone")
    : domainList.length === 1
      ? Locale.label("settings.landing.domainsOne")
      : Locale.label("settings.landing.domainsCount").replace("{count}", String(domainList.length));
  const campusesSubtitle = campusCount === 0
    ? Locale.label("settings.landing.campusesSubtitle")
    : campusCount === 1
      ? Locale.label("settings.landing.campusesOne")
      : Locale.label("settings.landing.campusesCount").replace("{count}", String(campusCount));
  const customFieldsSubtitle = personFieldCount === 0
    ? Locale.label("settings.landing.customFieldsSubtitle")
    : Locale.label("settings.landing.customFieldsCount").replace("{count}", String(personFieldCount));
  const givingSubtitle = gateway
    ? Locale.label("settings.landing.givingProvider").replace("{provider}", gateway.provider || "").replace("{currency}", (gateway.currency || "").toUpperCase())
    : Locale.label("settings.landing.notConfigured");
  const textingSubtitle = textingProvider || Locale.label("settings.landing.notConfigured");
  const storageProviderName = (storage.data || []).find((p) => p.enabled)?.provider;
  const storageNames: Record<string, string> = { ministrystuff: "MinistryStuff", googledrive: "Google Drive", dropbox: "Dropbox", onedrive: "OneDrive", s3: "S3" };
  const storageSubtitle = storageNames[storageProviderName] || Locale.label("settings.storageSettingsEdit.churchAppsFree");

  const sections: ConfigSection[] = [
    { key: "church-info", title: Locale.label("settings.churchSettingsEdit.churchInfo"), subtitle: church.data.name || Locale.label("settings.churchSettingsEdit.churchInfoSubtitle"), icon: <BusinessIcon />, color: "primary", status: "ok" },
    { key: "general", title: Locale.label("settings.churchSettingsEdit.general"), subtitle: Locale.label("settings.supportContactSettingsEdit.supportContact"), icon: <TuneIcon />, color: "secondary" },
    { key: "region", title: Locale.label("settings.regionSettingsEdit.title"), subtitle: regionSubtitle, icon: <PublicIcon />, color: "info" },
    ...(hasGiving ? [{ key: "giving", title: Locale.label("settings.givingSettingsEdit.giving"), subtitle: givingSubtitle, icon: <VolunteerActivismIcon />, color: "success", status: gateway ? "ok" : "todo" } as ConfigSection] : []),
    { key: "texting", title: Locale.label("settings.churchSettingsEdit.textingTitle"), subtitle: textingSubtitle, icon: <SmsIcon />, color: "warning", status: textingProvider ? "ok" : "todo" },
    { key: "storage", title: Locale.label("settings.storageSettingsEdit.title"), subtitle: storageSubtitle, icon: <CloudIcon />, color: "info" },
    { key: "domains", title: Locale.label("settings.domainSettingsEdit.domains"), subtitle: domainsSubtitle, icon: <LanguageIcon />, color: "info", status: domainList.length ? "ok" : "todo" },
    { key: "grade-promotion", title: Locale.label("settings.gradePromotionSettingsEdit.title"), subtitle: gradePromotionSubtitle, icon: <SchoolIcon />, color: "secondary" },
    { key: "check-ins", title: Locale.label("settings.checkinSettingsEdit.title"), subtitle: checkinsSubtitle, icon: <HowToRegIcon />, color: "info" },
    { key: "campuses", title: Locale.label("settings.campuses.campuses"), subtitle: campusesSubtitle, icon: <BusinessIcon />, color: "primary" },
    { key: "custom-fields", title: Locale.label("settings.customFields.customFields"), subtitle: customFieldsSubtitle, icon: <ListAltIcon />, color: "info" },
    { key: "developer", title: Locale.label("settings.developer.title"), subtitle: Locale.label("settings.landing.developerSubtitle"), icon: <CodeIcon />, color: "secondary" }
  ];

  const activeKey = sections.some((s) => s.key === selected) ? selected : "church-info";

  const givingView = gateway ? (
    <Box>
      <SettingsRow label={Locale.label("settings.givingSettingsEdit.prov")} value={gateway.provider} />
      <SettingsRow label={Locale.label("settings.givingSettingsEdit.currency")} value={(gateway.currency || "").toUpperCase()} />
    </Box>
  ) : (
    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{Locale.label("settings.landing.notConfigured")}</Typography>
  );

  const domainsView = domainList.length > 0 ? (
    <Box>
      {domainList.map((d) => <Typography key={d.id || d.domainName} variant="body2" sx={{ py: 0.75 }}>{d.domainName}</Typography>)}
    </Box>
  ) : (
    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{Locale.label("settings.landing.domainsNone")}</Typography>
  );

  const renderSection = (key: string) => {
    switch (key) {
      case "church-info":
        return <ChurchInfoSection church={church.data} onSaved={handleSaved} />;
      case "general":
        return (
          <SettingsToggleSection
            headerText={Locale.label("settings.churchSettingsEdit.general")}
            headerIcon="tune"
            data-testid="settings-general"
            view={<SettingsRow label={Locale.label("settings.supportContactSettingsEdit.supportContact")} value={supportContact || Locale.label("settings.landing.notSet")} />}
            renderEdit={(saveTrigger, onSaveComplete) => <SupportContactSettingsEdit churchId={churchId} saveTrigger={saveTrigger} onSaveComplete={onSaveComplete} />}
            onSaved={handleSaved}
          />
        );
      case "region":
        return (
          <SettingsToggleSection
            headerText={Locale.label("settings.regionSettingsEdit.title")}
            headerIcon="public"
            data-testid="settings-region"
            view={(
              <Box>
                <SettingsRow label={Locale.label("settings.regionSettingsEdit.region")} value={regionSubtitle} />
                <SettingsRow label={Locale.label("settings.regionSettingsEdit.dateFormat")} value={regionSample(region)} />
              </Box>
            )}
            renderEdit={(saveTrigger, onSaveComplete) => <RegionSettingsEdit churchId={churchId} saveTrigger={saveTrigger} onSaveComplete={onSaveComplete} />}
            onSaved={handleSaved}
          />
        );
      case "giving":
        return (
          <SettingsToggleSection
            headerText={Locale.label("settings.givingSettingsEdit.giving")}
            headerIcon="volunteer_activism"
            data-testid="settings-giving"
            view={givingView}
            renderEdit={(saveTrigger, onSaveComplete) => <GivingSettingsEdit churchId={churchId} churchInfo={church.data} saveTrigger={saveTrigger} onSaveComplete={onSaveComplete} />}
            onSaved={handleSaved}
          />
        );
      case "texting":
        return (
          <SettingsToggleSection
            headerText={Locale.label("settings.churchSettingsEdit.textingTitle")}
            headerIcon="sms"
            data-testid="settings-texting"
            view={<SettingsRow label={Locale.label("settings.textingSettingsEdit.provider")} value={textingProvider || Locale.label("settings.landing.notConfigured")} />}
            renderEdit={(saveTrigger, onSaveComplete) => <TextingSettingsEdit churchId={churchId} saveTrigger={saveTrigger} onSaveComplete={onSaveComplete} />}
            onSaved={handleSaved}
          />
        );
      case "storage":
        return (
          <SettingsToggleSection
            headerText={Locale.label("settings.storageSettingsEdit.title")}
            headerIcon="cloud"
            data-testid="settings-storage"
            view={<SettingsRow label={Locale.label("settings.storageSettingsEdit.provider")} value={storageSubtitle} />}
            renderEdit={(saveTrigger, onSaveComplete) => <StorageSettingsEdit churchId={churchId} saveTrigger={saveTrigger} onSaveComplete={onSaveComplete} />}
            onSaved={handleSaved}
          />
        );
      case "domains":
        return (
          <SettingsToggleSection
            headerText={Locale.label("settings.domainSettingsEdit.domains")}
            headerIcon="language"
            data-testid="settings-domains"
            view={domainsView}
            renderEdit={(saveTrigger, onSaveComplete) => <DomainSettingsEdit churchId={churchId} saveTrigger={saveTrigger} onSaveComplete={onSaveComplete} />}
            onSaved={handleSaved}
          />
        );
      case "grade-promotion":
        return (
          <SettingsToggleSection
            headerText={Locale.label("settings.gradePromotionSettingsEdit.title")}
            headerIcon="school"
            data-testid="settings-grade-promotion"
            view={<SettingsRow label={Locale.label("settings.gradePromotionSettingsEdit.title")} value={gradePromotionSubtitle} />}
            renderEdit={(saveTrigger, onSaveComplete) => <GradePromotionSettingsEdit churchId={churchId} saveTrigger={saveTrigger} onSaveComplete={onSaveComplete} />}
            onSaved={handleSaved}
          />
        );
      case "check-ins":
        return (
          <SettingsToggleSection
            headerText={Locale.label("settings.checkinSettingsEdit.title")}
            headerIcon="how_to_reg"
            data-testid="settings-check-ins"
            view={<>
              <SettingsRow label={Locale.label("settings.checkinSettingsEdit.ratioEnforcement")} value={checkinsSubtitle} />
              <Typography component={RouterLink} to="/mobile/checkin" variant="body2" sx={{ display: "inline-block", mt: 1, color: "var(--link)" }}>{Locale.label("settings.checkinSettingsEdit.kioskLink")}</Typography>
            </>}
            renderEdit={(saveTrigger, onSaveComplete) => <CheckinSettingsEdit churchId={churchId} saveTrigger={saveTrigger} onSaveComplete={onSaveComplete} />}
            onSaved={handleSaved}
          />
        );
      case "campuses":
        return <CampusesSection />;
      case "custom-fields":
        return <CustomFieldsSection />;
      case "developer":
        return <DeveloperSection />;
      default:
        return null;
    }
  };

  const address = [church.data.address1, church.data.address2, church.data.city, [church.data.state, church.data.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const importExportUrl = `https://transfer.b1.church/login?churchId=${churchId}#jwt=${encodeURIComponent(jwt || "")}`;

  return (
    <SettingsLayout
      eyebrow={Locale.label("components.wrapper.set")}
      title={church.data.name || Locale.label("settings.manageChurch.title")}
      subtitle={(
        <>
          {church.data.subDomain ? `${church.data.subDomain}.b1.church` : Locale.label("settings.manageChurch.subtitle")}
          {address && <Box component="span" data-testid="church-address" sx={{ display: "block", mt: 0.5 }}>{address}</Box>}
        </>
      )}
      verbs={(
        <VerbRow>
          <TextAction small to="/settings/email-templates" component={RouterLink} data-testid="settings-verb-email-templates">{Locale.label("settings.emailTemplatesPage.title")}</TextAction>
          <TextAction small to="/settings/audit-log" component={RouterLink} data-testid="settings-verb-audit-log">{Locale.label("settings.manageChurch.auditLog")}</TextAction>
          <TextAction small to="/settings/batches" component={RouterLink} data-testid="settings-verb-batches">{Locale.label("settings.manageChurch.batches")}</TextAction>
          <MuiLink href={importExportUrl} target="_blank" rel="noreferrer noopener" underline="hover" sx={{ typography: "body2", fontWeight: 600 }}>{Locale.label("settings.manageChurch.imEx")}</MuiLink>
        </VerbRow>
      )}
      nav={<SectionNav hideOnMobile label={Locale.label("settings.landing.configuration")} sections={sections} selected={activeKey} onSelect={selectSection} />}>
      {sections.map((s) => (
        <Box key={s.key} id={`section-${s.key}`} className="om-section" sx={{ scrollMarginTop: 24, mb: { xs: 5, md: 7 } }}>
          {s.key === "developer" && <Typography sx={{ ...eyebrowSx, mb: 1 }}>{s.title}</Typography>}
          {renderSection(s.key)}
        </Box>
      ))}
    </SettingsLayout>
  );
};
