import React, { useEffect, useCallback, useRef } from "react";
import { B1AdminPersonHelper } from ".";
import { type SearchCondition, type PersonInterface } from "@churchapps/helpers";
import { InputBox, ApiHelper, Locale } from "@churchapps/apphelper";
import { TextField, Box, Typography, Stack } from "@mui/material";
import { AdvancedPeopleSearch, type ActiveFilter } from "./AdvancedPeopleSearch";
import { Search as SearchIcon } from "@mui/icons-material";

interface Props {
  updateSearchResults: (people: PersonInterface[]) => void;
  updatedFunction?: () => void;
  resetSearchResults?: () => void;
  // Seeds the advanced search from a saved List and auto-expands the panel.
  initialFilters?: Record<string, ActiveFilter>;
  // Reports the criteria behind the current results so the parent can offer "Save as List":
  // the advanced filter spec (object) or a simple-search condition (array), null when cleared.
  onReportCriteria?: (criteria: Record<string, ActiveFilter> | SearchCondition[] | null) => void;
}

export function PeopleSearch(props: Props) {
  const [searchText, setSearchText] = React.useState("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>(undefined);

  // When a saved list is loaded, reveal the advanced panel so it can seed + run.
  useEffect(() => {
    if (props.initialFilters && Object.keys(props.initialFilters).length > 0) setShowAdvanced(true);
  }, [props.initialFilters]);

  const performSearch = useCallback((term: string, advancedConditions?: SearchCondition[]) => {
    if (advancedConditions && advancedConditions.length > 0) {
      // Advanced search with conditions
      ApiHelper.post("/people/advancedSearch", advancedConditions, "MembershipApi").then((data: any) => {
        props.updateSearchResults(data.map((d: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(d)));
      });
    } else if (term.trim()) {
      // Simple search by name
      const conditions: SearchCondition[] = [{ field: "displayName", operator: "contains", value: term.trim() }];
      props.onReportCriteria?.(conditions);
      ApiHelper.post("/people/advancedSearch", conditions, "MembershipApi").then((data: any) => {
        props.updateSearchResults(data.map((d: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(d)));
      });
    } else {
      props.onReportCriteria?.(null);
      props.resetSearchResults?.();
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
            {Locale.label("people.peopleSearch.typeToSearch")}
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
            initialFilters={props.initialFilters}
            onReportCriteria={props.onReportCriteria}
          />
        )}
      </Stack>
    </InputBox>
  );
}
