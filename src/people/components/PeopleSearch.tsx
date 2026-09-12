import React, { useEffect, useCallback, useRef } from "react";
import { B1AdminPersonHelper } from ".";
import { type SearchCondition, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
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
  const [ask, setAsk] = React.useState(false);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [asking, setAsking] = React.useState(false);
  const [asked, setAsked] = React.useState(false);
  const [errors, setErrors] = React.useState<string[]>([]);
  const debounceTimerRef = useRef<NodeJS.Timeout>(undefined);

  useEffect(() => {
    if (props.initialFilters && Object.keys(props.initialFilters).length > 0) setShowAdvanced(true);
  }, [props.initialFilters]);

  const performFind = useCallback((term: string) => {
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

  const performAsk = useCallback(async () => {
    const query = searchText.trim();
    if (!query || asking) return;
    setAsking(true);
    setErrors([]);
    try {
      const filters: SearchCondition[] = await ApiHelper.post("/query/people", { query }, "AskApi");
      const response = await ApiHelper.post("/people/advancedSearch", filters, "MembershipApi");
      props.updateSearchResults(response?.map((p: PersonInterface) => B1AdminPersonHelper.getExpandedPersonObject(p)));
      if (filters?.length) props.onReportCriteria?.(filters);
      setAsked(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrors([message]);
    } finally {
      setAsking(false);
    }
  }, [asking, searchText, props]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    setSearchText(value);
    if (!ask) props.onTermChange?.(value);
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (ask) return;
    debounceTimerRef.current = setTimeout(() => performFind(value), 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (ask && e.key === "Enter") {
      e.preventDefault();
      performAsk();
    }
  };

  const switchAsk = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    if (ask) {
      setAsk(false);
      setAsked(false);
      setErrors([]);
      props.onTermChange?.(searchText);
      performFind(searchText);
    } else {
      setAsk(true);
      props.onTermChange?.("");
    }
  };

  const handleClear = () => {
    setSearchText("");
    setAsked(false);
    setErrors([]);
    props.onReportCriteria?.(null);
    props.resetSearchResults?.();
    props.onTermChange?.("");
  };

  useEffect(() => () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
  }, []);

  return (
    <div id="peopleSearch">
      <ErrorMessages errors={errors} />
      <input
        id="q"
        name="searchText"
        type="text"
        placeholder={ask ? "People who gave this year and missed last Sunday" : "Find a household or a person"}
        value={searchText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        data-testid="people-search-input"
        autoComplete="off"
        aria-label={ask ? "Ask" : "Find"}
        disabled={asking}
      />
      <p className="search-modes">
        <button type="button" className={ask ? "on" : ""} onClick={switchAsk}>Ask</button>
        {" · "}
        <button type="button" className={showAdvanced ? "on" : ""} onClick={() => setShowAdvanced((v) => !v)}>
          {Locale.label("people.peopleSearch.adv")}
        </button>
        {ask && (
          <>
            {" · "}
            <button type="button" onClick={performAsk} disabled={asking || !searchText.trim()}>
              {asking ? Locale.label("people.aiSearch.searching") : Locale.label("people.aiSearch.search")}
            </button>
          </>
        )}
        {(searchText || asked) && (
          <>
            {" · "}
            <button type="button" onClick={handleClear} disabled={asking} data-testid="ai-search-clear">
              {Locale.label("people.aiSearch.clearSearch", "Clear")}
            </button>
          </>
        )}
      </p>
      {ask && <p className="ask-hint">Ask is the advanced search. Save any result as a list.</p>}
      {showAdvanced && (
        <AdvancedPeopleSearch
          updateSearchResults={props.updateSearchResults}
          toggleFunction={() => setShowAdvanced(false)}
          updatedFunction={props.updatedFunction}
          embedded={true}
          initialFilters={props.initialFilters}
          onReportCriteria={props.onReportCriteria}
        />
      )}
    </div>
  );
}
