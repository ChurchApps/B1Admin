"use client";

import React, { useEffect, useState } from "react";

import { type PersonInterface } from "@churchapps/helpers";
import { Table, TableBody, TableRow, TableCell, Avatar, Button } from "@mui/material";
import { Person as PersonIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";

interface Props {
  addFunction: (person: PersonInterface) => void;
  getPhotoUrl: (person: PersonInterface) => string;
  includeEmail?: boolean;
  actionLabel?: string;
  searchResults: PersonInterface[];
}

export const PersonAddResults: React.FC<Props> = (props: Props) => {
  const [searchResults, setSearchResults] = useState<PersonInterface[]>(props.searchResults);

  useEffect(() => {
    setSearchResults(props.searchResults);
  }, [props.searchResults]);

  const handleAdd = (person: PersonInterface) => {
    const sr: PersonInterface[] = [...searchResults];
    const idx = sr.indexOf(person);
    sr.splice(idx, 1);
    setSearchResults(sr);
    props.addFunction(person);
  };

  const rows = [];
  for (let i = 0; i < searchResults.length; i++) {
    const sr = searchResults[i];

    rows.push(
      <TableRow key={sr.id}>
        <TableCell>
          <Avatar src={props.getPhotoUrl(sr)} sx={{ width: 48, height: 48 }} />
        </TableCell>
        <TableCell>
          {sr.name.display}
          {props.includeEmail && (
            <>
              <br />
              <i style={{ color: "#999" }}>{sr.contactInfo.email}</i>
            </>
          )}
        </TableCell>
        <TableCell>
          <Button size="small" variant="contained" color="success" startIcon={<PersonIcon />} aria-label={Locale.label("people.personAddResults.addPersonAria").replace("{name}", sr.name.display)} onClick={() => handleAdd(sr)} data-testid={`add-person-button-${sr.id || "new"}`}>{props.actionLabel || Locale.label("people.personAddResults.add")}</Button>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <Table size="small" id="householdMemberAddTable">
      <TableBody>{rows}</TableBody>
    </Table>
  );
};
