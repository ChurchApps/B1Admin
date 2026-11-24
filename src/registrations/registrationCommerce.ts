import { type EventInterface, type RegistrationInterface, type RegistrationMemberInterface, type RegistrationSelectionChoiceInterface } from "@churchapps/helpers";

// Phase 2 commerce fields live on the Api models but aren't in the published @churchapps/helpers
// interfaces yet; these local extensions/interfaces cover them until helpers is republished.

export interface RegistrationTypeInterface {
  id?: string;
  churchId?: string;
  eventId?: string;
  name?: string;
  description?: string;
  price?: number | null;
  // Charged per attendee at checkout instead of the price; the rest is left as a balance.
  depositAmount?: number | null;
  capacity?: number | null;
  minAgeYears?: number | null;
  maxAgeYears?: number | null;
  formId?: string | null;
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

export interface CommerceEventInterface extends Omit<EventInterface, "capacity" | "registrationOpenDate" | "registrationCloseDate" | "formId"> {
  waitlistEnabled?: boolean;
  allowSelfCancel?: boolean;
  allowPayLater?: boolean;
  // Saved as null to unlink the form.
  formId?: string | null;
  capacity?: number | null;
  registrationOpenDate?: Date | null;
  registrationCloseDate?: Date | null;
  // Plain text added to the registration confirmation email.
  confirmationMessage?: string;
}

interface CommerceMemberInterface extends RegistrationMemberInterface {
  registrationTypeId?: string;
}

// A saved selection choice always points at its selection.
export type LoadedSelectionChoice = RegistrationSelectionChoiceInterface & { selectionId: string };

export interface CommerceRegistrationInterface extends RegistrationInterface {
  totalAmount?: number;
  amountPaid?: number;
  couponId?: string;
  waitlistNotifiedDate?: Date;
  members?: CommerceMemberInterface[];
}

export type OfflinePaymentMethod = "cash" | "check" | "other";

const round2 = (n: number) => Math.round(n * 100) / 100;

// Mirrors the Api's RegistrationPaymentHelper so the dialog only offers what the server will accept.
export const isGatewayPayment = (p: RegistrationPaymentInterface) => p.kind !== "refund" && !!p.provider && !!p.transactionId && (p.status || "succeeded") === "succeeded";

export const refundableForPayment = (payment: RegistrationPaymentInterface, payments: RegistrationPaymentInterface[], amountPaid: number) => {
  const refunded = payments
    .filter((p) => p.kind === "refund" && !!p.provider && p.transactionId === payment.transactionId && p.status !== "failed")
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  return Math.max(0, round2(Math.min((Number(payment.amount) || 0) - refunded, Number(amountPaid) || 0)));
};
