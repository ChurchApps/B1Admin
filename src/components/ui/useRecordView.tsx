import React, { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Locale } from "@churchapps/apphelper";
import { TextAction } from "./RecordParts";

interface Options {
  /** true = every switch replaces history; a list = replace only when entering or leaving those views (e.g. edit forms). */
  replace?: boolean | string[];
  scrollToTop?: boolean;
}

// One slice of a record at a time, held in ?view=. The slice owns the query string: switching drops other params unless passed as extra.
export function useRecordView(key = "view", { replace = true, scrollToTop = true }: Options = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get(key) || "";

  const setView = useCallback((next: string, extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (next) params.set(key, next);
    Object.entries(extra || {}).forEach(([k, v]) => { if (v) params.set(k, v); });
    const shouldReplace = Array.isArray(replace) ? replace.includes(next) || replace.includes(view) : replace;
    setSearchParams(params, { replace: shouldReplace });
    if (scrollToTop) window.scrollTo({ top: 0 });
  }, [key, replace, view, scrollToTop, setSearchParams]);

  return { view, setView, searchParams };
}

interface BackVerbProps {
  name: string;
  onClick: () => void;
  /** Locale key whose text contains {name}. */
  labelKey?: string;
  "data-testid"?: string;
}

export const BackVerb: React.FC<BackVerbProps> = ({ name, onClick, labelKey = "common.backTo", ...rest }) => (
  <TextAction onClick={onClick} data-testid={rest["data-testid"]}>
    {"← " + Locale.label(labelKey, "Back to {name}").replace("{name}", name || "")}
  </TextAction>
);
