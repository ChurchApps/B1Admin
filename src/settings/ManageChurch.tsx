import React, { useState, useCallback } from "react";
import { type ChurchInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, Locale, ApiHelper, Loading, PageHeader } from "@churchapps/apphelper";
import { Navigate } from "react-router-dom";
import { Box, Stack, Button } from "@mui/material";
import { Settings as SettingsIcon, Lock as LockIcon, PlayArrow as PlayArrowIcon, Edit as EditIcon, PhoneIphone as PhoneIphoneIcon } from "@mui/icons-material";
import { RolesTab, ChurchSettingsEdit } from "./components";
import { MobileAppSettingsPage } from "./MobileAppSettingsPage";
import { useQuery } from "@tanstack/react-query";

export const ManageChurch = () => {
  const [selectedTab, setSelectedTab] = React.useState("roles");
  const [showChurchSettings, setShowChurchSettings] = React.useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string>("");

  const jwt = ApiHelper.getConfig("MembershipApi").jwt;
  const churchId = UserHelper.currentUserChurch.church.id;

  const church = useQuery<ChurchInterface>({
    queryKey: [`/churches/${churchId}?include=permissions`, "MembershipApi"],
    enabled: !!churchId
  });

  const checkAccess = useCallback(() => {
    if (!UserHelper.checkAccess(Permissions.membershipApi.settings.edit)) {
      setRedirectUrl("/");
    }
  }, []);

  const getCurrentTab = useCallback(() => {
    if (church.data) {
      switch (selectedTab) {
        case "roles": return <RolesTab church={church.data} />;
        case "mobileApps": return <MobileAppSettingsPage />;
        default: return <div></div>;
      }
    }
    return <div></div>;
  }, [church.data, selectedTab]);

  const handleUpdated = useCallback(() => {
    setShowChurchSettings(false);
    church.refetch();
  }, [church]);

  React.useEffect(checkAccess, [checkAccess]);

  React.useEffect(() => {
    if (selectedTab === "" || selectedTab === "settings") setSelectedTab("mobileApps");
  }, [selectedTab]);

  if (redirectUrl !== "") return <Navigate to={redirectUrl}></Navigate>;
  if (church.isLoading) return <Loading />;
  if (!church.data) return <div>{Locale.label("settings.manageChurch.noData")}</div>;

  return (
    <>
      <PageHeader icon={<SettingsIcon />} title={church.data?.name || Locale.label("settings.manageChurch.title")} subtitle={church.data?.subDomain ? `${church.data.subDomain}.b1.church` : Locale.label("settings.manageChurch.subtitle")}>
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
            variant={selectedTab === "mobileApps" ? "contained" : "outlined"}
            startIcon={<PhoneIphoneIcon />}
            onClick={() => setSelectedTab("mobileApps")}
            sx={{
              color: selectedTab === "mobileApps" ? "primary.main" : "#FFF",
              backgroundColor: selectedTab === "mobileApps" ? "#FFF" : "transparent",
              borderColor: "#FFF",
              "&:hover": {
                backgroundColor: selectedTab === "mobileApps" ? "#FFF" : "rgba(255,255,255,0.2)",
                color: selectedTab === "mobileApps" ? "primary.main" : "#FFF"
              }
            }}>
            {Locale.label("settings.manageChurch.mobileApps")}
          </Button>
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
          <ChurchSettingsEdit church={church.data} updatedFunction={handleUpdated} />
        </Box>
      )}

      {/* Tab Content - hidden when editing church settings */}
      {!showChurchSettings && (selectedTab === "roles" || selectedTab === "mobileApps") && <Box sx={{ p: 2 }}>{getCurrentTab()}</Box>}
    </>
  );
};
