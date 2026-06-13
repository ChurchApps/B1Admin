import { type FormInterface, type MemberPermissionInterface } from "@churchapps/helpers";
import { Assignment as FormIcon, Group as GroupIcon, Description as DescriptionIcon } from "@mui/icons-material";
import { memo, useMemo } from "react";
import { NavigationTabs, type NavigationTab } from "../../components/ui";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  form: FormInterface;
  memberPermission: MemberPermissionInterface;
}

export const FormNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange, form, memberPermission } = props;

  const tabs: NavigationTab[] = useMemo(() => {
    const tabsList = [];
    const formType = form?.contentType;
    const formMemberAction = memberPermission?.action;
    const formAdmin = UserHelper.checkAccess(Permissions.membershipApi.forms.admin);
    const formEdit = UserHelper.checkAccess(Permissions.membershipApi.forms.edit) && formType !== undefined && formType !== "form";
    const formMemberAdmin = formMemberAction === "admin" && formType !== undefined && formType === "form";
    const formMemberView = formMemberAction === "view" && formType !== undefined && formType === "form";

    if (formAdmin || formEdit || formMemberAdmin) {
      tabsList.push({ value: "questions", label: Locale.label("forms.tabs.questions"), icon: <DescriptionIcon /> });
    }
    if ((formAdmin || formMemberAdmin) && formType === "form") {
      tabsList.push({ value: "members", label: Locale.label("forms.tabs.formMem"), icon: <GroupIcon /> });
    }
    if (formAdmin || formMemberAdmin || formMemberView) {
      tabsList.push({ value: "submissions", label: Locale.label("forms.tabs.formSub"), icon: <FormIcon /> });
    }

    return tabsList;
  }, [form, memberPermission]);

  return <NavigationTabs selectedTab={selectedTab} onTabChange={onTabChange} tabs={tabs} />;
});
