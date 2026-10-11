"use client";

import React, { useState } from "react";
import { ApiHelper, Locale } from "../helpers";
import { PersonAvatar } from "@churchapps/apphelper";
import type { PersonInterface } from "@churchapps/helpers";
import { InputAdornment, Link, TextField, Table, TableBody, TableRow, TableCell, Typography } from "@mui/material";
import { PersonAdd as PersonAddIcon, Search as SearchIcon } from "@mui/icons-material";
import { CreatePerson } from "./CreatePerson";
import { AppIconButton } from "./ui/AppIconButton";

interface Props {
  addFunction: (person: PersonInterface) => void;
  person?: PersonInterface;
  /** Kept for callers; avatars now come from PersonAvatar (initials fallback). */
  getPhotoUrl?: (person: PersonInterface) => string;
  searchClicked?: () => void;
  filterList?: string[];
  includeEmail?: boolean;
  actionLabel?: string;
  showCreatePersonOnNotFound?: boolean;
  onCreate?: (person: PersonInterface) => void;
  inputRef?: React.RefObject<HTMLInputElement>;
  autoSearch?: boolean;
}

const RECENT_LIMIT = 8;

export const PersonAdd: React.FC<Props> = ({ addFunction, searchClicked, filterList = [], includeEmail = false, actionLabel, showCreatePersonOnNotFound = false, onCreate, inputRef, autoSearch = false }) => {
  const [searchResults, setSearchResults] = useState<PersonInterface[]>([]);
  const [searchText, setSearchText] = useState("");
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [open, setOpen] = useState<boolean>(false);

  const loadRecent = () => {
    ApiHelper.get("/people/recent", "MembershipApi").then((data: PersonInterface[]) => {
      const filteredResult = data.filter((s) => !filterList.includes(s.id || ""));
      setSearchResults(filteredResult);
    });
  };

  const filterListString = filterList.join(",");
  const latestTermRef = React.useRef("");

  React.useEffect(() => {
    if (!searchText.trim()) {
      loadRecent();
      setHasSearched(false);
    }
  }, [searchText, filterListString]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setHasSearched(false);
    const value = e.currentTarget.value;
    setSearchText(value);
    latestTermRef.current = value.trim();
    if (autoSearch && value.trim().length >= 2) {
      const term = value.trim();
      ApiHelper.post("/people/search", { term: term }, "MembershipApi").then((data: PersonInterface[]) => {
        if (term !== latestTermRef.current) return;
        setHasSearched(true);
        const filteredResult = data.filter((s) => !filterList.includes(s.id || ""));
        setSearchResults(filteredResult);
        if (searchClicked) searchClicked();
      });
    } else if (autoSearch && value.trim().length < 2) {
      setSearchResults([]);
      setHasSearched(false);
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (autoSearch && searchResults.length > 0) {
        handleAdd(searchResults[0]);
      } else {
        handleSearch(null);
      }
    }
  };

  const handleSearch = (e: React.MouseEvent | null) => {
    if (e !== null) e.preventDefault();
    const term = searchText.trim();
    ApiHelper.post("/people/search", { term: term }, "MembershipApi").then((data: PersonInterface[]) => {
      setHasSearched(true);
      const filteredResult = data.filter((s) => !filterList.includes(s.id || ""));
      setSearchResults(filteredResult);
      if (searchClicked) {
        searchClicked();
      }
    });
  };
  const handleAdd = (person: PersonInterface) => {
    const sr: PersonInterface[] = [...searchResults];
    const idx = sr.indexOf(person);
    sr.splice(idx, 1);
    setSearchResults(sr);
    addFunction(person);
  };

  // Recents are a shortcut, not a directory: show a handful until the user searches.
  const shown = searchText.trim() ? searchResults : searchResults.slice(0, RECENT_LIMIT);
  const rows = [];
  for (let i = 0; i < shown.length; i++) {
    const sr = shown[i];

    rows.push(
      <TableRow key={sr.id}>
        <TableCell sx={{ width: 48, pr: 0 }}>
          <PersonAvatar person={sr} size="small" sx={{ width: 32, height: 32, fontSize: 13 }} />
        </TableCell>
        <TableCell>
          <Link component="button" type="button" underline="hover" onClick={() => handleAdd(sr)} sx={{ fontWeight: 600, textAlign: "left" }}>
            {sr.name.display}
          </Link>
          {includeEmail && sr.contactInfo?.email && <Typography variant="body2" color="text.secondary">{sr.contactInfo.email}</Typography>}
        </TableCell>
        <TableCell align="right" sx={{ width: 48 }}>
          <AppIconButton intent="add" label={actionLabel || Locale.label("common.add")} icon={<PersonAddIcon />} onClick={() => handleAdd(sr)} data-testid={`add-person-button-${sr.id || "new"}`} />
        </TableCell>
      </TableRow>
    );
  }

  return (
    <>
      <TextField
        fullWidth
        name="personAddText"
        label={Locale.label("person.person")}
        value={searchText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        data-testid="person-search-input"
        inputRef={inputRef}
        sx={{ "& .MuiOutlinedInput-root": { bgcolor: "background.default", borderRadius: "12px", "&.Mui-focused": { bgcolor: "background.paper" } } }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "text.secondary" }} /></InputAdornment>,
          endAdornment: autoSearch ? undefined : (
            <AppIconButton label={Locale.label("common.search")} icon={<SearchIcon />} id="searchButton" data-testid="search-button" onClick={handleSearch} />
          )
        }}
      />
      {showCreatePersonOnNotFound && hasSearched && searchText && searchResults.length === 0 && (
        <Typography sx={{ marginTop: "7px" }}>
          {Locale.label("person.noRec")}{" "}
          <button type="button" onClick={() => setOpen(true)} style={{ background: "none", border: 0, padding: 0, color: "var(--link)", cursor: "pointer" }}>
            {Locale.label("createPerson.addNewPerson")}
          </button>
        </Typography>
      )}
      {!searchText.trim() && shown.length > 0 && <Typography variant="body2" color="text.secondary" sx={{ mt: 2, mb: 0.5 }}>{Locale.label("person.recentPeople", "Recent people")}</Typography>}
      <Table size="small" id="householdMemberAddTable">
        <TableBody>{rows}</TableBody>
      </Table>
      {open && (
        <CreatePerson
          showInModal
          onClose={() => {
            setOpen(false);
          }}
          onCreate={(person) => {
            setSearchText("");
            if (onCreate) {
              setSearchResults([]);
              onCreate(person);
            } else setSearchResults([person]);
          }}
        />
      )}
    </>
  );
};
