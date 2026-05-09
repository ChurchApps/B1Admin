import { useState, useCallback } from "react";
import { ApiHelper } from "@churchapps/apphelper";
import { navigateToPath, type Instructions, type InstructionItem } from "@churchapps/content-providers";
import { type PlanItemInterface } from "../../../helpers";
import { findThumbnailRecursive } from "../planItemUtils";

interface ExpandOptions {
  planItem: PlanItemInterface;
  associatedProviderId?: string;
  associatedContentPath?: string;
  ministryId?: string;
  onChange?: () => void;
  onError?: (message: string) => void;
}

interface ExpandResult {
  isExpanding: boolean;
  canExpand: boolean;
  handleExpandToActions: () => Promise<void>;
}

/**
 * Expand a section plan item into its child action items.
 *
 * Two expansion paths:
 * 1. Item-level provider fields (providerId / providerPath / providerContentPath on the item itself)
 * 2. Plan-level provider association — used when the item only has a relatedId and the
 *    plan carries the providerId + content path
 */
export function usePlanItemExpand(options: ExpandOptions): ExpandResult {
  const { planItem, associatedProviderId, associatedContentPath, ministryId, onChange, onError } = options;
  const [isExpanding, setIsExpanding] = useState(false);

  const canExpandViaProvider = !!(planItem.providerId && planItem.providerPath && planItem.providerContentPath);
  const canExpandViaPlan = !!(associatedProviderId && associatedContentPath && planItem.relatedId);
  const canExpand = canExpandViaProvider || canExpandViaPlan;

  // Shared logic for creating action items from a section's children
  const createActionItems = useCallback((
    section: InstructionItem,
    pathPrefix: string,
    providerId: string,
    providerPath: string,
    currentSort: number
  ): Partial<PlanItemInterface>[] => {
    if (!section.children || section.children.length === 0) return [];

    return section.children.map((action, index) => ({
      planId: planItem.planId,
      parentId: planItem.parentId,
      sort: currentSort + index,
      itemType: "providerPresentation",
      relatedId: action.relatedId || action.id || "",
      label: action.label || "",
      seconds: action.seconds || 0,
      providerId,
      providerPath,
      providerContentPath: `${pathPrefix}.${index}`,
      thumbnailUrl: findThumbnailRecursive(action)
    }));
  }, [planItem.planId, planItem.parentId]);

  // Expand via provider fields (providerId, providerPath, providerContentPath)
  const expandViaProvider = useCallback(async () => {
    const { providerId, providerPath, providerContentPath, sort } = planItem;
    if (!providerId || !providerPath || !providerContentPath || !ministryId) return;

    const instructions: Instructions = await ApiHelper.post(
      "/providerProxy/getInstructions",
      { ministryId, providerId, path: providerPath },
      "DoingApi"
    );

    if (!instructions?.items) return;

    const section = navigateToPath(instructions, providerContentPath);
    if (!section?.children || section.children.length === 0) return;

    const actionItems = createActionItems(
      section,
      providerContentPath,
      providerId,
      providerPath,
      sort || 1
    );

    if (actionItems.length > 0) {
      // Post the replacement items first; only delete the original section once the post has
      // succeeded. If the post fails, the original section stays and nothing is lost.
      await ApiHelper.post("/planItems", actionItems, "DoingApi");
      await ApiHelper.delete(`/planItems/${planItem.id}`, "DoingApi");
    }
  }, [planItem, ministryId, createActionItems]);

  const expandViaPlan = useCallback(async () => {
    if (!associatedProviderId || !associatedContentPath || !ministryId) return;

    const instructions: Instructions = await ApiHelper.post(
      "/providerProxy/getInstructions",
      { ministryId, providerId: associatedProviderId, path: associatedContentPath },
      "DoingApi"
    );

    if (!instructions?.items) return;

    const findSection = (items: InstructionItem[], parentPath: string): { item: InstructionItem; path: string } | null => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const currentPath = parentPath ? `${parentPath}.${i}` : `${i}`;
        if (item.relatedId === planItem.relatedId || item.id === planItem.relatedId) {
          return { item, path: currentPath };
        }
        if (item.children) {
          const found = findSection(item.children, currentPath);
          if (found) return found;
        }
      }
      return null;
    };

    const found = findSection(instructions.items, "");
    if (!found || !found.item.children || found.item.children.length === 0) return;

    const actionItems = createActionItems(
      found.item,
      found.path,
      associatedProviderId,
      associatedContentPath,
      planItem.sort || 1
    );

    if (actionItems.length > 0) {
      // Post the replacement items first; only delete the original section once the post has
      // succeeded. If the post fails, the original section stays and nothing is lost.
      await ApiHelper.post("/planItems", actionItems, "DoingApi");
      await ApiHelper.delete(`/planItems/${planItem.id}`, "DoingApi");
    }
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

  return {
    isExpanding,
    canExpand,
    handleExpandToActions
  };
}
