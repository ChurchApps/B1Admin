import React, { useEffect, useCallback, useRef } from "react";
import { B1AdminPersonHelper } from ".";
import { type SearchCondition, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, Locale } from "@churchapps/apphelper";
import { AdvancedPeopleSearch, type ActiveFilter } from "./AdvancedPeopleSearch";

interface Props {
  updateSearchResults: (people: PersonInterface[]) => void;
  updatedFunction?: () => void;
  resetSearchResults?: () => void;
  initialFilters?: Record<string, ActiveFilter>;
  onReportCriteria?: (criteria: Record<string, ActiveFilter> | SearchCondition[] | null) => void;
  onTermChange?: (term: string) => void;
}

export function PeopleSearch(props: Props) {
  const [searchText, setSearchText] = React.useState("");
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (props.initialFilters && Object.keys(props.initialFilters).length > 0) setShowAdvanced(true);
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setSearchText(value);
    props.onTermChange?.(value);

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => performSearch(value), 500);
  };

  const toggleAdvanced = () => setShowAdvanced(!showAdvanced);

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  }, []);

  return (
    <div id="peopleSearch">
      <input
        id="q"
        name="searchText"
        type="text"
        placeholder="Find a household or a person"
        value={searchText}
        onChange={handleChange}
        data-testid="people-search-input"
        autoComplete="off"
        aria-label="Find"
      />
      <p className="adv-toggle" onClick={toggleAdvanced}>
        {showAdvanced ? "▼" : "▶"} {Locale.label("people.peopleSearch.adv")}
      </p>
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
    </div>
  );
}
