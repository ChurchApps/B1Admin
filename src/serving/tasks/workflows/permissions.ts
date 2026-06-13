// Convenience wrappers around the DoingApi permission tiers. The tier constants
// live in @churchapps/helpers (Permissions.doingApi); canEditCard's per-card rule
// is B1Admin-specific so it stays here.
import { Permissions, UserHelper } from "@churchapps/apphelper";

// Guard against a helpers version that predates the doingApi tier: a missing tier
// degrades to "no access" rather than throwing and white-screening the page.
const check = (perm?: { api: string; contentType: string; action: string }) => !!perm && UserHelper.checkAccess(perm);

export const canViewWorkflows = () => check(Permissions.doingApi?.tasks?.view);
export const canEditCards = () => check(Permissions.doingApi?.tasks?.edit);
export const canManageWorkflows = () => check(Permissions.doingApi?.tasks?.admin);

// Edit-assigned tier: full editors, or the person the card is assigned to.
export const canEditCard = (card: { assignedToType?: string; assignedToId?: string }) =>
  canEditCards() || (card?.assignedToType === "person" && !!card?.assignedToId && card.assignedToId === UserHelper.currentUserChurch?.person?.id);
