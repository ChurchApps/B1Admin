import { type PlanInterface } from "../../helpers";
import { Assignment as AssignmentIcon, Album as AlbumIcon } from "@mui/icons-material";
import React, { memo, useMemo } from "react";
import { NavigationTabs, type NavigationTab } from "../../components/ui";
import { Locale } from "@churchapps/apphelper";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  plan: PlanInterface;
}

export const PlanNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange, plan } = props;

  const tabs: NavigationTab[] = useMemo(() => {
    const tabsList = [{ value: "assignments", label: Locale.label("plans.planPage.assignments"), icon: <AssignmentIcon /> }];

    if (plan?.serviceOrder) {
      tabsList.push({ value: "order", label: Locale.label("plans.planPage.serviceOrder"), icon: <AlbumIcon /> });
    }

    return tabsList;
  }, [plan]);

  return <NavigationTabs selectedTab={selectedTab} onTabChange={onTabChange} tabs={tabs} />;
});
