import { Table, TableBody, TableCell, TableRow } from "@mui/material";
import React, { useState, useEffect } from "react";
import { PersonAdd } from "../../components";
import { type PersonInterface } from "@churchapps/helpers";
import { SmallButton, PersonHelper, Locale, PersonAvatar } from "@churchapps/apphelper";

interface Props {
  person: PersonInterface;
  handleAssociatePerson: (person: PersonInterface) => void;
  searchStatus: (value: boolean) => void;
  filterList?: string[];
  onChangeClick?: () => void;
  showChangeOption?: boolean;
}

export const AssociatePerson = ({ person, handleAssociatePerson, searchStatus, filterList, onChangeClick = () => {}, showChangeOption = true }: Props) => {
  const [showSearchPerson, setShowSearchPerson] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);

  useEffect(() => {
    setShowSearchPerson(false);
    setHasSearched(false);
  }, [person]);

  const searchClicked = () => {
    setHasSearched(true);
  };

  const handleChangeClick = () => {
    setShowSearchPerson(true);
    onChangeClick();
  };

  useEffect(() => {
    searchStatus(hasSearched);
  }, [hasSearched, searchStatus]);

  if (!person || showSearchPerson) {
    return <PersonAdd getPhotoUrl={PersonHelper.getPhotoUrl} addFunction={handleAssociatePerson} searchClicked={searchClicked} filterList={filterList} includeEmail={true} />;
  }
  return (
    <Table size="small">
      <TableBody>
        <TableRow>
          <TableCell>
            <PersonAvatar person={person} size="small" />
          </TableCell>
          <TableCell className="border-0">{person?.name?.display}</TableCell>
          {showChangeOption && (
            <TableCell className="border-0">
              <SmallButton data-cy="change-person" onClick={handleChangeClick} text={Locale.label("settings.associatePerson.change")} icon="person" />
            </TableCell>
          )}
        </TableRow>
      </TableBody>
    </Table>
  );
};
