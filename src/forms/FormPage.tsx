import React from "react";
import { Tabs, FormEdit } from "./components";
import { type FormInterface, type MemberPermissionInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, Locale, Loading } from "@churchapps/apphelper";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Box, Button, Typography } from "@mui/material";
import { EmptyState } from "../components/ui";
import { Description as DescriptionIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { Plate, Record, Verbs, verbSx, h1Sx, ledeSx, pillSx, dlRowSx, DUST } from "./plated";
import { EnvironmentHelper } from "./components";

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

  if (!form.data?.id) {
    return (
      <Plate directory>
        <EmptyState
          icon={<DescriptionIcon />}
          title={Locale.label("forms.formPage.notFound")}
          action={<Button variant="contained" component={Link} to="/forms">{Locale.label("forms.formPage.backToForms")}</Button>}
        />
      </Plate>
    );
  }

  const formUrl = EnvironmentHelper.B1Url.replace("{subdomain}", UserHelper.currentUserChurch.church.subDomain || "") + "/forms/" + form.data.id;
  const typeLabel = form.data.contentType === "form" ? Locale.label("forms.formEdit.alone") : Locale.label("forms.formEdit.ppl");

  return (
    <Plate>
      <Record
        who={(
          <>
            <Box component="h1" sx={h1Sx}>{form.data.name || ""}</Box>
            <Box sx={ledeSx}>{typeLabel}</Box>
            {form.data.contentType === "form" && (
              <Typography component="a" href={formUrl} sx={{ ...verbSx, display: "block", mb: 1, wordBreak: "break-all" }}>{formUrl}</Typography>
            )}
            {form.data.description && <Typography variant="body2" sx={{ color: DUST, mb: 1 }}>{form.data.description}</Typography>}
            <Box component="dl" sx={dlRowSx}>
              <Box component="dt">{Locale.label("forms.formEdit.access")}</Box>
              <Box component="dd">{form.data.restricted ? Locale.label("forms.formEdit.restrict") : Locale.label("forms.formEdit.public")}</Box>
            </Box>
            <Verbs>
              <Box component={Link} to="/forms" sx={verbSx}>{Locale.label("forms.formsPage.forms")}</Box>
              {canEditSettings && (
                <Box component="button" type="button" onClick={() => setEditingSettings(true)} data-testid="edit-form-settings-button" sx={verbSx}>
                  {Locale.label("forms.formEdit.editForm")}
                </Box>
              )}
            </Verbs>
          </>
        )}
        rest={(
          <>
            {editingSettings ? (
              <FormEdit formId={form.data.id} updatedFunction={handleSettingsSaved} />
            ) : (
              <>
                {availableTabs.length > 1 && (
                  <Box role="tablist" sx={{ display: "flex", gap: 1, flexWrap: { xs: "nowrap", sm: "wrap" }, overflowX: { xs: "auto", sm: "visible" } }}>
                    {availableTabs.map((tab) => (
                      <Box
                        key={tab.key}
                        component="button"
                        type="button"
                        role="tab"
                        aria-selected={selectedTab === tab.key}
                        onClick={() => setSelectedTab(tab.key)}
                        sx={pillSx(selectedTab === tab.key)}>
                        {tab.label}
                      </Box>
                    ))}
                  </Box>
                )}
                <Tabs form={form.data} memberPermission={memberPermission.data || { personName: "" }} selectedTab={selectedTab} onTabChange={setSelectedTab} />
              </>
            )}
          </>
        )}
      />
    </Plate>
  );
};
