import React from "react";

import { type GroupInterface, type PersonInterface, type SessionInterface } from "@churchapps/helpers";
import { PersonHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import { Grid } from "@mui/material";
import { PersonAddAdvanced } from "../../people/components/PersonAddAdvanced";
import { GroupSessions } from "./GroupSessions";
import { MembersAdd } from "./MembersAdd";
import { SessionAdd } from "./SessionAdd";
import { SessionEdit } from "./SessionEdit";

interface Props {
  group: GroupInterface;
}

export const GroupSessionsTab = (props: Props) => {
  const [addedPerson, setAddedPerson] = React.useState({} as PersonInterface);
  const [addedSession, setAddedSession] = React.useState({} as SessionInterface);
  const [addSessionVisible, setAddSessionVisible] = React.useState(false);
  const [editSessionVisible, setEditSessionVisible] = React.useState(false);
  const [editingSession, setEditingSession] = React.useState<SessionInterface>(null);
  const [hiddenPeople, setHiddenPeople] = React.useState([] as string[]);

  const addPerson = React.useCallback((p: PersonInterface) => setAddedPerson(p), []);

  const handleAddedCallback = React.useCallback(() => {
    setAddedPerson(null);
  }, []);

  const handleSidebarVisibility = React.useCallback((name: string, visible: boolean) => {
    if (name === "addSession") setAddSessionVisible(visible);
  }, []);

  const handleSessionEdit = React.useCallback((session: SessionInterface) => {
    setEditingSession(session);
    setEditSessionVisible(true);
    setAddSessionVisible(false);
  }, []);

  const handleSessionUpdated = React.useCallback((session: SessionInterface) => {
    // Force reload by adding timestamp to ensure useEffect triggers
    setAddedSession(session ? ({ ...session, _updateTimestamp: Date.now() } as SessionInterface) : ({} as SessionInterface));
    setEditSessionVisible(false);
    setEditingSession(null);
  }, []);

  const handleSessionAdd = React.useCallback((session: SessionInterface) => {
    setAddedSession(session);
    setAddSessionVisible(false);
  }, []);

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <GroupSessions
            group={props.group}
            sidebarVisibilityFunction={handleSidebarVisibility}
            addedSession={addedSession}
            addedPerson={addedPerson}
            addedCallback={handleAddedCallback}
            setHiddenPeople={setHiddenPeople}
            onSessionEdit={handleSessionEdit}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          {addSessionVisible && <SessionAdd key="sessionAdd" group={props.group} updatedFunction={handleSessionAdd} />}
          {editSessionVisible && editingSession && <SessionEdit key="sessionEdit" group={props.group} session={editingSession} updatedFunction={handleSessionUpdated} />}
          {!addSessionVisible && !editSessionVisible && UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit) && (
            <>
              <PersonAddAdvanced getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={addPerson} showCreatePersonOnNotFound />
              <MembersAdd key="membersAdd" group={props.group} addFunction={addPerson} hiddenPeople={hiddenPeople} />
            </>
          )}
        </Grid>
      </Grid>
    </>
  );
};
