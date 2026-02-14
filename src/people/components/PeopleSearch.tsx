import React, { useEffect, useCallback, useRef } from "react";
import { B1AdminPersonHelper } from ".";
import { type SearchCondition, type PersonInterface } from "@churchapps/helpers";
import { InputBox, ApiHelper, Locale } from "@churchapps/apphelper";
import { TextField, Box, Typography, Stack } from "@mui/material";
import { AdvancedPeopleSearch } from "./AdvancedPeopleSearch";
import { Search as SearchIcon } from "@mui/icons-material";

interface Props {
  updateSearchResults: (people: PersonInterface[]) => void;
  updatedFunction?: () => void;
}

export function PeopleSearch(props: Props) {
  const [searchText, setSearchText] = React.useState("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>();

  const performSearch = useCallback((term: string, advancedConditions?: SearchCondition[]) => {
    if (advancedConditions && advancedConditions.length > 0) {
      // Advanced search with conditions
      ApiHelper.post("/people/advancedSearch", advancedConditions, "MembershipApi").then((data) => {
        props.updateSearchResults(data.map((d: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(d)));
      });
    } else if (term.trim()) {
      // Simple search by name
      const condition: SearchCondition = { field: "displayName", operator: "contains", value: term.trim() };
      ApiHelper.post("/people/advancedSearch", [condition], "MembershipApi").then((data) => {
        props.updateSearchResults(data.map((d: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(d)));
      });
    }
  }, [props]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setSearchText(value);

    // Debounce the search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(value);
    }, 500); // 500ms debounce
  };

  const toggleAdvanced = () => {
    setShowAdvanced(!showAdvanced);
  };

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return (
    <InputBox
      id="peopleSearch"
      headerIcon="person"
      headerText={Locale.label("people.peopleSearch.simpSearch")}
      help="docs/b1-admin/people/searching-people"
    >
      <Stack spacing={2}>
        {/* Quick Search */}
        <Box>
          <TextField
            fullWidth
            id="searchText"
            name="searchText"
            type="text"
            placeholder={Locale.label("people.peopleSearch.placeholder")}
            value={searchText}
            onChange={handleChange}
            data-testid="people-search-input"
            variant="outlined"
            size="small"
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: "text.secondary" }} /> }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: "block" }}>
            Type to search instantly
          </Typography>
        </Box>

        {/* Advanced Filters Toggle */}
        <Box>
          <Typography
            variant="body2"
            onClick={toggleAdvanced}
            sx={{
              color: "primary.main",
              cursor: "pointer",
              fontWeight: 500,
              display: "inline-flex",
              alignItems: "center",
              "&:hover": { textDecoration: "underline" }
            }}
          >
            {showAdvanced ? "▼" : "▶"} {Locale.label("people.peopleSearch.adv")}
          </Typography>
        </Box>

        {/* Advanced Search Section */}
        {showAdvanced && (
          <AdvancedPeopleSearch
            updateSearchResults={props.updateSearchResults}
            toggleFunction={toggleAdvanced}
            updatedFunction={props.updatedFunction}
            embedded={true}
          />
        )}
      </Stack>
    </InputBox>
  );
}
