import React, { useState, useCallback } from "react";
import { type ChurchInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, Locale, ApiHelper, Loading, PageHeader } from "@churchapps/apphelper";
import { useNavigate, useLocation } from "react-router-dom";
import { PermissionDenied } from "../components";
import { Box, Grid, Stack, Typography } from "@mui/material";
import { PlayArrow as PlayArrowIcon, History as HistoryIcon, Layers as LayersIcon, Business as BusinessIcon, Tune as TuneIcon, VolunteerActivism as VolunteerActivismIcon, Sms as SmsIcon, Language as LanguageIcon, Link as LinkIcon, Code as CodeIcon, School as SchoolIcon, HowToReg as HowToRegIcon, ListAlt as ListAltIcon, Cloud as CloudIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { HeaderSecondaryButton } from "../components/ui";
import { SettingsConfigList, type ConfigSection } from "./components/SettingsConfigList";
import { ChurchInfoSection } from "./components/ChurchInfoSection";
import { SettingsToggleSection } from "./components/SettingsToggleSection";
import { CampusesSection } from "./components/CampusesSection";
import { CustomFieldsSection } from "./components/CustomFieldsSection";
import { DeveloperSection } from "./components/DeveloperSection";
import { SupportContactSettingsEdit } from "./components/SupportContactSettingsEdit";
import { GivingSettingsEdit } from "./components/GivingSettingsEdit";
import { TextingSettingsEdit } from "./components/TextingSettingsEdit";
import { StorageSettingsEdit } from "./components/StorageSettingsEdit";
import { MINISTRYSTUFF_ENABLED } from "../helpers/MinistryStuffFlag";
import { DomainSettingsEdit } from "./components/DomainSettingsEdit";
import { GradePromotionSettingsEdit } from "./components/GradePromotionSettingsEdit";
import { CheckinSettingsEdit } from "./components/CheckinSettingsEdit";

const SECTION_KEYS = [
  "church-info", "general", "giving", "texting", ...(MINISTRYSTUFF_ENABLED ? ["storage"] : []), "domains", "grade-promotion", "check-ins", "campuses", "custom-fields", "developer"
];

const SummaryRow: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ py: 1 }}>
    <Typography variant="body2" color="text.secondary">{label}</Typography>
    <Typography variant="body2" sx={{ fontWeight: 500, textAlign: "right" }}>{value || "—"}</Typography>
  </Stack>
);

export const ManageChurch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hash = location.hash?.replace("#", "");

  const jwt = ApiHelper.getConfig("MembershipApi").jwt;
  const churchId = UserHelper.currentUserChurch.church.id || "";

  const hasAccess = UserHelper.checkAccess(Permissions.membershipApi.settings.edit);
  const hasGiving = UserHelper.checkAccess(Permissions.givingApi.settings.edit);

  const [selected, setSelected] = useState<string>(SECTION_KEYS.includes(hash) ? hash : "church-info");

  const church = useQuery<ChurchInterface>({
    queryKey: [`/churches/${churchId}?include=permissions`, "MembershipApi"],
    enabled: !!churchId
  });
  const settingsQ = useQuery<any[]>({ queryKey: ["/settings", "MembershipApi"], placeholderData: [], enabled: hasAccess });
  const gateways = useQuery<any[]>({ queryKey: ["/gateways", "GivingApi"], placeholderData: [], enabled: hasGiving });
  const texting = useQuery<any[]>({ queryKey: ["/texting/providers", "MessagingApi"], placeholderData: [], enabled: hasAccess });
  const storage = useQuery<any[]>({ queryKey: ["/storage/providers", "ContentApi"], placeholderData: [], enabled: hasAccess && MINISTRYSTUFF_ENABLED });
  const domains = useQuery<any[]>({ queryKey: ["/domains", "MembershipApi"], placeholderData: [], enabled: hasAccess });
  const campuses = useQuery<any[]>({ queryKey: ["/campuses", "MembershipApi"], placeholderData: [], enabled: hasAccess });
  const personFields = useQuery<any[]>({ queryKey: ["/personfields", "MembershipApi"], placeholderData: [], enabled: hasAccess });

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
  const gateway = (gateways.data || [])[0];
  const textingProvider = (texting.data || [])[0]?.provider;
  const domainList = domains.data || [];
  const campusCount = (campuses.data || []).length;
  const personFieldCount = (personFields.data || []).length;
  const gradePromotionDate = (settingsQ.data || []).find((s) => s.keyName === "gradePromotionDate")?.value;
  const ratioEnforcement = (settingsQ.data || []).find((s) => s.keyName === "ratioEnforcement")?.value === "block" ? "block" : "warn";
  const checkinsSubtitle = Locale.label("settings.checkinSettingsEdit." + ratioEnforcement);
  const gradePromotionSubtitle = gradePromotionDate
    ? Locale.label("settings.landing.gradePromotionOn").replace("{date}", new Date(2000, Number(gradePromotionDate.split("-")[0]) - 1, Number(gradePromotionDate.split("-")[1])).toLocaleDateString(undefined, { month: "long", day: "numeric" }))
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
  const storageSubtitle = storageProviderName === "ministrystuff" ? "MinistryStuff" : Locale.label("settings.storageSettingsEdit.churchAppsFree");

  const sections: ConfigSection[] = [
    { key: "church-info", title: Locale.label("settings.churchSettingsEdit.churchInfo"), subtitle: church.data.name || Locale.label("settings.churchSettingsEdit.churchInfoSubtitle"), icon: <BusinessIcon />, color: "primary" },
    { key: "general", title: Locale.label("settings.churchSettingsEdit.general"), subtitle: Locale.label("settings.supportContactSettingsEdit.supportContact"), icon: <TuneIcon />, color: "secondary" },
    ...(hasGiving ? [{ key: "giving", title: Locale.label("settings.givingSettingsEdit.giving"), subtitle: givingSubtitle, icon: <VolunteerActivismIcon />, color: "success" } as ConfigSection] : []),
    { key: "texting", title: Locale.label("settings.churchSettingsEdit.textingTitle"), subtitle: textingSubtitle, icon: <SmsIcon />, color: "warning" },
    ...(MINISTRYSTUFF_ENABLED ? [{ key: "storage", title: Locale.label("settings.storageSettingsEdit.title"), subtitle: storageSubtitle, icon: <CloudIcon />, color: "info" } as ConfigSection] : []),
    { key: "domains", title: Locale.label("settings.domainSettingsEdit.domains"), subtitle: domainsSubtitle, icon: <LanguageIcon />, color: "info" },
    { key: "grade-promotion", title: Locale.label("settings.gradePromotionSettingsEdit.title"), subtitle: gradePromotionSubtitle, icon: <SchoolIcon />, color: "secondary" },
    { key: "check-ins", title: Locale.label("settings.checkinSettingsEdit.title"), subtitle: checkinsSubtitle, icon: <HowToRegIcon />, color: "info" },
    { key: "campuses", title: Locale.label("settings.campuses.campuses"), subtitle: campusesSubtitle, icon: <BusinessIcon />, color: "primary" },
    { key: "custom-fields", title: Locale.label("settings.customFields.customFields"), subtitle: customFieldsSubtitle, icon: <ListAltIcon />, color: "info" },
    { key: "developer", title: Locale.label("settings.developer.title"), subtitle: Locale.label("settings.landing.developerSubtitle"), icon: <CodeIcon />, color: "secondary" }
  ];

  const activeKey = sections.some((s) => s.key === selected) ? selected : "church-info";

  const givingView = gateway ? (
    <Box>
      <SummaryRow label={Locale.label("settings.givingSettingsEdit.prov")} value={gateway.provider} />
      <SummaryRow label={Locale.label("settings.givingSettingsEdit.currency")} value={(gateway.currency || "").toUpperCase()} />
    </Box>
  ) : (
    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{Locale.label("settings.landing.notConfigured")}</Typography>
  );

  const domainsView = domainList.length > 0 ? (
    <Box>
      {domainList.map((d) => (
        <Stack key={d.id || d.domainName} direction="row" spacing={1} alignItems="center" sx={{ py: 0.75 }}>
          <LinkIcon sx={{ color: "text.disabled", fontSize: 18 }} />
          <Typography variant="body2">{d.domainName}</Typography>
        </Stack>
      ))}
    </Box>
  ) : (
    <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>{Locale.label("settings.landing.domainsNone")}</Typography>
  );

  const renderDetail = () => {
    switch (activeKey) {
      case "church-info":
        return <ChurchInfoSection church={church.data} onSaved={handleSaved} />;
      case "general":
        return (
          <SettingsToggleSection
            headerText={Locale.label("settings.churchSettingsEdit.general")}
            headerIcon="tune"
            data-testid="settings-general"
            view={<SummaryRow label={Locale.label("settings.supportContactSettingsEdit.supportContact")} value={supportContact || Locale.label("settings.landing.notSet")} />}
            renderEdit={(saveTrigger, onSaveComplete) => <SupportContactSettingsEdit churchId={churchId} saveTrigger={saveTrigger} onSaveComplete={onSaveComplete} />}
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
            view={<SummaryRow label={Locale.label("settings.textingSettingsEdit.provider")} value={textingProvider || Locale.label("settings.landing.notConfigured")} />}
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
            view={<SummaryRow label={Locale.label("settings.storageSettingsEdit.provider")} value={storageSubtitle} />}
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
            view={<SummaryRow label={Locale.label("settings.gradePromotionSettingsEdit.title")} value={gradePromotionSubtitle} />}
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
            view={<SummaryRow label={Locale.label("settings.checkinSettingsEdit.ratioEnforcement")} value={checkinsSubtitle} />}
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

  return (
    <>
      <PageHeader icon={<BusinessIcon />} title={church.data.name || Locale.label("settings.manageChurch.title")} subtitle={church.data.subDomain ? `${church.data.subDomain}.b1.church` : Locale.label("settings.manageChurch.subtitle")}>
        <Stack direction="row" spacing={1}>
          {UserHelper.checkAccess(Permissions.membershipApi.settings.edit) && (
            <HeaderSecondaryButton startIcon={<HistoryIcon />} onClick={() => navigate("/settings/audit-log")}>
              {Locale.label("settings.manageChurch.auditLog")}
            </HeaderSecondaryButton>
          )}
          {UserHelper.checkAccess(Permissions.membershipApi.settings.edit) && (
            <HeaderSecondaryButton startIcon={<LayersIcon />} onClick={() => navigate("/settings/batches")}>
              {Locale.label("settings.manageChurch.batches")}
            </HeaderSecondaryButton>
          )}
          <HeaderSecondaryButton
            {...({ href: `https://transfer.b1.church/login?jwt=${jwt}&churchId=${churchId}`, target: "_blank", rel: "noreferrer noopener" } as any)}
            startIcon={<PlayArrowIcon />}>
            {Locale.label("settings.manageChurch.imEx")}
          </HeaderSecondaryButton>
        </Stack>
      </PageHeader>

      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <SettingsConfigList sections={sections} selected={activeKey} onSelect={setSelected} />
          </Grid>
          <Grid size={{ xs: 12, md: 8 }}>
            {renderDetail()}
          </Grid>
        </Grid>
      </Box>
    </>
  );
};
