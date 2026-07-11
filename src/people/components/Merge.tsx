import React from "react";
import { Search, MergeModal } from ".";
import { type GroupMemberInterface, type VisitInterface, type FormSubmissionInterface } from "@churchapps/helpers";
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

  const handleSave = () => {
    props.hideMergeBox();
  };

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

  const fetchHouseholdMembers = async (householdId: string) => {
    try {
      const members: PersonInterface[] = await ApiHelper.get("/people/household/" + householdId, "MembershipApi");
      return members;
    } catch (error) {
      console.log("Error occured in fetching household members: ", error);
    }
  };

  const fetchGroupMembers = async (personId: string) => {
    try {
      const groups: GroupMemberInterface[] = await ApiHelper.get(`/groupmembers?personId=${personId}`, "MembershipApi");
      return groups;
    } catch (error) {
      console.log("Error in fetching group's data: ", error);
    }
  };

  /*
  const fetchNotes = async (contentId: string) => {
    try {
      const notes: NoteInterface[] = await ApiHelper.get(`/notes/person/${contentId}`, "MembershipApi");
      return notes;
    } catch (err) {
      console.log("Error in fetching notes: ", err)
    }
  }*/

  const fetchVisits = async (personId: string) => {
    try {
      const visits: VisitInterface[] = await ApiHelper.get(`/visits?personId=${personId}`, "AttendanceApi");
      return visits;
    } catch (error) {
      console.log("Error in fetching visits: ", error);
    }
  };

  const fetchDonations = async (personId: string) => {
    try {
      const donations: DonationInterface[] = await ApiHelper.get(`/donations?personId=${personId}`, "GivingApi");
      return donations;
    } catch (error) {
      console.log("Error in fetching donations: ", error);
    }
  };

  const fetchFormSubmissions = async (personId: string) => {
    try {
      const formSubmissions: FormSubmissionInterface[] = await ApiHelper.get(`/formsubmissions?personId=${personId}`, "MembershipApi");
      return formSubmissions;
    } catch (error) {
      console.log("Error in fetching form submissions: ", error);
    }
  };

  const fetchPersonFieldValues = async (personId: string) => {
    try {
      const values: PersonFieldValueInterface[] = await ApiHelper.get(`/personfieldvalues/person/${personId}`, "MembershipApi");
      return values || [];
    } catch {
      return [];
    }
  };

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
      const householdMembers = await fetchHouseholdMembers(householdId || "");
      const groupMembers = await fetchGroupMembers(id || "");
      //const notes = await fetchNotes(id);
      const visits = await fetchVisits(id || "");
      const donations = await fetchDonations(id || "");
      const formSubmission = await fetchFormSubmissions(id || "");
      const [winnerFieldValues, loserFieldValues] = await Promise.all([fetchPersonFieldValues(person.id || ""), fetchPersonFieldValues(id || "")]);

      const promises = [];
      householdMembers?.forEach((member) => {
        member.householdId = person.householdId;
        promises.push(ApiHelper.post("/people", [member], "MembershipApi"));
      });
      groupMembers?.forEach((groupMember) => {
        groupMember.personId = person.id || "";
        promises.push(ApiHelper.post("/groupmembers", [groupMember], "MembershipApi"));
      });
      /*
      notes.forEach(note => {
        note.contentId = person.id;
        promises.push(ApiHelper.post("/notes", [note], "MembershipApi"));
      })*/

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
      promises.push(ApiHelper.delete(`/people/${id}`, "MembershipApi"));
      await Promise.all(promises);
      if (isMounted()) {
        setShowMergeModal(false);
      }
      navigate("/people");
      if (isMounted()) {
        setMergeInProgress(false);
      }
    } catch (error) {
      setMergeInProgress(false);
      console.log("Error in merging records...!!", error);
    }
  };

  const person1 = { ...props.person };
  return (
    <>
      <MergeModal show={showMergeModal} onHide={() => setShowMergeModal(false)} person1={person1} person2={personToMerge} merge={merge} mergeInProgress={mergeInProgress} />
      <FormCard id="mergeBox" icon="person_add" title={Locale.label("people.merge.mergeRec")} onSave={handleSave} onCancel={props.hideMergeBox}>
        <ErrorMessages errors={errors} />
        <Search handleSearch={search} searchResults={searchResults || []} buttonText={Locale.label("people.merge.merge")} handleClickAction={handleMerge} />
      </FormCard>
    </>
  );
};
