import React from "react";
import { Button, FormControl, InputLabel, OutlinedInput, Card, CardContent, Typography, Box, Stack } from "@mui/material";
import { Person as PersonIcon, Search as SearchIcon } from "@mui/icons-material";
import { B1AdminPersonHelper } from "../../helpers";
import { ApiHelper, Locale, Loading } from "@churchapps/apphelper";
import type { PersonInterface, SearchCondition } from "@churchapps/helpers";
import { PeopleSearchResults } from "../../people/components";
import { useQuery } from "@tanstack/react-query";

export const PeopleSearch = () => {
  const [searchText, setSearchText] = React.useState("");
  const [searchTerm, setSearchTerm] = React.useState<string | null>(null);
  const selectedColumns = ["photo", "displayName"];

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.currentTarget.value);

  const handleSubmit = (e: React.MouseEvent) => {
    if (e !== null) e.preventDefault();
    const term = searchText.trim();
    if (!term) return;
    setSearchTerm(term);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(e as any);
    }
  };

  const columns = [
    { key: "photo", label: Locale.label("dashboard.peopleSearch.photo"), shortName: "" },
    { key: "displayName", label: Locale.label("dashboard.peopleSearch.display"), shortName: Locale.label("common.name") }
  ];

  return (
    <Card
      elevation={2}
      sx={{
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider"
      }}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <PersonIcon
            sx={{
              color: "primary.main",
              fontSize: 24
            }}
          />
          <Typography
            variant="h6"
            component="h2"
            sx={{
              fontWeight: 600,
              color: "text.primary"
            }}>
            {Locale.label("dashboard.peopleSearch.ppl")}
          </Typography>
        </Stack>

        {/* Search Form */}
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth variant="outlined">
            <InputLabel htmlFor="searchText">{Locale.label("common.name")}</InputLabel>
            <OutlinedInput
              id="searchText"
              aria-label="searchBox"
              name="searchText"
              type="text"
              label={Locale.label("common.name")}
              value={searchText}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              data-testid="dashboard-people-search-input"
              endAdornment={
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  data-testid="dashboard-search-button"
                  aria-label="Search people"
                  disabled={searchResults.isLoading || !searchText.trim()}
                  startIcon={<SearchIcon />}
                  sx={{
                    ml: 1,
                    transition: "all 0.2s ease-in-out",
                    "&:hover": {
                      transform: "translateY(-1px)",
                      boxShadow: 2
                    }
                  }}>
                  {searchResults.isLoading ? Locale.label("common.searching") || "Searching..." : Locale.label("common.search")}
                </Button>
              }
            />
          </FormControl>
        </Box>

        {/* Search Results */}
        {searchResults.isLoading && searchTerm && (
          <Box sx={{ mt: 2 }}>
            <Loading />
          </Box>
        )}

        {searchResults.data && searchResults.data.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <PeopleSearchResults people={searchResults.data} columns={columns} selectedColumns={selectedColumns} />
          </Box>
        )}

        {searchResults.data && searchResults.data.length === 0 && searchTerm && !searchResults.isLoading && (
          <Box
            sx={{
              textAlign: "center",
              py: 3,
              color: "text.secondary"
            }}>
            <Typography variant="body2">No people found matching your search criteria.</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
