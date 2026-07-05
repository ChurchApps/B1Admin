import { useCallback, useEffect, useState } from "react";
import { ApiHelper } from "@churchapps/apphelper";
import type { ApiListType, LinkInterface } from "@churchapps/helpers";
import { ensureSequentialSort, moveItemDown, moveItemUp } from "../helpers/SortHelper";

interface Options {
  apiName?: ApiListType;
  refresh?: unknown;
}

interface UseReorderableLinksResult {
  links: LinkInterface[];
  setLinks: (links: LinkInterface[]) => void;
  isLoading: boolean;
  loadData: () => void;
  saveChanges: () => Promise<void>;
  moveUp: (idx: number, list?: LinkInterface[]) => void;
  moveDown: (idx: number, list?: LinkInterface[]) => void;
}

// Shared load/save/moveUp/moveDown over `/links?category=`. moveUp/moveDown default to the flat
// `links` list; pass an explicit sibling list (e.g. nested structured links) to reorder within it.
export const useReorderableLinks = (category: string, options?: Options): UseReorderableLinksResult => {
  const apiName = options?.apiName ?? "ContentApi";
  const [links, setLinks] = useState<LinkInterface[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(() => {
    ApiHelper.get(`/links?category=${category}`, apiName)
      .then((data: LinkInterface[]) => { setLinks(data || []); })
      .catch(() => { setLinks([]); })
      .finally(() => { setIsLoading(false); });
  }, [category, apiName]);

  const saveChanges = useCallback(() => ApiHelper.post("/links", links, apiName).then(loadData), [links, apiName, loadData]);

  const reorder = useCallback((direction: "up" | "down", idx: number, list?: LinkInterface[]) => {
    const target = list ?? links;
    ensureSequentialSort(target);
    if (direction === "up") moveItemUp(target, idx);
    else moveItemDown(target, idx);
    saveChanges();
  }, [links, saveChanges]);

  const moveUp = useCallback((idx: number, list?: LinkInterface[]) => reorder("up", idx, list), [reorder]);
  const moveDown = useCallback((idx: number, list?: LinkInterface[]) => reorder("down", idx, list), [reorder]);

  useEffect(() => { loadData(); }, [loadData, options?.refresh]);

  return { links, setLinks, isLoading, loadData, saveChanges, moveUp, moveDown };
};
