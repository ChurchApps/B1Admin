import { type FormInterface, type MemberPermissionInterface } from "@churchapps/helpers";
import { memo, useMemo } from "react";
import { Box } from "@mui/material";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { pillSx } from "../plated";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  form: FormInterface;
  memberPermission: MemberPermissionInterface;
  onHeader?: boolean;
}

export const FormNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange, form, memberPermission } = props;

  const tabs = useMemo(() => {
    const tabsList: { value: string; label: string }[] = [];
    const formType = form?.contentType;
    const formMemberAction = memberPermission?.action;
    const formAdmin = UserHelper.checkAccess(Permissions.membershipApi.forms.admin);
    const formEdit = UserHelper.checkAccess(Permissions.membershipApi.forms.edit) && formType !== undefined && formType !== "form";
    const formMemberAdmin = formMemberAction === "admin" && formType !== undefined && formType === "form";
    const formMemberView = formMemberAction === "view" && formType !== undefined && formType === "form";

    if (formAdmin || formEdit || formMemberAdmin) {
      tabsList.push({ value: "questions", label: Locale.label("forms.tabs.questions") });
    }
    if ((formAdmin || formMemberAdmin) && formType === "form") {
      tabsList.push({ value: "members", label: Locale.label("forms.tabs.formMem") });
    }
    if (formAdmin || formMemberAdmin || formMemberView) {
      tabsList.push({ value: "submissions", label: Locale.label("forms.tabs.formSub") });
    }

    return tabsList;
  }, [form, memberPermission]);

  return (
    <Box role="tablist" sx={{ display: "flex", gap: 1, flexWrap: { xs: "nowrap", sm: "wrap" }, overflowX: { xs: "auto", sm: "visible" } }}>
      {tabs.map((tab) => (
        <Box
          key={tab.value}
          component="button"
          type="button"
          role="tab"
          aria-selected={selectedTab === tab.value}
          onClick={() => onTabChange(tab.value)}
          sx={pillSx(selectedTab === tab.value)}>
          {tab.label}
        </Box>
      ))}
    </Box>
  );
});
