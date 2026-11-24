import { useQuery } from "@tanstack/react-query";
import { UserHelper, Permissions } from "@churchapps/apphelper";
import { type EventInterface, type GroupJoinRequestInterface } from "@churchapps/helpers";
import { type EventBookingInterface } from "../calendars/interfaces";
import { canSeeBatches, isBatchClosed, type BatchWithStatus } from "../donations/batchAccess";

// The always-open batch online gifts land in (Api DonationBatchRepo.getOrCreateCurrent); it is never "waiting" on anyone.
const ONLINE_BATCH_NAME = "Online Donation";

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

// Batches still being worked on: every batch is open until someone closes it. Same query as the Batches page, so they share a cache.
export const useOpenBatchesCount = (): number => {
  const canSee = canSeeBatches();
  const batches = useQuery<BatchWithStatus[]>({ queryKey: ["/donationbatches", "GivingApi"], placeholderData: [], enabled: canSee });
  if (!canSee) return 0;
  return (batches.data || []).filter((b) => !isBatchClosed(b) && b.name !== ONLINE_BATCH_NAME).length;
};
