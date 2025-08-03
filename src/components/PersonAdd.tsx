"use client";

import React, { useState } from "react";
import { ApiHelper, Locale } from "../helpers";
import { PersonInterface } from "@churchapps/helpers";
import { TextField, Button, Table, TableBody, TableRow, TableCell, Typography } from "@mui/material";
import { SmallButton } from "@churchapps/apphelper";
import { CreatePerson } from "./CreatePerson";

interface Props {
	addFunction: (person: PersonInterface) => void;
	person?: PersonInterface;
	getPhotoUrl: (person: PersonInterface) => string;
	searchClicked?: () => void;
	filterList?: string[];
	includeEmail?: boolean;
	actionLabel?: string;
	showCreatePersonOnNotFound?: boolean;
	onCreate?: (person: PersonInterface) => void;

}

export const PersonAdd: React.FC<Props> = ({
 addFunction, getPhotoUrl, searchClicked, filterList = [], includeEmail = false, actionLabel, showCreatePersonOnNotFound = false, onCreate 
}) => {
	const [searchResults, setSearchResults] = useState<PersonInterface[]>([]);
	const [searchText, setSearchText] = useState("");
	const [hasSearched, setHasSearched] = useState<boolean>(false);
	const [open, setOpen] = useState<boolean>(false);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => { e.preventDefault(); setHasSearched(false); setSearchText(e.currentTarget.value); };
	const handleKeyDown = (e: React.KeyboardEvent<any>) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(null); } };

	const handleSearch = (e: React.MouseEvent) => {
		if (e !== null) e.preventDefault();
		const term = searchText.trim();
		ApiHelper.post("/people/search", { term: term }, "MembershipApi")
			.then((data: PersonInterface[]) => {
				setHasSearched(true);
				const filteredResult = data.filter(s => !filterList.includes(s.id));
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

	//<button className="text-success no-default-style" aria-label="addPerson" data-index={i} onClick={handleAdd}><Icon>person</Icon> Add</button>
	const rows = [];
	for (let i = 0; i < searchResults.length; i++) {
		const sr = searchResults[i];

		rows.push(<TableRow key={sr.id}>
				<TableCell><img src={getPhotoUrl(sr)} alt="avatar" /></TableCell>
				<TableCell>{sr.name.display}{includeEmail && (<><br /><i style={{ color: "#999" }}>{sr.contactInfo.email}</i></>)}</TableCell>
				<TableCell>
					<SmallButton color="success" icon="person" text={actionLabel || "Add"} ariaLabel="addPerson" onClick={() => handleAdd(sr)} data-testid={`add-person-${sr.id}`} />
				</TableCell>
			</TableRow>);
	}

	return (
		<>
			<TextField fullWidth name="personAddText" label={Locale.label("person.person")} value={searchText} onChange={handleChange} onKeyDown={handleKeyDown} data-testid="person-search-input"
				InputProps={{ endAdornment: <Button variant="contained" id="searchButton" data-testid="search-button" onClick={handleSearch}>{Locale.label("common.search")}</Button> }}
			/>
			{showCreatePersonOnNotFound && hasSearched && searchText && searchResults.length === 0 && (
				<Typography sx={{ marginTop: "7px" }}>{Locale.label("person.noRec")} <a href="about:blank" onClick={(e) => { e.preventDefault(); setOpen(true); }}>{Locale.label("createPerson.addNewPerson")}</a></Typography>
			)}
			<Table size="small" id="householdMemberAddTable"><TableBody>{rows}</TableBody></Table>
			{open && <CreatePerson showInModal onClose={() => { setOpen(false); }} onCreate={person => { setSearchText(""); setSearchResults([person]); if (onCreate) onCreate(person); }} />}
		</>
	);
};
