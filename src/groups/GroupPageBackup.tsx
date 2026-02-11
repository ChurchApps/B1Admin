import React from "react";
import { MembersAdd, GroupDetails, Tabs, SessionAdd } from "./components";
import { type GroupInterface, type PersonInterface, type SessionInterface } from "@churchapps/helpers";
import { ApiHelper, PersonHelper } from "@churchapps/apphelper";
import { useParams } from "react-router-dom";
import { Grid } from "@mui/material";
import { PersonAddAdvanced } from "../people/components/PersonAddAdvanced";
import { Banner } from "@churchapps/apphelper";

export const GroupPage = () => {
  const params = useParams();

  const [group, setGroup] = React.useState({} as GroupInterface);
  const [addedPerson, setAddedPerson] = React.useState({} as PersonInterface);
  const [addedSession, setAddedSession] = React.useState({} as SessionInterface);
  const [addPersonVisible, setAddPersonVisible] = React.useState(false);
  const [addSessionVisible, setAddSessionVisible] = React.useState(false);
  const [addMemberVisible, setAddMemberVisible] = React.useState(false);

  const addPerson = (p: PersonInterface) => setAddedPerson(p);
  const loadData = () => {
    ApiHelper.get("/groups/" + params.id, "MembershipApi").then((data) => setGroup(data));
  };
  const handleSessionAdd = (session: SessionInterface) => {
    setAddedSession(session);
    setAddSessionVisible(false);
  };

  React.useEffect(loadData, []);

  const handleSidebarVisibility = (name: string, visible: boolean) => {
    if (name === "addPerson") setAddPersonVisible(visible);
    else if (name === "addSession") setAddSessionVisible(visible);
    else if (name === "addMember") setAddMemberVisible(visible);
  };

  const getSidebarModules = () => {
    const result = [] as JSX.Element[];
    if (addSessionVisible) result.push(<SessionAdd key="sessionAdd" group={group} updatedFunction={handleSessionAdd} />);
    if (addPersonVisible) result.push(<PersonAddAdvanced getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={addPerson} showCreatePersonOnNotFound />);
    if (addMemberVisible) result.push(<MembersAdd key="membersAdd" group={group} addFunction={addPerson} />);
    return result;
  };

  const handleAddedCallback = () => {
    setAddedPerson(null);

    setAddedSession(null);
  };

  const handleGroupUpdated = (g: GroupInterface) => {
    setGroup(g);
    loadData();
  };

  return (
    <>
      <Banner>
        <h1>{group?.name}</h1>
      </Banner>
      <div id="mainContent">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 8 }}>
            <GroupDetails group={group} updatedFunction={handleGroupUpdated} />
            <Tabs group={group} addedPerson={addedPerson} addedSession={addedSession} addedCallback={handleAddedCallback} sidebarVisibilityFunction={handleSidebarVisibility} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>{getSidebarModules()}</Grid>
        </Grid>
      </div>
    </>
  );
};
