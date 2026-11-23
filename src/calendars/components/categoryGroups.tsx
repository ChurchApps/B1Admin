import type { ReactNode } from "react";
import { ListSubheader } from "@mui/material";

type Categorized = { name?: string; categoryName?: string | null };

// Rooms and resources grouped by category (#1650): categories A-Z, each sorted by name, uncategorized
// items last with no heading. When nothing has a category the list comes back as one group, unchanged.
export function groupByCategory<T extends Categorized>(items: T[]): { category: string | null; items: T[] }[] {
  const category = (i: T) => i.categoryName?.trim() || "";
  if (!items.some((i) => category(i))) return [{ category: null, items }];
  const names = Array.from(new Set(items.map(category).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  const byName = (a: T, b: T) => (a.name || "").localeCompare(b.name || "");
  const groups: { category: string | null; items: T[] }[] = names.map((c) => ({ category: c, items: items.filter((i) => category(i) === c).sort(byName) }));
  const rest = items.filter((i) => !category(i));
  if (rest.length > 0) groups.push({ category: null, items: rest });
  return groups;
}

// MUI Select needs its options as flat children, so headings and items are pushed into one array.
export function categorizedOptions<T extends Categorized>(items: T[], renderItem: (item: T) => ReactNode): ReactNode[] {
  const result: ReactNode[] = [];
  groupByCategory(items).forEach((g) => {
    if (g.category) result.push(<ListSubheader key={"cat-" + g.category}>{g.category}</ListSubheader>);
    g.items.forEach((i) => result.push(renderItem(i)));
  });
  return result;
}

// Distinct categories already in use, A-Z, offered as suggestions in the edit forms.
export function categoryNames(items: Categorized[]): string[] {
  return Array.from(new Set(items.map((i) => i.categoryName?.trim() || "").filter(Boolean))).sort((a, b) => a.localeCompare(b));
}
