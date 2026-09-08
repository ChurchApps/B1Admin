import React from "react";
import { GroupBanner, GroupDetailsEdit, GroupNavigation } from "./components";
import { type GroupInterface } from "@churchapps/helpers";
import { useParams } from "react-router-dom";
import { GroupMembersTab } from "./components/GroupMembersTab";
import { GroupSessionsTab } from "./components/GroupSessionsTab";
import { GroupCalendarTab } from "./components/GroupCalendarTab";
import { GroupHealthTab } from "./components/GroupHealthTab";
import { Button } from "@mui/material";
import { CalendarMonth as AttendanceIcon } from "@mui/icons-material";
import { ApiHelper, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { EmptyState } from "../components/ui/EmptyState";
import { useQuery } from "@tanstack/react-query";
import "./omarchy.css";

export const GroupPage = () => {
  const params = useParams();

  const [selectedTab, setSelectedTab] = React.useState("members");
  const [editMode, setEditMode] = React.useState(false);

  const group = useQuery<GroupInterface>({
    queryKey: [`/groups/${params.id}`, "MembershipApi"],
    placeholderData: {} as GroupInterface
  });
  const groupData = group.data as GroupInterface;

  React.useEffect(() => {
    if (selectedTab === "") {
      setSelectedTab("members");
    }
  }, [selectedTab]);

  const enableAttendance = () => {
    ApiHelper.post("/groups", [{ ...groupData, trackAttendance: true }], "MembershipApi").then(() => group.refetch());
  };

  const getSessionsTab = () => {
    if (groupData.id && !groupData.trackAttendance) {
      return (
        <EmptyState
          icon={<AttendanceIcon />}
          title={Locale.label("groups.sessionsDisabled.title")}
          description={Locale.label("groups.sessionsDisabled.description")}
          action={UserHelper.checkAccess(Permissions.membershipApi.groups.edit) && (
            <Button variant="contained" onClick={enableAttendance} data-testid="enable-attendance-button">
              {Locale.label("groups.sessionsDisabled.enable")}
            </Button>
          )}
        />
      );
    }
    return <GroupSessionsTab key="sessions" group={groupData} />;
  };

  const getCurrentTab = () => {
    switch (selectedTab) {
      case "sessions": return getSessionsTab();
      case "calendar": return <GroupCalendarTab key="calendar" group={groupData} />;
      case "health": return <GroupHealthTab key="health" group={groupData} />;
      default: return <GroupMembersTab key="members" group={groupData} />;
    }
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleUpdated = () => {
    setEditMode(false);
    group.refetch();
  };

  const handleTabChange = (tab: string) => {
    setEditMode(false);
    setSelectedTab(tab);
  };

  return (
    <div className="og-record">
      <GroupBanner
        group={groupData}
        onEdit={handleEdit}
        editMode={editMode}
      />
      <section className="og-rest">
        {editMode && groupData.id ? (
          <div id="mainContent">
            <GroupDetailsEdit id="groupDetailsBox" group={groupData} updatedFunction={handleUpdated} />
          </div>
        ) : (
          <>
            {selectedTab !== "members" && (
              <button type="button" className="og-back" onClick={() => setSelectedTab("members")}>← {groupData.name}</button>
            )}
            <GroupNavigation selectedTab={selectedTab} onTabChange={handleTabChange} group={groupData} />
            <div id="mainContent">{getCurrentTab()}</div>
          </>
        )}
      </section>
    </div>
  );
};
