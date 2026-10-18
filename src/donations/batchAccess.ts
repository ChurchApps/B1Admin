import { UserHelper, Permissions } from "@churchapps/apphelper";
import { type DonationBatchInterface, type IApiPermission } from "@churchapps/helpers";

export type BatchWithStatus = DonationBatchInterface & { status?: string };

// Enter Donations (GivingApi / Donations / Enter). Swap for Permissions.givingApi.donations.enter once @churchapps/helpers ships it.
export const enterDonationsPermission: IApiPermission = { api: "GivingApi", contentType: "Donations", action: "Enter" };

export const isBatchClosed = (batch?: BatchWithStatus) => batch?.status === "closed";

export const canEditDonations = () => UserHelper.checkAccess(Permissions.givingApi.donations.edit);

export const canEnterDonations = () => canEditDonations() || UserHelper.checkAccess(enterDonationsPermission);

export const canSeeBatches = () => UserHelper.checkAccess(Permissions.givingApi.donations.viewSummary) || UserHelper.checkAccess(enterDonationsPermission);

// Edit Donations can always change a batch; Enter Donations only while it is open.
export const canChangeBatch = (batch?: BatchWithStatus) => canEditDonations() || (!!batch && !isBatchClosed(batch) && UserHelper.checkAccess(enterDonationsPermission));
