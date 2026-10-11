import React, { useEffect, useCallback, useRef } from "react";
import { B1AdminPersonHelper } from ".";
import { type SearchCondition, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { Box, Link, Stack, Typography } from "@mui/material";
import { AutoAwesomeOutlined as AskIcon, TuneOutlined as AdvancedIcon } from "@mui/icons-material";
import { SearchField } from "../../components/ui";
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

  const modeLink = (p: Panel, label: string, icon: React.ReactNode) => (
    <Link component="button" type="button" variant="body2" underline="hover" onClick={() => togglePanel(p)} aria-expanded={panel === p} aria-controls={`peopleSearch-${p}`} sx={{ fontWeight: panel === p ? 700 : 600, display: "inline-flex", alignItems: "center", gap: 0.5, "& .MuiSvgIcon-root": { fontSize: 18 } }}>
      {icon}
      {label}
    </Link>
  );

  const dot = <Typography component="span" variant="body2" color="text.secondary" aria-hidden>·</Typography>;

  return (
    <Box id="peopleSearch">
      <SearchField id="searchText" value={searchText} onChange={handleChange} label={Locale.label("people.directory.searchLabel")} data-testid="people-search-input" />
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
        {modeLink("ask", Locale.label("people.directory.ask"), <AskIcon aria-hidden />)}
        {dot}
        {modeLink("advanced", Locale.label("people.peopleSearch.adv"), <AdvancedIcon aria-hidden />)}
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
