"use client";

import React, { useEffect, useState } from "react";

import { type PersonInterface } from "@churchapps/helpers";
import { Table, TableBody, TableRow, TableCell, Avatar } from "@mui/material";
import { PersonAdd as PersonAddIcon } from "@mui/icons-material";
import { Locale } from "@churchapps/apphelper";
import { AppIconButton } from "../../components/ui/AppIconButton";

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
              <i style={{ color: "var(--text-muted)" }}>{sr.contactInfo.email}</i>
            </>
          )}
        </TableCell>
        <TableCell>
          <AppIconButton intent="add" label={Locale.label("common.add")} icon={<PersonAddIcon />} onClick={() => handleAdd(sr)} data-testid={`add-person-button-${sr.id || "new"}`} />
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
