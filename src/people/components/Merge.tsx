import React from "react";
import { Search, MergeModal } from ".";
import { type ConversationInterface, type GroupMemberInterface, type MessageInterface, type VisitInterface, type FormSubmissionInterface } from "@churchapps/helpers";
import { ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { type PersonInterface, type DonationInterface } from "@churchapps/helpers";
import { type PersonFieldValueInterface } from "../../helpers/Interfaces";
import { useNavigate } from "react-router-dom";
import { useMountedState } from "@churchapps/apphelper";
import UserContext from "../../UserContext";

interface Props {
  hideMergeBox: () => void;
  person: PersonInterface;
}

export const Merge: React.FunctionComponent<Props> = (props) => {
  const [searchResults, setSearchResults] = React.useState<PersonInterface[] | null>(null);
  const [showMergeModal, setShowMergeModal] = React.useState<boolean>(false);
  const [personToMerge, setPersonToMerge] = React.useState<PersonInterface | null>(null);
  const [mergeInProgress, setMergeInProgress] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const navigate = useNavigate();
  const isMounted = useMountedState();
  const context = React.useContext(UserContext);

  const handleMerge = (personId: string) => {
    const person: PersonInterface[] = [...(searchResults || [])].filter((p) => p.id === personId);
    setPersonToMerge(person[0]);
    setShowMergeModal(true);
  };

  const search = async (searchText: string) => {
    try {
      const results: PersonInterface[] = await ApiHelper.post("/people/search", { term: searchText }, "MembershipApi");
      const filteredList = results.filter((person) => person.id !== props.person.id);
      setSearchResults(filteredList);
    } catch (error) {
      console.log("Error occured in fetching search results: ", error);
    }
  };

  const fetchHouseholdMembers = (householdId: string): Promise<PersonInterface[]> => ApiHelper.get("/people/household/" + householdId, "MembershipApi");

  const fetchGroupMembers = (personId: string): Promise<GroupMemberInterface[]> => ApiHelper.get(`/groupmembers?personId=${personId}`, "MembershipApi");

  // Notes are conversation messages, not rows keyed to the person, so they move by
  // re-posting them into the surviving person's conversation.
  const transferNotes = async (winner: PersonInterface, loserId: string) => {
    const conversations: ConversationInterface[] = await ApiHelper.get(`/conversations/messages/person/${loserId}?limit=200`, "MessagingApi");
    const messages = (conversations || []).flatMap((c) => c.messages || []);
    // The conflict resolver may already have handed the winner the discarded person's conversation.
    if (messages.length === 0 || (conversations || []).some((c) => c.id === winner.conversationId)) return winner.conversationId;
    let conversationId = winner.conversationId;
    if (!conversationId) {
      const created: ConversationInterface[] = await ApiHelper.post("/conversations", [{ allowAnonymousPosts: false, contentType: "person", contentId: winner.id, title: winner.name?.display + Locale.label("people.personPage.notesSuffix"), visibility: "hidden" }], "MessagingApi");
      conversationId = created[0].id;
    }
    await ApiHelper.post("/messages", messages.map((m: MessageInterface) => ({ ...m, id: undefined, conversationId })), "MessagingApi");
    return conversationId;
  };

  const fetchVisits = (personId: string): Promise<VisitInterface[]> => ApiHelper.get(`/visits?personId=${personId}`, "AttendanceApi");

  const fetchDonations = (personId: string): Promise<DonationInterface[]> => ApiHelper.get(`/donations?personId=${personId}`, "GivingApi");

  const fetchFormSubmissions = (personId: string): Promise<FormSubmissionInterface[]> => ApiHelper.get(`/formsubmissions?personId=${personId}`, "MembershipApi");

  const fetchPersonFieldValues = async (personId: string): Promise<PersonFieldValueInterface[]> => (await ApiHelper.get(`/personfieldvalues/person/${personId}`, "MembershipApi")) || [];

  const merge = async (person: PersonInterface, personToRemove: PersonInterface) => {
    if (personToRemove.id === context?.person?.id) {
      setErrors([Locale.label("people.personEdit.cannotDeleteSelf")]);
      setShowMergeModal(false);
      return;
    }
    setErrors([]);
    try {
      setMergeInProgress(true);
      const { id, householdId } = personToRemove;
      const [householdMembers, groupMembers, winnerGroupMembers, visits, donations, formSubmission] = await Promise.all([
        fetchHouseholdMembers(householdId || ""),
        fetchGroupMembers(id || ""),
        fetchGroupMembers(person.id || ""),
        fetchVisits(id || ""),
        fetchDonations(id || ""),
        fetchFormSubmissions(id || "")
      ]);
      person.conversationId = await transferNotes(person, id || "");
      const [winnerFieldValues, loserFieldValues] = await Promise.all([fetchPersonFieldValues(person.id || ""), fetchPersonFieldValues(id || "")]);

      const promises: Promise<unknown>[] = [];
      householdMembers?.forEach((member) => {
        if (member.id === id || member.id === person.id) return;
        member.householdId = person.householdId;
        promises.push(ApiHelper.post("/people", [member], "MembershipApi"));
      });
      const winnerGroupIds = new Set((winnerGroupMembers || []).map((gm) => gm.groupId));
      groupMembers?.forEach((groupMember) => {
        if (winnerGroupIds.has(groupMember.groupId)) promises.push(ApiHelper.delete(`/groupmembers/${groupMember.id}`, "MembershipApi"));
        else promises.push(ApiHelper.post("/groupmembers", [{ ...groupMember, personId: person.id || "" }], "MembershipApi"));
      });
      visits?.forEach((visit) => {
        visit.personId = person.id;
        promises.push(ApiHelper.post(`/visits`, [visit], "AttendanceApi"));
      });
      donations?.forEach((donation) => {
        donation.personId = person.id;
        promises.push(ApiHelper.post("/donations", [donation], "GivingApi"));
      });
      formSubmission?.forEach((form) => {
        form.contentId = person.id;
        promises.push(ApiHelper.post("/formsubmissions", { formSubmissions: [form] }, "MembershipApi"));
      });
      // Custom field values: winner's own values win; copy the loser's only where the winner
      // has none, then blank the loser's rows so they don't orphan after the delete below.
      const winnerFieldIds = new Set(winnerFieldValues.map((v) => v.fieldId));
      const fieldValueChanges: PersonFieldValueInterface[] = [];
      loserFieldValues.forEach((v) => {
        if (!v.value) return;
        if (!winnerFieldIds.has(v.fieldId)) fieldValueChanges.push({ personId: person.id, fieldId: v.fieldId, value: v.value });
        fieldValueChanges.push({ personId: id, fieldId: v.fieldId, value: "" });
      });
      if (fieldValueChanges.length > 0) promises.push(ApiHelper.post("/personfieldvalues", fieldValueChanges, "MembershipApi"));
      promises.push(ApiHelper.post(`/people`, [person], "MembershipApi"));
      await Promise.all(promises);
      // Only delete once everything has been reassigned, so a failure never orphans the loser's records.
      await ApiHelper.delete(`/people/${id}`, "MembershipApi");
      if (isMounted()) {
        setShowMergeModal(false);
      }
      navigate("/people");
      if (isMounted()) {
        setMergeInProgress(false);
      }
    } catch (error) {
      setMergeInProgress(false);
      setShowMergeModal(false);
      setErrors([Locale.label("common.saveError")]);
      console.log("Error in merging records...!!", error);
    }
  };

  const person1 = React.useMemo(() => ({ ...props.person }), [props.person]);
  return (
    <>
      <MergeModal show={showMergeModal} onHide={() => setShowMergeModal(false)} person1={person1} person2={personToMerge} merge={merge} mergeInProgress={mergeInProgress} />
      <FormCard id="mergeBox" icon="person_add" title={Locale.label("people.merge.findPerson")} onCancel={props.hideMergeBox} cancelText={Locale.label("common.close")}>
        <ErrorMessages errors={errors} />
        <Search handleSearch={search} searchResults={searchResults || []} buttonText={Locale.label("people.merge.merge")} handleClickAction={handleMerge} />
      </FormCard>
    </>
  );
};
