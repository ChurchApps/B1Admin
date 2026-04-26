import React from "react";
import { type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, DisplayBox, ErrorMessages, Locale } from "@churchapps/apphelper";
import { Button, TextField, Typography } from "@mui/material";
import { B1AdminPersonHelper } from "../../helpers";

interface Props {
  updateSearchResults: (people: PersonInterface[]) => void;
}

export const AISearch = (props: Props) => {
  const [text, setText] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState<boolean>(false);
  const [errors, setErrors] = React.useState<string[]>([]);

  const handleSearch = async (e: any) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // First, get the filters from AskApi
      const filters = await ApiHelper.post("/query/people", { query: text }, "AskApi");

      // Then use those filters to search for people
      const response = await ApiHelper.post("/people/advancedSearch", filters, "MembershipApi");

      props.updateSearchResults(response?.map((p: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(p)));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrors([message]);
    } finally {
      setIsLoading(false);
      setText("");
    }
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
        Examples:
        <br />
        - Show me men over 30 with birthdays in July.
        <br />- Show me women who are married.
      </Typography>
      <Button fullWidth variant="contained" onClick={handleSearch} disabled={isLoading || !text || text === ""}>
        {isLoading ? "Searching..." : "Search"}
      </Button>
    </DisplayBox>
  );
};
