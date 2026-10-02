import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Locale, Permissions, UserHelper } from "@churchapps/apphelper";
import { EnvironmentHelper } from "../../helpers/EnvironmentHelper";

export interface QuickAction { label: string; icon: string; url: string }

// The dashboard's former Quick Actions. Setup steps open their wizard until the church has one, then go to the list.
export const useQuickActions = (enabled: boolean): QuickAction[] => {
  const can = (p: Parameters<typeof UserHelper.checkAccess>[0]) => UserHelper.checkAccess(p);
  const content = can(Permissions.contentApi.content.edit);
  const groupsEdit = can(Permissions.membershipApi.groups.edit);
  const teams = useQuery<any[]>({ queryKey: ["/groups/tag/team", "MembershipApi"], enabled: enabled && groupsEdit });
  const groups = useQuery<any[]>({ queryKey: ["/groups/tag/standard", "MembershipApi"], enabled: enabled && groupsEdit });
  const pages = useQuery<any[]>({ queryKey: ["/pages", "ContentApi"], enabled: enabled && content });
  const planTypes = useQuery<any[]>({ queryKey: ["/planTypes", "DoingApi"], enabled: enabled && groupsEdit });

  return React.useMemo(() => {
    const b1Url = EnvironmentHelper.B1Url.replace("{subdomain}", UserHelper.currentUserChurch?.church?.subDomain || "");
    const avatar = { label: Locale.label("dashboard.adminWelcome.setAvatarTitle"), icon: "camera_alt", url: b1Url + "/mobile/community?id=" + UserHelper.person?.id + "#edit" };
    const setup = (data: any[] | undefined, wizard: string, url: string) => (data?.length ? url : "#wizard:" + wizard);
    const admin: (QuickAction | false)[] = [
      content && { label: Locale.label("dashboard.adminWelcome.addLogoTitle"), icon: "image", url: "/site/appearance#logo" },
      content && { label: Locale.label("dashboard.adminWelcome.createWebpageTitle"), icon: "language", url: setup(pages.data, "webpage", "/site/pages") },
      can(Permissions.membershipApi.settings.edit) && { label: Locale.label("dashboard.adminWelcome.onlineGivingTitle"), icon: "volunteer_activism", url: "/settings#giving" },
      groupsEdit && { label: Locale.label("dashboard.adminWelcome.freeShowTitle"), icon: "music_note", url: setup(teams.data, "freeshow", "/serving/plans") },
      groupsEdit && can(Permissions.membershipApi.plans.edit) && { label: Locale.label("dashboard.adminWelcome.freePlayTitle"), icon: "smart_display", url: setup(planTypes.data, "freeplay", "/serving/plans") },
      can(Permissions.contentApi.streamingServices.edit) && { label: Locale.label("dashboard.adminWelcome.uploadSermonTitle"), icon: "live_tv", url: "/sermons" },
      can(Permissions.membershipApi.people.edit) && { label: Locale.label("dashboard.adminWelcome.addCongregationTitle"), icon: "person", url: "/people" },
      groupsEdit && { label: Locale.label("dashboard.adminWelcome.createGroupTitle"), icon: "groups", url: setup(groups.data, "group", "/groups") },
      can(Permissions.membershipApi.roles.edit) && { label: Locale.label("dashboard.adminWelcome.inviteTeamTitle"), icon: "lock", url: "/settings/roles" }
    ];
    const staff = admin.filter((a): a is QuickAction => !!a);
    if (staff.length) return [...staff, avatar];
    const member: (QuickAction | false)[] = [
      avatar,
      can(Permissions.membershipApi.people.view) && { label: Locale.label("dashboard.memberWelcome.findPeopleTitle"), icon: "person", url: "/people" },
      { label: Locale.label("dashboard.memberWelcome.joinGroupTitle"), icon: "groups", url: b1Url + "/groups" },
      { label: Locale.label("dashboard.memberWelcome.onlineGivingTitle"), icon: "volunteer_activism", url: b1Url + "/donate" },
      { label: Locale.label("dashboard.memberWelcome.upcomingEventsTitle"), icon: "event", url: b1Url },
      { label: Locale.label("dashboard.memberWelcome.downloadAppTitle"), icon: "phone_iphone", url: b1Url + "/mobile/install" }
    ];
    return member.filter((a): a is QuickAction => !!a);
  }, [content, groupsEdit, pages.data, teams.data, groups.data, planTypes.data]);
};
