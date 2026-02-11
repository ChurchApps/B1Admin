import { useState, useCallback } from "react";
import { ApiHelper } from "@churchapps/apphelper";
import { navigateToPath, type Instructions, type InstructionItem } from "@churchapps/content-provider-helper";
import { type PlanItemInterface } from "../../../helpers";
import { findThumbnailRecursive } from "../planItemUtils";

interface ExpandOptions {
  planItem: PlanItemInterface;
  associatedProviderId?: string;
  associatedVenueId?: string;
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
 * Hook that provides expand functionality for plan items.
 * Consolidates the logic for expanding sections into individual action items.
 *
 * Supports two expansion methods:
 * 1. Provider-based expansion (current): Uses item-level provider fields (providerId, providerPath, providerContentPath)
 * 2. Legacy expansion: Uses plan-level provider association for old items that only have relatedId
 */
export function usePlanItemExpand(options: ExpandOptions): ExpandResult {
  const { planItem, associatedProviderId, associatedVenueId, ministryId, onChange, onError } = options;
  const [isExpanding, setIsExpanding] = useState(false);

  // Determine if expansion is possible
  const canExpandViaProvider = !!(planItem.providerId && planItem.providerPath && planItem.providerContentPath);
  const canExpandViaLegacy = !!(associatedProviderId && associatedVenueId && planItem.relatedId);
  const canExpand = canExpandViaProvider || canExpandViaLegacy;

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
      await ApiHelper.delete(`/planItems/${planItem.id}`, "DoingApi");
      await ApiHelper.post("/planItems", actionItems, "DoingApi");
    }
  }, [planItem, ministryId, createActionItems]);

  // Expand via legacy association (plan-level provider data)
  const expandViaLegacy = useCallback(async () => {
    if (!associatedProviderId || !associatedVenueId || !ministryId) return;

    const instructions: Instructions = await ApiHelper.post(
      "/providerProxy/getInstructions",
      { ministryId, providerId: associatedProviderId, path: associatedVenueId },
      "DoingApi"
    );

    if (!instructions?.items) return;

    // Search the instruction tree for a matching relatedId
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
      associatedVenueId,
      planItem.sort || 1
    );

    if (actionItems.length > 0) {
      await ApiHelper.delete(`/planItems/${planItem.id}`, "DoingApi");
      await ApiHelper.post("/planItems", actionItems, "DoingApi");
    }
  }, [planItem, associatedProviderId, associatedVenueId, ministryId, createActionItems]);

  // Main expand handler
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
        await expandViaLegacy();
      }
      if (onChange) onChange();
    } catch (error) {
      console.error("Error expanding section:", error);
      if (onError) onError("Failed to expand section");
    } finally {
      setIsExpanding(false);
    }
  }, [canExpand, canExpandViaProvider, expandViaProvider, expandViaLegacy, onChange, onError]);

  return {
    isExpanding,
    canExpand,
    handleExpandToActions
  };
}
