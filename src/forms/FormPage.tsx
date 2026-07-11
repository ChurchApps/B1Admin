import React from "react";
import { Tabs, FormNavigation, FormEdit } from "./components";
import { type FormInterface, type MemberPermissionInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, Locale, Loading, PageHeader } from "@churchapps/apphelper";
import { useParams, useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import { Description as DescriptionIcon, Edit as EditIcon } from "@mui/icons-material";
import { HeaderPrimaryButton } from "../components/ui";

import { useQuery } from "@tanstack/react-query";

export const FormPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = React.useState("");
  const [editingSettings, setEditingSettings] = React.useState(false);

  const form = useQuery<FormInterface>({
    queryKey: ["/forms/" + params.id, "MembershipApi"],
    placeholderData: {} as FormInterface
  });

  const memberPermission = useQuery<MemberPermissionInterface>({
    queryKey: ["/memberpermissions/form/" + params.id + "/my", "MembershipApi"],
    enabled: form.data?.contentType === "form",
    placeholderData: {} as MemberPermissionInterface
  });

  const formType = form.data?.contentType;
  const formMemberAction = memberPermission.data?.action;
  const formAdmin = UserHelper.checkAccess(Permissions.membershipApi.forms.admin);
  const formEdit = UserHelper.checkAccess(Permissions.membershipApi.forms.edit) && formType !== undefined && formType !== "form";
  const formMemberAdmin = formMemberAction === "admin" && formType !== undefined && formType === "form";
  const formMemberView = formMemberAction === "view" && formType !== undefined && formType === "form";
  const canEditSettings = formAdmin || formEdit || formMemberAdmin;

  const getAvailableTabs = () => {
    const tabs = [];

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

  React.useEffect(() => {
    if (selectedTab === "" && availableTabs.length > 0) {
      setSelectedTab(availableTabs[0].key);
    }
  }, [availableTabs, selectedTab]);

  const handleSettingsSaved = async () => {
    setEditingSettings(false);
    const result = await form.refetch();
    if (!result.data?.id) navigate("/forms");
  };

  if (form.isLoading) return <Loading />;

  return form.data?.id ? (
    <>
      <PageHeader
        title={form.data.name || ""}
        subtitle={Locale.label("forms.formPage.subtitleConfig")}
        icon={<DescriptionIcon />}
        tabs={<FormNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} form={form.data} memberPermission={memberPermission.data || { personName: "" }} onHeader />}>
        {canEditSettings && (
          <HeaderPrimaryButton startIcon={<EditIcon />} onClick={() => setEditingSettings(true)} data-testid="edit-form-settings-button">
            {Locale.label("forms.formEdit.editForm")}
          </HeaderPrimaryButton>
        )}
      </PageHeader>

      <Box sx={{ p: 3 }}>
        {editingSettings ? (
          <FormEdit formId={form.data.id} updatedFunction={handleSettingsSaved} />
        ) : (
          <Box
            sx={{
              "& > *:first-of-type": { mb: 2 },
              "& > *:not(:first-of-type)": { mt: 0 }
            }}>
            <Tabs form={form.data} memberPermission={memberPermission.data || { personName: "" }} selectedTab={selectedTab} onTabChange={setSelectedTab} />
          </Box>
        )}
      </Box>
    </>
  ) : (
    <></>
  );
};
