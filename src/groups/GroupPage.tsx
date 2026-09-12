import React, { useCallback } from "react";
import { GroupBanner, GroupDetailsEdit } from "./components";
import { type GroupInterface } from "@churchapps/helpers";
import { useParams, useSearchParams } from "react-router-dom";
import { GroupMembersTab } from "./components/GroupMembersTab";
import { GroupSessionsTab } from "./components/GroupSessionsTab";
import { GroupCalendarTab } from "./components/GroupCalendarTab";
import { GroupHealthTab } from "./components/GroupHealthTab";
import { GroupPlate } from "./components/GroupPlate";
import { Locale, UserHelper, Permissions, ApiHelper } from "@churchapps/apphelper";
import { Button } from "@mui/material";
import { EmptyState } from "../components/ui/EmptyState";
import { CalendarMonth as AttendanceIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import "./omarchy.css";

export const GroupPage = () => {
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get("view") || "";

  const group = useQuery<GroupInterface>({
    queryKey: [`/groups/${params.id}`, "MembershipApi"],
    placeholderData: {} as GroupInterface
  });
  const groupData = group.data as GroupInterface;

  const setView = useCallback((next: string) => {
    const q = new URLSearchParams();
    if (next) q.set("view", next);
    setSearchParams(q, { replace: true });
  }, [setSearchParams]);

  const enableAttendance = () => {
    ApiHelper.post("/groups", [{ ...groupData, trackAttendance: true }], "MembershipApi").then(() => {
      group.refetch().then(() => setView("sessions"));
    });
  };

  const handleUpdated = () => {
    setView("");
    group.refetch();
  };

  const sessionsView = () => {
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

  const rest = (() => {
    if (view === "edit" && groupData.id) {
      return <GroupDetailsEdit id="groupDetailsBox" group={groupData} updatedFunction={handleUpdated} />;
    }
    if (view === "members") {
      return (
        <>
          <button type="button" className="og-back" onClick={() => setView("")}>← {groupData.name}</button>
          <GroupMembersTab key="members" group={groupData} />
        </>
      );
    }
    if (view === "sessions") {
      return (
        <>
          <button type="button" className="og-back" onClick={() => setView("")}>← {groupData.name}</button>
          {sessionsView()}
        </>
      );
    }
    if (view === "calendar") {
      return (
        <>
          <button type="button" className="og-back" onClick={() => setView("")}>← {groupData.name}</button>
          <GroupCalendarTab key="calendar" group={groupData} />
        </>
      );
    }
    if (view === "health") {
      return (
        <>
          <button type="button" className="og-back" onClick={() => setView("")}>← {groupData.name}</button>
          <GroupHealthTab key="health" group={groupData} />
        </>
      );
    }
    return <GroupPlate group={groupData} onView={setView} onEnableAttendance={enableAttendance} />;
  })();

  return (
    <div className="og-record">
      <GroupBanner group={groupData} onEdit={() => setView("edit")} />
      <section className="og-rest" id="mainContent">{rest}</section>
    </div>
  );
};
