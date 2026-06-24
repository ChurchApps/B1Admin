import React from "react";
import { type SearchCondition, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, DisplayBox, ErrorMessages, Locale } from "@churchapps/apphelper";
import { Button, Stack, TextField, Typography } from "@mui/material";
import { B1AdminPersonHelper } from "../../helpers";

interface Props {
  updateSearchResults: (people: PersonInterface[]) => void;
  // Reports the AI-generated conditions so the parent can offer "Save as List".
  onReportCriteria?: (criteria: SearchCondition[] | null) => void;
  resetSearchResults?: () => void;
}

export const AISearch = (props: Props) => {
  const [text, setText] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [isSearched, setIsSearched] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<string[]>([]);

  const handleSearch = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // First, get the filters from AskApi
      const filters: SearchCondition[] = await ApiHelper.post("/query/people", { query: text }, "AskApi");

      // Then use those filters to search for people
      const response = await ApiHelper.post("/people/advancedSearch", filters, "MembershipApi");

      props.updateSearchResults(response?.map((p: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(p)));
      if (filters?.length) props.onReportCriteria?.(filters);
      setIsSearched(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrors([message]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setText("");
    setIsSearched(false);
    setErrors([]);
    props.onReportCriteria?.(null);
    props.resetSearchResults?.();
  };

  return (
    <DisplayBox headerText={Locale.label("people.aiSearch.title")} headerIcon="person_search">
      <ErrorMessages errors={errors} />
      <TextField
        fullWidth
        multiline
        minRows={4}
        maxRows={6}
        placeholder={Locale.label("people.aiSearch.placeholder")}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
        }}
      />
      <Typography sx={{ fontSize: "12px", fontStyle: "italic", my: 1 }}>
        {Locale.label("people.aiSearch.examples")}
        <br />
        {Locale.label("people.aiSearch.exampleMen")}
        <br />{Locale.label("people.aiSearch.exampleWomen")}
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <Button fullWidth variant="contained" onClick={handleSearch} disabled={isLoading || !text || text === ""} sx={{ flex: 1 }}>
          {isLoading ? Locale.label("people.aiSearch.searching") : Locale.label("people.aiSearch.search")}
        </Button>
        {(text || isSearched) && (
          <Button fullWidth variant="outlined" onClick={handleClear} disabled={isLoading} sx={{ flex: 1 }} data-testid="ai-search-clear">
            {Locale.label("people.aiSearch.clearSearch", "Clear Search")}
          </Button>
        )}
      </Stack>
    </DisplayBox>
  );
};
