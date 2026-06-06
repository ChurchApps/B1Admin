// Shim for the DoingApi permission tiers, until @churchapps/helpers exposes them.
import { UserHelper } from "@churchapps/apphelper";

const doing = (action: string) => ({ api: "DoingApi", contentType: "Doing", action });

export const DoingPermissions = {
  view: doing("View"),
  edit: doing("Edit"),
  admin: doing("Admin")
};

export const canViewWorkflows = () => UserHelper.checkAccess(DoingPermissions.view);
export const canEditCards = () => UserHelper.checkAccess(DoingPermissions.edit);
export const canManageWorkflows = () => UserHelper.checkAccess(DoingPermissions.admin);

// Edit-assigned tier: full editors, or the person the card is assigned to.
export const canEditCard = (card: { assignedToType?: string; assignedToId?: string }) =>
  canEditCards() || (card?.assignedToType === "person" && !!card?.assignedToId && card.assignedToId === UserHelper.currentUserChurch?.person?.id);
