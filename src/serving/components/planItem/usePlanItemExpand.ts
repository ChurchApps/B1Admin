import { useState, useCallback } from "react";
import { ApiHelper } from "@churchapps/apphelper";
import { navigateToPath, type Instructions, type InstructionItem } from "@churchapps/content-providers";
import { type PlanItemInterface } from "../../../helpers";
import { findThumbnailRecursive, findByRelatedId } from "../planItemUtils";

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

/** Expand a section plan item into its child action items via provider or plan-level association. */
export function usePlanItemExpand(options: ExpandOptions): ExpandResult {
  const { planItem, associatedProviderId, associatedContentPath, ministryId, onChange, onError } = options;
  const [isExpanding, setIsExpanding] = useState(false);

  const canExpandViaProvider = !!(planItem.providerId && planItem.providerPath && planItem.providerContentPath);
  const canExpandViaPlan = !!(associatedProviderId && associatedContentPath && planItem.relatedId);
  const canExpand = canExpandViaProvider || canExpandViaPlan;

  const createActionItems = useCallback((
    section: InstructionItem,
    pathPrefix: string,
    providerId: string,
    providerPath: string,
    currentSort: number
  ): Partial<PlanItemInterface>[] => {
    if (!section.children || section.children.length === 0) return [];

    // Fractional sorts keep the new items in the deleted section's slot without
    // colliding with later siblings; a /planItems/sort call renumbers afterward.
    const count = section.children.length;
    return section.children.map((action, index) => ({
      planId: planItem.planId,
      parentId: planItem.parentId,
      sort: currentSort + (index + 1) / (count + 1),
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

  const replaceSectionWith = useCallback(async (actionItems: Partial<PlanItemInterface>[]) => {
    // Post replacement items first to preserve original if post fails.
    const saved = await ApiHelper.post("/planItems", actionItems, "DoingApi");
    await ApiHelper.delete(`/planItems/${planItem.id}`, "DoingApi");
    if (saved?.[0]) await ApiHelper.post("/planItems/sort", saved[0], "DoingApi");
  }, [planItem.id]);

  const expandViaProvider = useCallback(async () => {
    const { providerId, providerPath, providerContentPath, sort } = planItem;
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

    const actionItems = createActionItems(
      section,
      pathPrefix,
      providerId,
      providerPath,
      sort || 1
    );

    if (actionItems.length > 0) await replaceSectionWith(actionItems);
  }, [planItem, ministryId, createActionItems, replaceSectionWith]);

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

    const actionItems = createActionItems(
      found.item,
      found.path,
      associatedProviderId,
      associatedContentPath,
      planItem.sort || 1
    );

    if (actionItems.length > 0) await replaceSectionWith(actionItems);
  }, [planItem, associatedProviderId, associatedContentPath, ministryId, createActionItems, replaceSectionWith]);

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
