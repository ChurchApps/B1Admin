import { Assignment as TaskIcon, SettingsSuggest as AutomationsIcon, ViewKanban as WorkflowsIcon } from "@mui/icons-material";
import React, { memo, useMemo } from "react";
import { NavigationTabs, type NavigationTab } from "../../../components/ui";
import { Locale } from "@churchapps/apphelper";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
}

export const TasksNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange } = props;

  const tabs: NavigationTab[] = useMemo(() => {
    const tabsList = [];
    tabsList.push({ value: "tasks", label: Locale.label("tasks.tasksPage.tasks") || "Tasks", icon: <TaskIcon /> });
    tabsList.push({ value: "workflows", label: Locale.label("tasks.tasksPage.workflows") || "Workflows", icon: <WorkflowsIcon /> });
    tabsList.push({ value: "automations", label: Locale.label("tasks.tasksPage.auto") || "Automations", icon: <AutomationsIcon /> });
    return tabsList;
  }, []);

  return <NavigationTabs selectedTab={selectedTab} onTabChange={onTabChange} tabs={tabs} />;
});
