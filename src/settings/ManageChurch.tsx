import React, { useState, useCallback } from "react";
import { type ChurchInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, Locale, ApiHelper, Loading, PageHeader } from "@churchapps/apphelper";
import { useNavigate, useLocation } from "react-router-dom";
import { PermissionDenied } from "../components";
import { Box, Stack, Button } from "@mui/material";
import { Lock as LockIcon, PlayArrow as PlayArrowIcon, Edit as EditIcon, History as HistoryIcon } from "@mui/icons-material";
import { RolesTab, ChurchSettingsEdit } from "./components";
import { useQuery } from "@tanstack/react-query";

const SETTINGS_SECTIONS = ["church-info", "general", "giving", "texting", "domains"];

export const ManageChurch = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hash = location.hash?.replace("#", "");
  const isSettingsHash = SETTINGS_SECTIONS.includes(hash);

  const [selectedTab, setSelectedTab] = React.useState("roles");
  const [showChurchSettings, setShowChurchSettings] = React.useState(isSettingsHash);
  const [initialSection, setInitialSection] = useState<string | undefined>(isSettingsHash ? hash : undefined);

  const jwt = ApiHelper.getConfig("MembershipApi").jwt;
  const churchId = UserHelper.currentUserChurch.church.id;

  const church = useQuery<ChurchInterface>({
    queryKey: [`/churches/${churchId}?include=permissions`, "MembershipApi"],
    enabled: !!churchId
  });

  const hasAccess = UserHelper.checkAccess(Permissions.membershipApi.settings.edit);

  const getCurrentTab = useCallback(() => {
    if (church.data) {
      switch (selectedTab) {
        case "roles": return <RolesTab church={church.data} />;
        default: return <div></div>;
      }
    }
    return <div></div>;
  }, [church.data, selectedTab]);

  const handleUpdated = useCallback(() => {
    setShowChurchSettings(false);
    setInitialSection(undefined);
    church.refetch();
  }, [church]);

  if (!hasAccess) return <PermissionDenied permissions={[Permissions.membershipApi.settings.edit]} />;
  if (church.isLoading) return <Loading />;
  if (!church.data) return <div>{Locale.label("settings.manageChurch.noData")}</div>;

  return (
    <>
      <PageHeader title={church.data?.name || Locale.label("settings.manageChurch.title")} subtitle={church.data?.subDomain ? `${church.data.subDomain}.b1.church` : Locale.label("settings.manageChurch.subtitle")}>
        <Stack direction="row" spacing={1}>
          {UserHelper.checkAccess(Permissions.membershipApi.settings.edit) && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setShowChurchSettings(true)}
              sx={{
                color: "#FFF",
                backgroundColor: "transparent",
                borderColor: "#FFF",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: "#FFF"
                }
              }}>
              {Locale.label("settings.manageChurch.editSettings")}
            </Button>
          )}
          <Button
            variant={selectedTab === "roles" ? "contained" : "outlined"}
            startIcon={<LockIcon />}
            onClick={() => setSelectedTab("roles")}
            sx={{
              color: selectedTab === "roles" ? "primary.main" : "#FFF",
              backgroundColor: selectedTab === "roles" ? "#FFF" : "transparent",
              borderColor: "#FFF",
              "&:hover": {
                backgroundColor: selectedTab === "roles" ? "#FFF" : "rgba(255,255,255,0.2)",
                color: selectedTab === "roles" ? "primary.main" : "#FFF"
              }
            }}>
            {Locale.label("settings.roles.roles")}
          </Button>
          {UserHelper.checkAccess(Permissions.membershipApi.server.admin) && (
            <Button
              variant="outlined"
              startIcon={<HistoryIcon />}
              onClick={() => navigate("/settings/audit-log")}
              sx={{
                color: "#FFF",
                backgroundColor: "transparent",
                borderColor: "#FFF",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.2)",
                  color: "#FFF"
                }
              }}>
              Audit Log
            </Button>
          )}
          <Button
            variant="outlined"
            startIcon={<PlayArrowIcon />}
            href={`https://transfer.b1.church/login?jwt=${jwt}&churchId=${churchId}`}
            target="_blank"
            rel="noreferrer noopener"
            sx={{
              color: "#FFF",
              backgroundColor: "transparent",
              borderColor: "#FFF",
              "&:hover": {
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "#FFF"
              }
            }}>
            {Locale.label("settings.manageChurch.imEx")}
          </Button>
        </Stack>
      </PageHeader>

      {/* Church Settings Modal/Component */}
      {showChurchSettings && (
        <Box sx={{ p: 2 }}>
          <ChurchSettingsEdit church={church.data} updatedFunction={handleUpdated} initialSection={initialSection} />
        </Box>
      )}

      {/* Tab Content - hidden when editing church settings */}
      {!showChurchSettings && selectedTab === "roles" && <Box sx={{ p: 2 }}>{getCurrentTab()}</Box>}
    </>
  );
};
