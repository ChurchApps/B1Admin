import React from "react";

import { type GroupInterface, type PersonInterface } from "@churchapps/helpers";
import { PersonHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import { Grid } from "@mui/material";
import { GroupMembers } from "./GroupMembers";
import { PersonAddAdvanced } from "../../people/components/PersonAddAdvanced";

interface Props {
  group: GroupInterface;
}

export const GroupMembersTab = (props: Props) => {
  const [addedPerson, setAddedPerson] = React.useState({} as PersonInterface);
  const addPerson = (p: PersonInterface) => setAddedPerson(p);

  const handleAddedCallback = () => {
    setAddedPerson(null);
  };

  return (
    <>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <GroupMembers group={props.group} addedPerson={addedPerson} addedCallback={handleAddedCallback} />
        </Grid>
        {UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit) && (
          <Grid size={{ xs: 12, md: 4 }}>
            <PersonAddAdvanced getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={addPerson} showCreatePersonOnNotFound />
          </Grid>
        )}
      </Grid>
    </>
  );
};
