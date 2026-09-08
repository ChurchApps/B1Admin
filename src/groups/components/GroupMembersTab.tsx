import React from "react";

import { type GroupInterface, type PersonInterface } from "@churchapps/helpers";
import { PersonHelper, UserHelper, Permissions, Locale } from "@churchapps/apphelper";
import { GroupMembers } from "./GroupMembers";
import { PersonAddAdvanced } from "../../people/components/PersonAddAdvanced";

interface Props {
  group: GroupInterface;
}

export const GroupMembersTab = (props: Props) => {
  const [addedPerson, setAddedPerson] = React.useState({} as PersonInterface);
  const addPerson = (p: PersonInterface) => setAddedPerson(p);

  const handleAddedCallback = () => {
    setAddedPerson({} as PersonInterface);
  };

  return (
    <>
      <h3 style={{ marginTop: 0 }}>{Locale.label("groups.groupNavigation.members")}</h3>
      <GroupMembers group={props.group} addedPerson={addedPerson} addedCallback={handleAddedCallback} />
      {UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit) && (
        <PersonAddAdvanced getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={addPerson} showCreatePersonOnNotFound />
      )}
    </>
  );
};
