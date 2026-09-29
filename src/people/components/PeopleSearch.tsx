import React, { useEffect, useCallback, useRef } from "react";
import { B1AdminPersonHelper } from ".";
import { type SearchCondition, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Box, InputBase, Link, Stack, Typography } from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import { AdvancedPeopleSearch, type ActiveFilter } from "./AdvancedPeopleSearch";
import { AISearch } from "./AISearch";

interface Props {
  updateSearchResults: (people: PersonInterface[]) => void;
  updatedFunction?: () => void;
  resetSearchResults?: () => void;
  onClear?: () => void;
  // Seeds the advanced search from a saved List and auto-expands the panel.
  initialFilters?: Record<string, ActiveFilter>;
  // Reports the criteria behind the current results so the parent can offer "Save as List":
  // the advanced filter spec (object) or a simple-search condition (array), null when cleared.
  onReportCriteria?: (criteria: Record<string, ActiveFilter> | SearchCondition[] | null) => void;
}

type Panel = "none" | "ask" | "advanced";

export function PeopleSearch(props: Props) {
  const [searchText, setSearchText] = React.useState("");
  const [panel, setPanel] = React.useState<Panel>("none");
  const debounceTimerRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (props.initialFilters && Object.keys(props.initialFilters).length > 0) setPanel("advanced");
  }, [props.initialFilters]);

  const performSearch = useCallback((term: string) => {
    if (term.trim()) {
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

  const handleChange = (value: string) => {
    setSearchText(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => performSearch(value), 500);
  };

  const handleClear = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    setSearchText("");
    setPanel("none");
    props.onReportCriteria?.(null);
    if (props.onClear) props.onClear();
    else props.resetSearchResults?.();
  };

  const togglePanel = (p: Panel) => setPanel((current) => (current === p ? "none" : p));

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  }, []);

  const modeLink = (p: Panel, label: string) => (
    <Link component="button" type="button" variant="body2" underline="hover" onClick={() => togglePanel(p)} aria-expanded={panel === p} aria-controls={`peopleSearch-${p}`} sx={{ fontWeight: panel === p ? 700 : 600 }}>
      {label}
    </Link>
  );

  const dot = <Typography component="span" variant="body2" color="text.secondary" aria-hidden>·</Typography>;

  return (
    <Box id="peopleSearch">
      <Box component="label" htmlFor="searchText" sx={{ display: "flex", alignItems: "center", gap: 1.5, borderBottom: 1, borderColor: "var(--b1-control-border)", pb: 0.5, transition: "border-color 140ms", "&:focus-within": { borderColor: "primary.main", boxShadow: (theme) => `0 1px 0 ${theme.palette.primary.main}` } }}>
        <SearchIcon sx={{ color: "text.secondary" }} aria-hidden />
        <Box component="span" sx={{ position: "absolute", width: "1px", height: "1px", overflow: "hidden", clip: "rect(0 0 0 0)", whiteSpace: "nowrap" }}>
          {Locale.label("people.directory.searchLabel")}
        </Box>
        <InputBase
          fullWidth
          value={searchText}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={Locale.label("people.directory.searchLabel")}
          sx={{ typography: "h2", fontWeight: 400, py: 0.5 }}
          inputProps={{ id: "searchText", name: "searchText", type: "search", autoComplete: "off", "data-testid": "people-search-input" }}
        />
      </Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
        {modeLink("ask", Locale.label("people.directory.ask"))}
        {dot}
        {modeLink("advanced", Locale.label("people.peopleSearch.adv"))}
        {dot}
        <Link component="button" type="button" variant="body2" underline="hover" onClick={handleClear} sx={{ fontWeight: 600 }} data-testid="people-search-clear">
          {Locale.label("people.directory.clear")}
        </Link>
      </Stack>

      {panel === "ask" && (
        <Box id="peopleSearch-ask" sx={{ mt: 2 }}>
          <AISearch updateSearchResults={props.updateSearchResults} onReportCriteria={props.onReportCriteria} resetSearchResults={props.resetSearchResults} />
        </Box>
      )}
      {panel === "advanced" && (
        <Box id="peopleSearch-advanced" sx={{ mt: 2, maxWidth: 880 }}>
          <AdvancedPeopleSearch
            updateSearchResults={props.updateSearchResults}
            toggleFunction={() => setPanel("none")}
            updatedFunction={props.updatedFunction}
            resetSearchResults={props.resetSearchResults}
            embedded={true}
            initialFilters={props.initialFilters}
            onReportCriteria={props.onReportCriteria}
          />
        </Box>
      )}
    </Box>
  );
}
