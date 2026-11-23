import React from "react";
import { Search, MergeModal } from ".";
import { ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { FormCard } from "../../components/ui";
import { type PersonInterface } from "@churchapps/helpers";
import { useNavigate } from "react-router-dom";
import { useMountedState } from "@churchapps/apphelper";
import UserContext from "../../UserContext";
import { mergePeople } from "./mergePeople";

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

  const merge = async (person: PersonInterface, personToRemove: PersonInterface) => {
    if (personToRemove.id === context?.person?.id) {
      setErrors([Locale.label("people.personEdit.cannotDeleteSelf")]);
      setShowMergeModal(false);
      return;
    }
    setErrors([]);
    try {
      setMergeInProgress(true);
      await mergePeople(person, personToRemove);
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
