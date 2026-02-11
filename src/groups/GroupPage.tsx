import React from "react";
import { GroupBanner, GroupDetailsEdit, GroupNavigation } from "./components";
import { type GroupInterface } from "@churchapps/helpers";
import { useParams } from "react-router-dom";
import { GroupMembersTab } from "./components/GroupMembersTab";
import { GroupSessionsTab } from "./components/GroupSessionsTab";
import { Grid } from "@mui/material";
import { useQuery } from "@tanstack/react-query";

export const GroupPage = () => {
  const params = useParams();

  const [selectedTab, setSelectedTab] = React.useState("");
  const [editMode, setEditMode] = React.useState(false);

  const group = useQuery<GroupInterface>({
    queryKey: [`/groups/${params.id}`, "MembershipApi"],
    placeholderData: {} as GroupInterface
  });

  React.useEffect(() => {
    if (selectedTab === "") {
      setSelectedTab("members");
    }
  }, [selectedTab]);

  const getCurrentTab = () => {
    let currentTab = null;
    switch (selectedTab) {
      case "members": currentTab = <GroupMembersTab key="members" group={group.data} />; break;
      case "sessions": currentTab = <GroupSessionsTab key="sessions" group={group.data} />; break;
      default: currentTab = <GroupMembersTab key="members" group={group.data} />; break;
    }
    return currentTab;
  };

  const handleEdit = () => {
    setEditMode(true);
  };

  const handleUpdated = () => {
    setEditMode(false);
    group.refetch();
  };

  return (
    <>
      <GroupBanner group={group.data} onEdit={handleEdit} editMode={editMode} />
      {!editMode && <GroupNavigation selectedTab={selectedTab} onTabChange={setSelectedTab} group={group.data} />}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <div id="mainContent">{editMode ? <GroupDetailsEdit id="groupDetailsBox" group={group.data} updatedFunction={handleUpdated} /> : getCurrentTab()}</div>
        </Grid>
      </Grid>
    </>
  );
};
