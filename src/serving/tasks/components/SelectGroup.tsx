import React, { useState } from "react";
import { ApiHelper, type GroupInterface, Locale } from "@churchapps/apphelper";
import { TextField, Button, Table, TableBody, TableRow, TableCell, InputAdornment, Paper, Typography, Stack, IconButton, TableContainer } from "@mui/material";
import { Search as SearchIcon, Group as GroupIcon, Check as CheckIcon } from "@mui/icons-material";

interface Props {
  addFunction: (group: GroupInterface) => void;
}

export const SelectGroup: React.FC<Props> = (props: Props) => {
  const [groups, setGroups] = useState<GroupInterface[]>([]);
  const [searchResults, setSearchResults] = useState<GroupInterface[]>([]);
  const [searchText, setSearchText] = useState("");

  const loadData = () => {
    ApiHelper.get("/groups", "MembershipApi").then((data) => {
      setGroups(data);
    });
  };
  React.useEffect(loadData, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setSearchText(e.currentTarget.value);
  };
  const handleKeyDown = (e: React.KeyboardEvent<any>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch(null);
    }
  };

  const handleSearch = (e: React.MouseEvent) => {
    if (e !== null) e.preventDefault();
    const term = searchText.trim().toLowerCase();
    const result: GroupInterface[] = [];
    groups.forEach((g) => {
      if (g.name.toLowerCase().indexOf(term) > -1) result.push(g);
    });
    setSearchResults(result);
  };
  const handleAdd = (group: GroupInterface) => {
    props.addFunction(group);
  };

  const rows = [];
  for (let i = 0; i < searchResults.length; i++) {
    const sr = searchResults[i];

    rows.push(
      <TableRow
        key={sr.id}
        sx={{
          "&:hover": {
            backgroundColor: "action.hover",
            cursor: "pointer"
          },
          "&:last-child td": { border: 0 }
        }}
        onClick={() => handleAdd(sr)}>
        <TableCell>
          <Stack direction="row" alignItems="center" spacing={1}>
            <GroupIcon sx={{ color: "text.secondary", fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {sr.name}
            </Typography>
          </Stack>
        </TableCell>
        <TableCell align="right">
          <IconButton
            size="small"
            color="primary"
            onClick={(e) => {
              e.stopPropagation();
              handleAdd(sr);
            }}
            data-testid={`select-group-button-${sr.id}`}
            aria-label="Select group">
            <CheckIcon />
          </IconButton>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <Stack spacing={2}>
      <TextField
        fullWidth
        name="groupSearchText"
        label={Locale.label("tasks.selectGroup.group")}
        value={searchText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        variant="outlined"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <Button
                variant="contained"
                id="searchButton"
                data-cy="search-button"
                onClick={handleSearch}
                startIcon={<SearchIcon />}
                sx={{
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600
                }}>
                {Locale.label("common.search")}
              </Button>
            </InputAdornment>
          )
        }}
        sx={{ "& .MuiOutlinedInput-root": { "&:hover fieldset": { borderColor: "primary.main" } } }}
      />

      {searchResults.length > 0 ? (
        <TableContainer
          component={Paper}
          sx={{
            maxHeight: 300,
            border: "1px solid",
            borderColor: "grey.200"
          }}>
          <Table size="small" stickyHeader>
            <TableBody>{rows}</TableBody>
          </Table>
        </TableContainer>
      ) : (
        searchText && (
          <Paper
            sx={{
              p: 3,
              textAlign: "center",
              backgroundColor: "grey.50",
              border: "1px dashed",
              borderColor: "grey.300"
            }}>
            <GroupIcon sx={{ fontSize: 48, color: "grey.400", mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              {searchResults.length === 0 && searchText ? Locale.label("tasks.selectGroup.noResults") : Locale.label("tasks.selectGroup.searchPrompt")}
            </Typography>
          </Paper>
        )
      )}
    </Stack>
  );
};
