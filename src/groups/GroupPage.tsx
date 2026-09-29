import React from "react";
import { GroupBanner, GroupDetailsEdit } from "./components";
import { type GroupInterface } from "@churchapps/helpers";
import { useParams } from "react-router-dom";
import { GroupMembersTab } from "./components/GroupMembersTab";
import { GroupSessionsTab } from "./components/GroupSessionsTab";
import { GroupCalendarTab } from "./components/GroupCalendarTab";
import { GroupHealthTab } from "./components/GroupHealthTab";
import { GroupPlate } from "./components/GroupPlate";
import { Box, Button } from "@mui/material";
import { CalendarMonth as AttendanceIcon } from "@mui/icons-material";
import { ApiHelper, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { BackVerb, EmptyState, PageContainer, RecordLayout, useRecordView } from "../components/ui";
import { useQuery } from "@tanstack/react-query";

export const GroupPage = () => {
  const params = useParams();
  // Edit replaces history so Back doesn't reopen a finished form.
  const { view: requestedView, setView } = useRecordView("view", { replace: ["edit"] });

  const group = useQuery<GroupInterface>({
    queryKey: [`/groups/${params.id}`, "MembershipApi"],
    placeholderData: {} as GroupInterface
  });
  const groupData = group.data as GroupInterface;

  const isStandard = (groupData?.tags?.indexOf("standard") ?? -1) > -1;
  const canEdit = UserHelper.checkAccess(Permissions.membershipApi.groups.edit);
  const allowedViews: Record<string, boolean> = {
    edit: canEdit && !!groupData?.id,
    members: true,
    sessions: isStandard,
    calendar: isStandard,
    health: isStandard && UserHelper.checkAccess(Permissions.membershipApi.groupMembers.view)
  };
  const view = allowedViews[requestedView] ? requestedView : "";

  const enableAttendance = () => {
    ApiHelper.post("/groups", [{ ...groupData, trackAttendance: true }], "MembershipApi").then(() => group.refetch());
  };

  const handleUpdated = () => {
    setView("");
    group.refetch();
  };

  const sessionsSlice = () => {
    if (groupData.id && !groupData.trackAttendance) {
      return (
        <EmptyState
          icon={<AttendanceIcon />}
          title={Locale.label("groups.sessionsDisabled.title")}
          description={Locale.label("groups.sessionsDisabled.description")}
          action={canEdit && (
            <Button variant="contained" onClick={enableAttendance} data-testid="enable-attendance-button">
              {Locale.label("groups.sessionsDisabled.enable")}
            </Button>
          )}
        />
      );
    }
    return <GroupSessionsTab key="sessions" group={groupData} />;
  };

  const back = (
    <Box>
      <BackVerb name={groupData?.name || ""} onClick={() => setView("")} data-testid="group-record-back" />
    </Box>
  );

  const slice = () => {
    switch (view) {
      case "edit": return <GroupDetailsEdit id="groupDetailsBox" group={groupData} updatedFunction={handleUpdated} />;
      case "members": return <>{back}<GroupMembersTab key="members" group={groupData} /></>;
      case "sessions": return <>{back}{sessionsSlice()}</>;
      case "calendar": return <>{back}<GroupCalendarTab key="calendar" group={groupData} /></>;
      case "health": return <>{back}<GroupHealthTab key="health" group={groupData} /></>;
      default:
        if (!groupData?.id) return null;
        // Teams and ministries only have members, so a one-block plate would just be a detour.
        if (!isStandard) return <GroupMembersTab key="members" group={groupData} />;
        return <GroupPlate group={groupData} onView={setView} onEnableAttendance={enableAttendance} />;
    }
  };

  return (
    <PageContainer>
      <RecordLayout
        spacing={view ? 3 : 5}
        data-testid="group-record"
        identity={<GroupBanner group={groupData} onEdit={() => setView("edit")} editMode={view === "edit"} />}>
        {slice()}
      </RecordLayout>
    </PageContainer>
  );
};
