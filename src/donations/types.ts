import { type DonationInterface, type DonationStatus } from "@churchapps/helpers";

// A donation as the GivingApi returns it: the status can also be "refunded", and the UI adds the display name of whoever entered it.
export type DonationRecord = Omit<DonationInterface, "status"> & {
  status?: DonationStatus | "refunded";
  enteredByName?: string;
};

// A payment gateway event from GivingApi's /eventLog.
export interface GatewayEventLogInterface {
  id: string;
  churchId?: string;
  customerId?: string;
  personId?: string;
  provider?: string;
  providerId?: string;
  status?: string;
  eventType?: string;
  message?: string;
  resolved: boolean;
  created: Date;
}
