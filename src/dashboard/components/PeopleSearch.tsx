import React from "react";
import { Button, FormControl, InputLabel, OutlinedInput, Typography, Box, Stack } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { B1AdminPersonHelper } from "../../helpers";
import { ApiHelper, Locale, Loading } from "@churchapps/apphelper";
import type { PersonInterface, SearchCondition } from "@churchapps/helpers";
import { PeopleSearchResults } from "../../people/components";
import { SectionHeading } from "../../components/ui/SectionHeading";
import { useQuery } from "@tanstack/react-query";

const SELECTED_COLUMNS = ["photo", "displayName"];

export const PeopleSearch = () => {
  const [searchText, setSearchText] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState<string | null>(null);
  const columns = [
    { key: "photo", label: Locale.label("dashboard.peopleSearch.photo"), shortName: "" },
    { key: "displayName", label: Locale.label("dashboard.peopleSearch.display"), shortName: Locale.label("common.name") }
  ];

  const searchResults = useQuery<PersonInterface[]>({
    queryKey: ["/people/advancedSearch", "MembershipApi", searchTerm],
    enabled: !!searchTerm,
    placeholderData: [],
    queryFn: async () => {
      if (!searchTerm) return [];
      const condition: SearchCondition = { field: "displayName", operator: "contains", value: searchTerm };
      const data: PersonInterface[] = await ApiHelper.post("/people/advancedSearch", [condition], "MembershipApi");
      return data.map((d: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(d));
    }
  });

  const handleSubmit = () => {
    const term = searchText.trim();
    if (!term) return;
    setSearchTerm(term);
  };

  const hasResults = searchResults.data && searchResults.data.length > 0;
  const hasNoResults = searchResults.data && searchResults.data.length === 0 && searchTerm && !searchResults.isLoading;

  return (
    <Box>
      <SectionHeading title={Locale.label("dashboard.peopleSearch.ppl")} />
      <FormControl fullWidth variant="outlined" margin="none">
        <InputLabel htmlFor="searchText">{Locale.label("common.name")}</InputLabel>
        <OutlinedInput
          id="searchText"
          aria-label={Locale.label("dashboard.peopleSearch.ariaSearchBox")}
          name="searchText"
          type="text"
          label={Locale.label("common.name")}
          value={searchText}
          onChange={(e) => setSearchText(e.currentTarget.value)}
          onKeyPress={(e) => { if (e.key === "Enter") handleSubmit(); }}
          data-testid="dashboard-people-search-input"
          endAdornment={
            <Button
              variant="contained"
              onClick={handleSubmit}
              data-testid="dashboard-search-button"
              aria-label={Locale.label("dashboard.peopleSearch.ariaSearch")}
              disabled={searchResults.isLoading || !searchText.trim()}
              startIcon={<SearchIcon />}
              sx={{ ml: 1, fontWeight: 600 }}
            >
              {searchResults.isLoading ? Locale.label("common.searching") || "Searching..." : Locale.label("common.search")}
            </Button>
          }
        />
      </FormControl>

      {searchResults.isLoading && searchTerm && (
        <Box sx={{ mt: 2 }}><Loading /></Box>
      )}

      {hasResults && (
        <Box sx={{ mt: 2 }}>
          <PeopleSearchResults people={searchResults.data} columns={columns} selectedColumns={SELECTED_COLUMNS} />
        </Box>
      )}

      {hasNoResults && (
        <Box sx={{ textAlign: "center", py: 3, color: "text.secondary" }}>
          <Typography variant="body2">{Locale.label("dashboard.peopleSearch.noResults")}</Typography>
        </Box>
      )}
    </Box>
  );
};
