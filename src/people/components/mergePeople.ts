import { type ConversationInterface, type GroupMemberInterface, type MessageInterface, type VisitInterface, type FormSubmissionInterface, type PersonInterface, type DonationInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { type PersonFieldValueInterface } from "../../helpers/Interfaces";

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

const fetchDonations = (personId: string): Promise<DonationInterface[]> => ApiHelper.get(`/donations?personId=${personId}&includeNonDeductible=1`, "GivingApi");

const fetchFormSubmissions = (personId: string): Promise<FormSubmissionInterface[]> => ApiHelper.get(`/formsubmissions?personId=${personId}`, "MembershipApi");

const fetchPersonFieldValues = async (personId: string): Promise<PersonFieldValueInterface[]> => (await ApiHelper.get(`/personfieldvalues/person/${personId}`, "MembershipApi")) || [];

// Moves everything that belongs to loser onto winner, saves winner, then deletes loser.
export const mergePeople = async (winner: PersonInterface, loser: PersonInterface) => {
  const { id, householdId } = loser;
  const [householdMembers, groupMembers, winnerGroupMembers, visits, donations, formSubmission] = await Promise.all([
    fetchHouseholdMembers(householdId || ""),
    fetchGroupMembers(id || ""),
    fetchGroupMembers(winner.id || ""),
    fetchVisits(id || ""),
    fetchDonations(id || ""),
    fetchFormSubmissions(id || "")
  ]);
  winner.conversationId = await transferNotes(winner, id || "");
  const [winnerFieldValues, loserFieldValues] = await Promise.all([fetchPersonFieldValues(winner.id || ""), fetchPersonFieldValues(id || "")]);

  const promises: Promise<unknown>[] = [];
  householdMembers?.forEach((member) => {
    if (member.id === id || member.id === winner.id) return;
    member.householdId = winner.householdId;
    promises.push(ApiHelper.post("/people", [member], "MembershipApi"));
  });
  const winnerGroupIds = new Set((winnerGroupMembers || []).map((gm) => gm.groupId));
  groupMembers?.forEach((groupMember) => {
    if (winnerGroupIds.has(groupMember.groupId)) promises.push(ApiHelper.delete(`/groupmembers/${groupMember.id}`, "MembershipApi"));
    else promises.push(ApiHelper.post("/groupmembers", [{ ...groupMember, personId: winner.id || "" }], "MembershipApi"));
  });
  visits?.forEach((visit) => {
    visit.personId = winner.id;
    promises.push(ApiHelper.post(`/visits`, [visit], "AttendanceApi"));
  });
  donations?.forEach((donation) => {
    donation.personId = winner.id;
    promises.push(ApiHelper.post("/donations", [donation], "GivingApi"));
  });
  formSubmission?.forEach((form) => {
    promises.push(ApiHelper.post(`/formsubmissions/${form.id}/person`, { personId: winner.id }, "MembershipApi"));
  });
  // Custom field values: winner's own values win; copy the loser's only where the winner
  // has none, then blank the loser's rows so they don't orphan after the delete below.
  const winnerFieldIds = new Set(winnerFieldValues.map((v) => v.fieldId));
  const fieldValueChanges: PersonFieldValueInterface[] = [];
  loserFieldValues.forEach((v) => {
    if (!v.value) return;
    if (!winnerFieldIds.has(v.fieldId)) fieldValueChanges.push({ personId: winner.id, fieldId: v.fieldId, value: v.value });
    fieldValueChanges.push({ personId: id, fieldId: v.fieldId, value: "" });
  });
  if (fieldValueChanges.length > 0) promises.push(ApiHelper.post("/personfieldvalues", fieldValueChanges, "MembershipApi"));
  promises.push(ApiHelper.post(`/people`, [winner], "MembershipApi"));
  await Promise.all(promises);
  // Only delete once everything has been reassigned, so a failure never orphans the loser's records.
  await ApiHelper.delete(`/people/${id}`, "MembershipApi");
};
