import React from "react";
import { type SearchCondition, type PersonInterface } from "@churchapps/helpers";
import { ApiHelper, ErrorMessages, Locale } from "@churchapps/apphelper";
import { B1AdminPersonHelper } from "../../helpers";

interface Props {
  updateSearchResults: (people: PersonInterface[]) => void;
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
    if (!text.trim()) return;
    setIsLoading(true);
    try {
      const filters: SearchCondition[] = await ApiHelper.post("/query/people", { query: text }, "AskApi");
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

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSearch(e);
    }
  };

  return (
    <div id="display-box">
      <ErrorMessages errors={errors} />
      <textarea
        id="ask"
        rows={1}
        placeholder="Or ask: people who gave this year and missed last Sunday"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        aria-label="Ask"
      />
      <p className="ask-hint">Ask is the advanced search. Save any result as a list.</p>
      <div className="ask-actions">
        <button type="button" onClick={handleSearch} disabled={isLoading || !text}>
          {isLoading ? Locale.label("people.aiSearch.searching") : Locale.label("people.aiSearch.search")}
        </button>
        {(text || isSearched) && (
          <button type="button" onClick={handleClear} disabled={isLoading} data-testid="ai-search-clear">
            {Locale.label("people.aiSearch.clearSearch", "Clear Search")}
          </button>
        )}
      </div>
    </div>
  );
};
