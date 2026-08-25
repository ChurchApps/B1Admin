import { useState, useCallback } from "react";
import { ApiHelper } from "@churchapps/apphelper";
import { navigateToPath, type Instructions, type InstructionItem } from "@churchapps/content-providers";
import { type PlanItemInterface } from "../../../helpers";
import { findThumbnailRecursive, findByRelatedId, getExpandedSectionPath } from "../planItemUtils";

interface ExpandOptions {
  planItem: PlanItemInterface;
  associatedProviderId?: string;
  associatedContentPath?: string;
  ministryId?: string;
  /** Contiguous run of action items this section was expanded into, when this item starts one. */
  collapseItems?: PlanItemInterface[];
  onChange?: () => void;
  onError?: (message: string) => void;
}

interface ExpandResult {
  isExpanding: boolean;
  canExpand: boolean;
  handleExpandToActions: () => Promise<void>;
  canCollapse: boolean;
  handleCollapseToSection: () => Promise<void>;
  handleSaveDescription: (text: string) => Promise<void>;
  handleRestoreOriginal: () => Promise<void>;
}

/** Expand a section plan item into nested child action items via provider or plan-level association.
 * The section row stays as a folder; collapse is a view toggle. handleCollapseToSection only serves
 * legacy sibling runs created before folders existed. */
export function usePlanItemExpand(options: ExpandOptions): ExpandResult {
  const { planItem, associatedProviderId, associatedContentPath, ministryId, collapseItems, onChange, onError } = options;
  const [isExpanding, setIsExpanding] = useState(false);

  const canExpandViaProvider = !!(planItem.providerId && planItem.providerPath && planItem.providerContentPath);
  const canExpandViaPlan = !!(associatedProviderId && associatedContentPath && planItem.relatedId);
  const canExpand = canExpandViaProvider || canExpandViaPlan;
  const canCollapse = !!(ministryId && collapseItems && collapseItems.length > 1 && getExpandedSectionPath(collapseItems[0]));

  const createActionItems = useCallback((
    section: InstructionItem,
    pathPrefix: string,
    providerId: string,
    providerPath: string,
    currentSort: number
  ): Partial<PlanItemInterface>[] => {
    if (!section.children || section.children.length === 0) return [];

    // The section stays and becomes a folder; actions nest beneath it.
    return section.children.map((action, index) => ({
      planId: planItem.planId,
      parentId: planItem.id,
      sort: currentSort + index + 1,
      itemType: "providerPresentation",
      actionType: action.actionType,
      relatedId: action.relatedId || action.id || "",
      label: action.label || "",
      description: action.content || "",
      seconds: action.seconds || 0,
      providerId,
      providerPath,
      providerContentPath: `${pathPrefix}.${index}`,
      thumbnailUrl: findThumbnailRecursive(action)
    }));
  }, [planItem.planId, planItem.id]);

  const expandViaProvider = useCallback(async () => {
    const { providerId, providerPath, providerContentPath } = planItem;
    if (!providerId || !providerPath || !providerContentPath || !ministryId) return;

    const instructions: Instructions = await ApiHelper.post(
      "/providerProxy/getInstructions",
      { ministryId, providerId, path: providerPath },
      "DoingApi"
    );

    if (!instructions?.items) return;

    // Prefer relatedId (stable across provider edits); the stored index path may be stale.
    const found = planItem.relatedId ? findByRelatedId(instructions.items, planItem.relatedId) : null;
    const section = found?.item || navigateToPath(instructions, providerContentPath);
    const pathPrefix = found?.path || providerContentPath;
    if (!section?.children || section.children.length === 0) return;

    const actionItems = createActionItems(section, pathPrefix, providerId, providerPath, planItem.children?.length || 0);
    if (actionItems.length > 0) await ApiHelper.post("/planItems", actionItems, "DoingApi");
  }, [planItem, ministryId, createActionItems]);

  const expandViaPlan = useCallback(async () => {
    if (!associatedProviderId || !associatedContentPath || !ministryId || !planItem.relatedId) return;

    const instructions: Instructions = await ApiHelper.post(
      "/providerProxy/getInstructions",
      { ministryId, providerId: associatedProviderId, path: associatedContentPath },
      "DoingApi"
    );

    if (!instructions?.items) return;

    const found = findByRelatedId(instructions.items, planItem.relatedId);
    if (!found || !found.item.children || found.item.children.length === 0) return;

    const actionItems = createActionItems(found.item, found.path, associatedProviderId, associatedContentPath, planItem.children?.length || 0);
    if (actionItems.length > 0) await ApiHelper.post("/planItems", actionItems, "DoingApi");
  }, [planItem, associatedProviderId, associatedContentPath, ministryId, createActionItems]);

  const handleExpandToActions = useCallback(async () => {
    if (!canExpand) {
      console.warn("Cannot expand section: no provider path available");
      return;
    }

    setIsExpanding(true);
    try {
      if (canExpandViaProvider) {
        await expandViaProvider();
      } else {
        await expandViaPlan();
      }
      if (onChange) onChange();
    } catch (error) {
      console.error("Error expanding section:", error);
      if (onError) onError("Failed to expand section");
    } finally {
      setIsExpanding(false);
    }
  }, [canExpand, canExpandViaProvider, expandViaProvider, expandViaPlan, onChange, onError]);


  /** Inverse of handleExpandToActions: re-resolves the section from the provider and swaps the run back. */
  const handleCollapseToSection = useCallback(async () => {
    const first = collapseItems?.[0];
    const sectionPath = first ? getExpandedSectionPath(first) : null;
    if (!first || !sectionPath || !ministryId) return;

    try {
      const instructions: Instructions = await ApiHelper.post(
        "/providerProxy/getInstructions",
        { ministryId, providerId: first.providerId, path: first.providerPath },
        "DoingApi"
      );
      const section = instructions?.items ? navigateToPath(instructions, sectionPath) : null;
      if (!section) throw new Error("Section no longer exists in the provider content");

      // Post the replacement first so a failure leaves the actions intact.
      const saved = await ApiHelper.post("/planItems", [
        {
          planId: first.planId,
          parentId: first.parentId,
          sort: (first.sort || 1) - 0.5,
          itemType: "providerSection",
          relatedId: section.relatedId || section.id || "",
          label: section.label || "",
          description: section.content,
          seconds: section.seconds || 0,
          providerId: first.providerId,
          providerPath: first.providerPath,
          providerContentPath: sectionPath,
          thumbnailUrl: findThumbnailRecursive(section)
        }
      ], "DoingApi");

      for (const item of collapseItems || []) {
        if (item.id) await ApiHelper.delete(`/planItems/${item.id}`, "DoingApi");
      }
      if (saved?.[0]) await ApiHelper.post("/planItems/sort", saved[0], "DoingApi");
      if (onChange) onChange();
    } catch (error) {
      console.error("Error collapsing section:", error);
      if (onError) onError("Failed to collapse section");
    }
  }, [collapseItems, ministryId, onChange, onError]);

  const handleSaveDescription = useCallback(async (text: string) => {
    await ApiHelper.post("/planItems", [{ ...planItem, description: text }], "DoingApi");
    if (onChange) onChange();
  }, [planItem, onChange]);

  /** Re-resolves this single node from its provider path and overwrites the local edit — no stored-original copy needed. */
  const handleRestoreOriginal = useCallback(async () => {
    const { providerId, providerPath, providerContentPath } = planItem;
    if (!providerId || !providerPath || !providerContentPath || !ministryId) return;

    try {
      const instructions: Instructions = await ApiHelper.post(
        "/providerProxy/getInstructions",
        { ministryId, providerId, path: providerPath },
        "DoingApi"
      );
      if (!instructions?.items) return;

      const found = planItem.relatedId ? findByRelatedId(instructions.items, planItem.relatedId) : null;
      const node = found?.item || navigateToPath(instructions, providerContentPath);
      if (!node) return;

      const restored = { ...planItem, label: node.label || "", description: node.content || "", actionType: node.actionType };
      await ApiHelper.post("/planItems", [restored], "DoingApi");
      if (onChange) onChange();
    } catch (error) {
      console.error("Error restoring original content:", error);
      if (onError) onError("Failed to restore original content");
    }
  }, [planItem, ministryId, onChange, onError]);

  return {
    isExpanding,
    canExpand,
    handleExpandToActions,
    canCollapse,
    handleCollapseToSection,
    handleSaveDescription,
    handleRestoreOriginal
  };
}
