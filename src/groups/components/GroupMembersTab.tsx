import React from "react";
import { useQuery } from "@tanstack/react-query";

import { type GroupInterface, type GroupMemberInterface, type PersonInterface } from "@churchapps/helpers";
import { PersonHelper, UserHelper, Permissions } from "@churchapps/apphelper";
import { GroupMembers } from "./GroupMembers";
import { PersonAddAdvanced } from "../../people/components/PersonAddAdvanced";
import { AddBar } from "../../components/ui";

interface Props {
  group: GroupInterface;
}

export const GroupMembersTab = (props: Props) => {
  const [addedPerson, setAddedPerson] = React.useState({} as PersonInterface);
  const addPerson = (p: PersonInterface) => setAddedPerson(p);
  // Same query as the member list, so people already in the group drop out of Recent people and search results.
  const members = useQuery<GroupMemberInterface[]>({ queryKey: [`/groupmembers?groupId=${props.group?.id}`, "MembershipApi"], enabled: !!props.group?.id });
  const memberIds = (members.data || []).map((m) => m.personId || "");

  const handleAddedCallback = () => {
    setAddedPerson({} as PersonInterface);
  };

  return (
    <>
      <GroupMembers group={props.group} addedPerson={addedPerson} addedCallback={handleAddedCallback} />
      {UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit) && (
        <AddBar data-testid="group-members-add" sx={{ mt: 1, "& #personAddBox": { border: 0, boxShadow: "none", bgcolor: "transparent" } }}>
          <PersonAddAdvanced getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={addPerson} onCreate={addPerson} filterList={memberIds} showCreatePersonOnNotFound />
        </AddBar>
      )}
    </>
  );
};
