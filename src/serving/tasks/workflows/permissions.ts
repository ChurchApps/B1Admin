// Convenience wrappers around the DoingApi permission tiers. The tier constants
// live in @churchapps/helpers (Permissions.doingApi); canEditCard's per-card rule
// is B1Admin-specific so it stays here.
import { Permissions, UserHelper } from "@churchapps/apphelper";

export const canViewWorkflows = () => UserHelper.checkAccess(Permissions.doingApi.tasks.view);
export const canEditCards = () => UserHelper.checkAccess(Permissions.doingApi.tasks.edit);
export const canManageWorkflows = () => UserHelper.checkAccess(Permissions.doingApi.tasks.admin);

// Edit-assigned tier: full editors, or the person the card is assigned to.
export const canEditCard = (card: { assignedToType?: string; assignedToId?: string }) =>
  canEditCards() || (card?.assignedToType === "person" && !!card?.assignedToId && card.assignedToId === UserHelper.currentUserChurch?.person?.id);
