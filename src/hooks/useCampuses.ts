import { useQuery } from "@tanstack/react-query";
import { type CampusInterface } from "../settings/components/CampusInterface";

// Shared loader for the church-wide (Membership) campus list. Using a stable
// React Query key means every caller (person/group/plan editors, the people
// list, bulk actions, advanced search) shares one cached fetch instead of each
// component hitting /campuses on mount.
export const useCampuses = (): CampusInterface[] => {
  const query = useQuery<CampusInterface[]>({ queryKey: ["/campuses", "MembershipApi"], placeholderData: [] });
  return query.data || [];
};
