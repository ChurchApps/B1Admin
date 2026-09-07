"use client";

import React from "react";

import { type PersonInterface } from "@churchapps/helpers";
import { Locale, DisplayBox, PersonHelper } from "@churchapps/apphelper";
import { PersonAdd } from "../../components";
import { Button } from "@mui/material";
import { AdvancedPeopleSearch } from "./AdvancedPeopleSearch";
import { PersonAddResults } from "./PersonAddResults";

interface Props {
  addFunction: (person: PersonInterface) => void;
  person?: PersonInterface;
  getPhotoUrl: (person: PersonInterface) => string;
  searchClicked?: () => void;
  filterList?: string[];
  includeEmail?: boolean;
  actionLabel?: string;
  showCreatePersonOnNotFound?: boolean;
}

export const PersonAddAdvanced: React.FC<Props> = (props: Props) => {
  const [advanced, setAdvanced] = React.useState(false);
  const [advancedPeople, setAdvancedPeople] = React.useState<PersonInterface[]>([]);
  const toggleAdvanced = () => {
    setAdvanced(!advanced);
  };

  const updateSearchResults = (people: PersonInterface[]) => {
    setAdvancedPeople(people);
  };

  if (advanced) {
    return (
      <>
        <AdvancedPeopleSearch updateSearchResults={updateSearchResults} toggleFunction={toggleAdvanced} />
        <DisplayBox key="displayBox" id="personAddBox" headerIcon="person" headerText={Locale.label("groups.groupPage.addPpl")}>
          <PersonAddResults addFunction={props.addFunction} getPhotoUrl={props.getPhotoUrl} includeEmail={props.includeEmail} actionLabel={props.actionLabel} searchResults={advancedPeople} />
        </DisplayBox>
      </>
    );
  } else {
    const toggleButton = (
      <Button
        onClick={(e) => {
          e.preventDefault();
          toggleAdvanced();
        }}
        sx={{ textTransform: "none" }}>
        {Locale.label("people.peopleSearch.adv")}
      </Button>
    );

    return (
      <DisplayBox key="displayBox" id="personAddBox" headerIcon="person" headerText={Locale.label("groups.groupPage.addPpl")} editContent={toggleButton}>
        <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={props.addFunction} showCreatePersonOnNotFound />
      </DisplayBox>
    );
  }
};
