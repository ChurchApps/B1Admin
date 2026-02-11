import React from "react";
import { FormMembers, Form, FormSubmissions } from ".";
import { type MemberPermissionInterface, type FormInterface } from "@churchapps/helpers";
import { Locale } from "@churchapps/apphelper";

interface Props {
  form: FormInterface;
  memberPermission: MemberPermissionInterface;
  selectedTab?: string;
  onTabChange?: (tab: string) => void;
}

export const Tabs: React.FC<Props> = (props) => {
  // Use the selectedTab from props if provided, otherwise fall back to local state
  const currentSelectedTab = props.selectedTab || "";
  let currentTab = null;

  switch (currentSelectedTab) {
    case "questions": currentTab = <Form id={props.form.id} />; break;
    case "members": currentTab = <FormMembers formId={props.form.id} />; break;
    case "submissions": currentTab = <FormSubmissions formId={props.form.id} memberPermissions={props.memberPermission} />; break;
    default: currentTab = <div>{Locale.label("forms.tabs.unAuth")}</div>; break;
  }

  return currentTab;
};
