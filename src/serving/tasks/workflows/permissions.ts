// Local Doing-permission helpers, mirroring the backend Permissions.doing tiers.
// Defined here rather than imported from @churchapps/helpers because the published
// package does not yet expose DoingApi permissions (see interfaces.ts shim note).
import { UserHelper } from "@churchapps/apphelper";

const doing = (action: string) => ({ api: "DoingApi", contentType: "Doing", action });

export const DoingPermissions = {
  view: doing("View"),
  edit: doing("Edit"),
  admin: doing("Admin")
};

// View boards, reports and card lists.
export const canViewWorkflows = () => UserHelper.checkAccess(DoingPermissions.view);
// Edit ANY card + add people to workflows ("Edit All Cards").
export const canEditCards = () => UserHelper.checkAccess(DoingPermissions.edit);
// Manage workflow definitions, steps, automations, templates ("Manage Workflow").
export const canManageWorkflows = () => UserHelper.checkAccess(DoingPermissions.admin);

// "Edit Assigned Cards" tier: full editors, or the person a card is assigned to.
export const canEditCard = (card: { assignedToType?: string; assignedToId?: string }) =>
  canEditCards() || (card?.assignedToType === "person" && !!card?.assignedToId && card.assignedToId === UserHelper.currentUserChurch?.person?.id);
