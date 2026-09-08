import { type GroupInterface } from "@churchapps/helpers";
import { memo, useMemo } from "react";
import { Locale, Permissions, UserHelper } from "@churchapps/apphelper";

interface Props {
  selectedTab: string;
  onTabChange: (tab: string) => void;
  group: GroupInterface;
  onHeader?: boolean;
}

export const GroupNavigation = memo((props: Props) => {
  const { selectedTab, onTabChange, group } = props;

  const isStandard = useMemo(() => (group?.tags?.indexOf("standard") ?? -1) > -1, [group?.tags]);

  const tabs = useMemo(() => {
    const items: { value: string; label: string }[] = [];
    if (!isStandard) return items;
    items.push({ value: "sessions", label: Locale.label("groups.groupNavigation.sessions") });
    items.push({ value: "calendar", label: Locale.label("groups.groupNavigation.calendar") });
    if (UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view)) {
      items.push({ value: "health", label: Locale.label("groups.groupNavigation.health") });
    }
    return items;
  }, [isStandard]);

  if (tabs.length === 0) return null;

  return (
    <div className="og-verbs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={selectedTab === tab.value}
          className={selectedTab === tab.value ? "on" : undefined}
          onClick={() => onTabChange(tab.value)}>
          {tab.label}
        </button>
      ))}
    </div>
  );
});
