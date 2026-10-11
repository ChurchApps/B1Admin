import React from "react";

import { type GroupInterface, type PersonInterface, type SessionInterface } from "@churchapps/helpers";
import { PersonHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import { Grid, Stack } from "@mui/material";
import { AddBar } from "../../components/ui";
import { PersonAddAdvanced } from "../../people/components/PersonAddAdvanced";
import { GroupSessionsList } from "./GroupSessionsList";
import { SessionAttendance } from "./SessionAttendance";
import { SessionEdit } from "./SessionEdit";

// The record is already one surface; drop the inner card chrome.
const flatSx = { border: 0, boxShadow: "none", bgcolor: "transparent" };

interface Props {
  group: GroupInterface;
}

export const GroupSessionsTab = (props: Props) => {
  const [addedPerson, setAddedPerson] = React.useState<PersonInterface | undefined>({} as PersonInterface);
  const [addedSession, setAddedSession] = React.useState({} as SessionInterface);
  const [addSessionVisible, setAddSessionVisible] = React.useState(false);
  const [editSessionVisible, setEditSessionVisible] = React.useState(false);
  const [editingSession, setEditingSession] = React.useState<SessionInterface | null>(null);
  const [selectedSession, setSelectedSession] = React.useState<SessionInterface | null>(null);

  const addPerson = React.useCallback((p: PersonInterface) => setAddedPerson(p), []);

  const handleAddedCallback = React.useCallback(() => {
    setAddedPerson(undefined);
  }, []);

  const handleSessionEdit = React.useCallback((session: SessionInterface) => {
    setEditingSession(session);
    setEditSessionVisible(true);
    setAddSessionVisible(false);
  }, []);

  const handleSessionUpdated = React.useCallback((session: SessionInterface | null) => {
    setAddedSession(session ? ({ ...session, _updateTimestamp: Date.now() } as SessionInterface) : ({} as SessionInterface));
    setEditSessionVisible(false);
    setEditingSession(null);
  }, []);

  const handleSessionAdd = React.useCallback((session: SessionInterface | null) => {
    setAddedSession(session || ({} as SessionInterface));
    setAddSessionVisible(false);
  }, []);

  const handleAttendanceSaved = React.useCallback(() => {
    if (selectedSession) setAddedSession({ ...selectedSession, _updateTimestamp: Date.now() } as SessionInterface);
  }, [selectedSession]);

  const handleShowAddSession = React.useCallback(() => {
    setAddSessionVisible(true);
    setEditSessionVisible(false);
  }, []);

  return (
    <Grid container spacing={3} sx={{ "& > .MuiGrid-root > section, & > .MuiGrid-root > .MuiStack-root > section:not([data-testid]), & > .MuiGrid-root .MuiPaper-root": flatSx }}>
      <Grid size={{ xs: 12, md: 5 }}>
        <GroupSessionsList
          group={props.group}
          selectedSession={selectedSession}
          onSelectSession={setSelectedSession}
          onEditSession={handleSessionEdit}
          onAddSession={handleShowAddSession}
          addedSession={addedSession}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 7 }}>
        <Stack spacing={3}>
          {addSessionVisible && <SessionEdit key="sessionAdd" group={props.group} updatedFunction={handleSessionAdd} />}
          {editSessionVisible && editingSession && <SessionEdit key="sessionEdit" group={props.group} session={editingSession} updatedFunction={handleSessionUpdated} />}
          <SessionAttendance
            group={props.group}
            session={selectedSession}
            addedPerson={addedPerson}
            addedCallback={handleAddedCallback}
            onSaved={handleAttendanceSaved}
          />
          {!addSessionVisible && !editSessionVisible && UserHelper.checkAccess(Permissions.attendanceApi.attendance.edit) && (
            <AddBar data-testid="session-person-add" sx={{ mt: 0 }}>
              <PersonAddAdvanced getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={addPerson} showCreatePersonOnNotFound />
            </AddBar>
          )}
        </Stack>
      </Grid>
    </Grid>
  );
};
