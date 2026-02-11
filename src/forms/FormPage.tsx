import React from "react";
import { Tabs, FormNavigation } from "./components";
import { type FormInterface, type MemberPermissionInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { useParams } from "react-router-dom";
import { Box } from "@mui/material";
import { Description as DescriptionIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";

export const FormPage = () => {
  const params = useParams();
  const [selectedTab, setSelectedTab] = React.useState("");

  const form = useQuery<FormInterface>({
    queryKey: ["/forms/" + params.id, "MembershipApi"],
    placeholderData: {} as FormInterface
  });

  const memberPermission = useQuery<MemberPermissionInterface>({
    queryKey: ["/memberpermissions/form/" + params.id + "/my", "MembershipApi"],
    enabled: form.data?.contentType === "form",
    placeholderData: {} as MemberPermissionInterface
  });

  // Get available tabs based on permissions
  const getAvailableTabs = () => {
    const tabs = [];
    const formType = form.data?.contentType;
    const formMemberAction = memberPermission.data?.action;
    const formAdmin = UserHelper.checkAccess(Permissions.membershipApi.forms.admin);
    const formEdit = UserHelper.checkAccess(Permissions.membershipApi.forms.edit) && formType !== undefined && formType !== "form";
    const formMemberAdmin = formMemberAction === "admin" && formType !== undefined && formType === "form";
    const formMemberView = formMemberAction === "view" && formType !== undefined && formType === "form";

    if (formAdmin || formEdit || formMemberAdmin) {
      tabs.push({ key: "questions", label: Locale.label("forms.tabs.questions") });
    }
    if ((formAdmin || formMemberAdmin) && formType === "form") {
      tabs.push({ key: "members", label: Locale.label("forms.tabs.formMem") });
    }
    if (formAdmin || formMemberAdmin || formMemberView) {
      tabs.push({ key: "submissions", label: Locale.label("forms.tabs.formSub") });
    }

    return tabs;
  };

  const availableTabs = getAvailableTabs();

  // Set default tab
  React.useEffect(() => {
    if (selectedTab === "" && availableTabs.length > 0) {
      setSelectedTab(availableTabs[0].key);
    }
  }, [availableTabs, selectedTab]);

  if (form.isLoading) return <Loading />;

  return form.data?.id ? (
    <>
      <PageHeader icon={<DescriptionIcon />} title={form.data.name} subtitle={Locale.label("forms.formPage.subtitleConfig")} />
      <FormNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} form={form.data} memberPermission={memberPermission.data} />

      {/* Tab Content */}
      <Box sx={{ p: 3 }}>
        <Box
          sx={{
            "& > *:first-of-type": { mb: 2 }, // Add margin bottom to edit components that appear above
            "& > *:not(:first-of-type)": { mt: 0 } // Ensure no extra margin for main content
          }}>
          <Tabs form={form.data} memberPermission={memberPermission.data} selectedTab={selectedTab} onTabChange={setSelectedTab} />
        </Box>
      </Box>
    </>
  ) : (
    <></>
  );
};
