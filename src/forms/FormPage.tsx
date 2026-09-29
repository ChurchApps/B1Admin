import React from "react";
import { Tabs, FormNavigation, FormEdit, EnvironmentHelper } from "./components";
import { type FormInterface, type MemberPermissionInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, Locale, Loading } from "@churchapps/apphelper";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Box, Button, Link as MuiLink, Stack, Typography } from "@mui/material";
import { Description as DescriptionIcon } from "@mui/icons-material";
import { BackVerb, PageContainer, EmptyState, Pill, RecordLayout, TextAction, VerbRow, useRecordView } from "../components/ui";

import { useQuery } from "@tanstack/react-query";

export const FormPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const { view: requestedView, setView } = useRecordView("view", { replace: true });

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

  const availableTabs: string[] = [];
  if (formAdmin || formEdit || formMemberAdmin) availableTabs.push("questions");
  if ((formAdmin || formMemberAdmin) && formType === "form") availableTabs.push("members");
  if (formAdmin || formMemberAdmin || formMemberView) availableTabs.push("submissions");

  const editing = requestedView === "edit" && canEditSettings;
  const selectedTab = availableTabs.includes(requestedView) ? requestedView : availableTabs[0] || "";

  const handleSettingsSaved = async () => {
    setView("");
    const result = await form.refetch();
    if (!result.data?.id) navigate("/forms");
  };

  if (form.isLoading || form.isPlaceholderData) return <Loading />;

  if (!form.data?.id) {
    return (
      <PageContainer>
        <EmptyState
          icon={<DescriptionIcon />}
          title={Locale.label("forms.formPage.notFound")}
          action={<Button variant="contained" component={Link} to="/forms">{Locale.label("forms.formPage.backToForms")}</Button>}
        />
      </PageContainer>
    );
  }

  const data = form.data as FormInterface & { description?: string };
  const standAlone = data.contentType === "form";
  const formUrl = EnvironmentHelper.B1Url.replace("{subdomain}", UserHelper.currentUserChurch.church.subDomain || "") + "/forms/" + data.id;
  const memberPermissionData = memberPermission.data || { personName: "" };

  const identity = (
    <Box component="aside" data-testid="form-identity">
      <Typography id="page-header-title" variant="h1" component="h1" sx={{ overflowWrap: "anywhere" }}>{data.name || ""}</Typography>
      <Typography id="page-header-subtitle" color="text.secondary" sx={{ mt: 0.5 }}>{Locale.label("forms.formPage.subtitleConfig")}</Typography>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 2 }}>
        <Pill tone="primary">{standAlone ? Locale.label("forms.formEdit.alone") : Locale.label("forms.formEdit.ppl")}</Pill>
        {standAlone && <Pill>{data.restricted ? Locale.label("forms.formEdit.restrict") : Locale.label("forms.formEdit.public")}</Pill>}
        {data.archived && <Pill tone="warning">{Locale.label("forms.formsPage.archived", "Archived")}</Pill>}
      </Stack>
      {standAlone && (
        <MuiLink href={formUrl} target="_blank" rel="noopener noreferrer" underline="hover" data-testid="form-public-url" sx={{ display: "block", mt: 2, typography: "body2", overflowWrap: "anywhere" }}>
          {formUrl}
        </MuiLink>
      )}
      {data.description && <Typography variant="body2" color="text.secondary" sx={{ mt: 2, whiteSpace: "pre-line" }}>{data.description}</Typography>}
      <VerbRow sx={{ mt: 3 }}>
        <TextAction to="/forms" component={Link} data-testid="form-back-to-forms">{Locale.label("forms.formsPage.forms")}</TextAction>
        {canEditSettings && !editing && (
          <TextAction onClick={() => setView("edit")} data-testid="edit-form-settings-button">{Locale.label("forms.formEdit.editForm")}</TextAction>
        )}
      </VerbRow>
    </Box>
  );

  return (
    <PageContainer>
      <RecordLayout identity={identity} spacing={3} data-testid="form-record">
        {editing ? (
          <>
            <Box><BackVerb name={data.name || ""} onClick={() => setView("")} data-testid="form-record-back" /></Box>
            <FormEdit formId={data.id} updatedFunction={handleSettingsSaved} />
          </>
        ) : (
          <>
            <FormNavigation selectedTab={selectedTab} onTabChange={setView} form={data} memberPermission={memberPermissionData} />
            <Tabs form={data} memberPermission={memberPermissionData} selectedTab={selectedTab} onTabChange={setView} />
          </>
        )}
      </RecordLayout>
    </PageContainer>
  );
};
