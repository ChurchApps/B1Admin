import { type FormInterface, type MemberPermissionInterface } from "@churchapps/helpers";
import { memo, useMemo } from "react";
import { PillTabs, type PillOption } from "../../components/ui";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  form: FormInterface;
  memberPermission: MemberPermissionInterface;
}

export const FormNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange, form, memberPermission } = props;

  const tabs: PillOption[] = useMemo(() => {
    const tabsList: PillOption[] = [];
    const formType = form?.contentType;
    const formMemberAction = memberPermission?.action;
    const formAdmin = UserHelper.checkAccess(Permissions.membershipApi.forms.admin);
    const formEdit = UserHelper.checkAccess(Permissions.membershipApi.forms.edit) && formType !== undefined && formType !== "form";
    const formMemberAdmin = formMemberAction === "admin" && formType !== undefined && formType === "form";
    const formMemberView = formMemberAction === "view" && formType !== undefined && formType === "form";

    if (formAdmin || formEdit || formMemberAdmin) {
      tabsList.push({ value: "questions", label: Locale.label("forms.tabs.questions"), "data-testid": "form-tab-questions" });
    }
    if ((formAdmin || formMemberAdmin) && formType === "form") {
      tabsList.push({ value: "members", label: Locale.label("forms.tabs.formMem"), "data-testid": "form-tab-members" });
    }
    if (formAdmin || formMemberAdmin || formMemberView) {
      tabsList.push({ value: "submissions", label: Locale.label("forms.tabs.formSub"), "data-testid": "form-tab-submissions" });
    }

    return tabsList;
  }, [form, memberPermission]);

  if (tabs.length < 2) return null;
  return <PillTabs tabs options={tabs} value={selectedTab} onChange={onTabChange} aria-label={form?.name || Locale.label("forms.formsPage.forms")} />;
});
