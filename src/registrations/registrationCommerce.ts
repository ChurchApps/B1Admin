import { type EventInterface, type RegistrationInterface, type RegistrationMemberInterface } from "@churchapps/helpers";

// Phase 2 commerce fields live on the Api models but aren't in the published @churchapps/helpers
// interfaces yet; these local extensions/interfaces cover them until helpers is republished.

export interface RegistrationTypeInterface {
  id?: string;
  churchId?: string;
  eventId?: string;
  name?: string;
  description?: string;
  price?: number | null;
  capacity?: number | null;
  minAgeYears?: number;
  maxAgeYears?: number;
  formId?: string;
  sort?: number;
  active?: boolean;
  remainingCapacity?: number;
}

export interface RegistrationSelectionInterface {
  id?: string;
  churchId?: string;
  eventId?: string;
  name?: string;
  description?: string;
  price?: number | null;
  capacity?: number | null;
  maxQuantity?: number | null;
  sort?: number;
  active?: boolean;
}

export interface RegistrationCouponInterface {
  id?: string;
  churchId?: string;
  eventId?: string;
  code?: string;
  discountType?: string;
  value?: number;
  startDate?: Date | string;
  endDate?: Date | string;
  minMembers?: number;
  maxUses?: number;
  active?: boolean;
  uses?: number;
}

export interface RegistrationPaymentInterface {
  id?: string;
  churchId?: string;
  registrationId?: string;
  gatewayId?: string;
  provider?: string;
  transactionId?: string;
  method?: string;
  amount?: number;
  currency?: string;
  kind?: string;
  status?: string;
  personId?: string;
  createdDate?: Date | string;
}

export interface CommerceEventInterface extends Omit<EventInterface, "capacity" | "registrationOpenDate" | "registrationCloseDate"> {
  waitlistEnabled?: boolean;
  capacity?: number | null;
  registrationOpenDate?: Date | null;
  registrationCloseDate?: Date | null;
}

export interface CommerceMemberInterface extends RegistrationMemberInterface {
  registrationTypeId?: string;
}

export interface CommerceRegistrationInterface extends RegistrationInterface {
  totalAmount?: number;
  amountPaid?: number;
  couponId?: string;
  waitlistNotifiedDate?: Date;
  members?: CommerceMemberInterface[];
}
