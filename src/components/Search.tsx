import React from "react";
import { type PersonInterface } from "@churchapps/helpers";
import { Locale, PersonAvatar } from "@churchapps/apphelper";
import { Table, TableBody, TableRow, TableCell, Icon, TextField, Button, Box } from "@mui/material";

interface Props {
  handleSearch: (text: string) => void;
  searchResults: PersonInterface[];
  buttonText: string;
  handleClickAction: (id: string) => void;
}

export const Search: React.FC<Props> = (props) => {
  const [searchText, setSearchText] = React.useState<string>("");
  const [rows, setRows] = React.useState(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchText(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      props.handleSearch(searchText);
    }
  };

  const createRows = () => {
    const tableRows = props.searchResults?.map((person) => (
      <TableRow key={person.id}>
        <TableCell style={{ paddingLeft: 0 }}>
          <PersonAvatar person={person} size="small" />
        </TableCell>
        <TableCell>{person?.name?.display}</TableCell>
        <TableCell style={{ paddingRight: 0 }}>
          <button
            type="button"
            className="no-default-style"
            onClick={() => {
              props.handleClickAction(person.id);
            }}
            data-testid="select-person-button"
            aria-label="Select person">
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Icon sx={{ marginRight: "5px" }}>person</Icon>
              {props.buttonText}
            </Box>
          </button>
        </TableCell>
      </TableRow>
    ));

    setRows(tableRows);
  };

  React.useEffect(createRows, [props.searchResults, props.buttonText]);

  return (
    <>
      <TextField
        fullWidth
        name="personAddText"
        label={Locale.label("common.person")}
        value={searchText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        data-testid="person-search-input"
        aria-label="Search for person"
        InputProps={{
          endAdornment: (
            <Button variant="contained" id="searchButton" data-cy="search-button" onClick={() => props.handleSearch(searchText)} data-testid="search-button" aria-label="Search">
              {Locale.label("common.search")}
            </Button>
          )
        }}
      />
      <Table size="small" id="searchResults">
        <TableBody>{rows}</TableBody>
      </Table>
    </>
  );
};
