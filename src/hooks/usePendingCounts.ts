import { useQuery } from "@tanstack/react-query";
import { UserHelper, Permissions } from "@churchapps/apphelper";
import { type EventInterface, type GroupJoinRequestInterface } from "@churchapps/helpers";
import { type EventBookingInterface } from "../calendars/interfaces";

export const usePendingApprovalsCount = (): number => {
  const canResolve = UserHelper.checkAccess(Permissions.contentApi.content.edit);
  const bookings = useQuery<EventBookingInterface[]>({ queryKey: ["/eventBookings/pending", "ContentApi"], placeholderData: [], enabled: canResolve });
  const events = useQuery<EventInterface[]>({ queryKey: ["/events/pending", "ContentApi"], placeholderData: [], enabled: canResolve });
  if (!canResolve) return 0;
  return (bookings.data?.length || 0) + (events.data?.length || 0);
};

export const usePendingJoinRequestsCount = (): number => {
  const canApprove = UserHelper.checkAccess(Permissions.membershipApi.groupMembers.edit);
  const requests = useQuery<GroupJoinRequestInterface[]>({ queryKey: ["/groupjoinrequests/pending", "MembershipApi"], placeholderData: [], enabled: canApprove });
  return canApprove ? (requests.data?.length || 0) : 0;
};
