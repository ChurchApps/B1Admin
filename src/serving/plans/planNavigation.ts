export interface NavPlan { id?: string; name?: string; serviceDate?: Date | string }

const time = (p: NavPlan) => (p.serviceDate ? new Date(p.serviceDate).getTime() : 0);

/** The plans just before and after the current one, among plans of the same plan type ordered by service date. */
export const getAdjacentPlans = <T extends NavPlan>(plans: T[], currentId?: string): { previous: T | null; next: T | null } => {
  const sorted = plans.filter((p) => p.id).slice().sort((a, b) => time(a) - time(b) || (a.name || "").localeCompare(b.name || "") || (a.id || "").localeCompare(b.id || ""));
  const index = sorted.findIndex((p) => p.id === currentId);
  if (index < 0) return { previous: null, next: null };
  return { previous: sorted[index - 1] || null, next: sorted[index + 1] || null };
};
