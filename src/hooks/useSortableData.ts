import { useMemo, useState } from "react";
import type { SortDirection } from "../components/ui";

type Comparators<T> = Record<string, (a: T, b: T) => number>;

interface UseSortableDataResult<T> {
  sorted: T[];
  sortBy: string;
  sortDirection: SortDirection;
  handleSort: (key: string) => void;
}

const defaultCompare = (a: unknown, b: unknown): number => {
  const av = a ?? "";
  const bv = b ?? "";
  if (typeof av === "number" && typeof bv === "number") return av - bv;
  return String(av).toUpperCase().localeCompare(String(bv).toUpperCase());
};

// Encapsulates the sortBy/sortDirection/useMemo pattern pages hand-roll around SortableTableHead.
export const useSortableData = <T, >(data: T[], initialSortBy = "", initialDirection: SortDirection = "asc", comparators?: Comparators<T>): UseSortableDataResult<T> => {
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const handleSort = (key: string) => {
    setSortDirection(sortBy === key && sortDirection === "asc" ? "desc" : "asc");
    setSortBy(key);
  };

  const sorted = useMemo(() => {
    if (!sortBy) return data;
    const custom = comparators?.[sortBy];
    const dir = sortDirection === "asc" ? 1 : -1;
    return [...data].sort((a, b) => (custom ? custom(a, b) : defaultCompare((a as Record<string, unknown>)[sortBy], (b as Record<string, unknown>)[sortBy])) * dir);
  }, [data, sortBy, sortDirection, comparators]);

  return { sorted, sortBy, sortDirection, handleSort };
};
