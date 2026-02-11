import React, { useCallback } from "react";
import { GroupMembers, GroupSessions } from ".";
import { type GroupInterface, type SessionInterface, type PersonInterface } from "@churchapps/helpers";
import { UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { Box, Paper } from "@mui/material";
import { SmartTabs } from "../../components/ui";

interface Props {
  group: GroupInterface;
  addedPerson?: PersonInterface;
  addedSession?: SessionInterface;
  addedCallback: () => void;
  sidebarVisibilityFunction: (name: string, visible: boolean) => void;
}

export const Tabs: React.FC<Props> = (props) => {
  const handleTabChange = useCallback(
    (key: string) => {
      if (key === "members" && UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit)) props.sidebarVisibilityFunction("addPerson", true);
      if (key === "sessions" && UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit)) {
        props.sidebarVisibilityFunction("addPerson", true);
        props.sidebarVisibilityFunction("addMember", true);
      }
    },
    [props]
  );
  const tabsConfig = React.useMemo(() => {
    const canViewMembers = UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view);
    const canViewSessions = UserHelper.checkAccess(Permissions.attendanceApi.attendance.view) && props.group?.trackAttendance;
    return [
      {
        key: "members",
        label: Locale.label("groups.tabs.mem"),
        content: <GroupMembers group={props.group} addedPerson={props.addedPerson} addedCallback={props.addedCallback} />,
        hidden: !canViewMembers
      },
      {
        key: "sessions",
        label: Locale.label("groups.tabs.ses"),
        content: (
          <GroupSessions
            group={props.group}
            sidebarVisibilityFunction={props.sidebarVisibilityFunction}
            addedSession={props.addedSession}
            addedPerson={props.addedPerson}
            addedCallback={props.addedCallback}
          />
        ),
        hidden: !canViewSessions
      }
    ];
  }, [props.group, props.addedPerson, props.addedSession, props.addedCallback, props.sidebarVisibilityFunction]);

  // Compute first visible tab key and initialize sidebars accordingly
  const firstVisibleKey = React.useMemo(() => tabsConfig.find((t) => !t.hidden)?.key, [tabsConfig]);

  React.useEffect(() => {
    if (firstVisibleKey) handleTabChange(firstVisibleKey);
  }, [firstVisibleKey, handleTabChange]);

  if (!props.group || !props.group.id) return null;

  return (
    <Paper>
      <Box>
        <SmartTabs tabs={tabsConfig} ariaLabel="group-tabs" onChange={handleTabChange} />
      </Box>
    </Paper>
  );
};
