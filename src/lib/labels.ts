/**
 * Friendly labels for every enum in docs/API.md section 2. The UI never shows a raw enum.
 * Status labels (rent, lease, e-sign, unit) live in the design system StatusBadge and are re-exported here,
 * so each label is written once.
 */
import { statusLabel } from "@/components/molecules/StatusBadge";
import type { UserRole } from "@/types/auth";
import type { LeaseStatus, PaymentFrequency, SignatureStatus } from "@/types/lease";
import type { PropertyType } from "@/types/property";
import type { UnitStatus, UnitType } from "@/types/unit";

export const userRoleLabels: Record<UserRole, string> = {
  OWNER: "Owner",
  PROPERTY_MANAGER: "Property Manager",
  TENANT: "Tenant",
};

export const propertyTypeLabels: Record<PropertyType, string> = {
  RESIDENTIAL: "Residential",
  COMMERCIAL: "Commercial",
  MIXED_USE: "Mixed use",
};

export const unitTypeLabels: Record<UnitType, string> = {
  STUDIO: "Studio",
  ONE_BED: "1 BR",
  TWO_BED: "2 BR",
  THREE_BED: "3 BR",
  FOUR_BED: "4 BR",
};

/** Short bedroom label for layouts: "Studio", "1 bd" ... "4 bd". */
const unitBedLabels: Record<UnitType, string> = {
  STUDIO: "Studio",
  ONE_BED: "1 bd",
  TWO_BED: "2 bd",
  THREE_BED: "3 bd",
  FOUR_BED: "4 bd",
};

/** Unit layout: "1 bd / 1 ba", "Studio / 1 ba", or "3 bd" when bathrooms is null. */
export function unitLayout(unitType: UnitType, bathrooms: number | null): string {
  const beds = unitBedLabels[unitType];
  return bathrooms === null ? beds : `${beds} / ${bathrooms} ba`;
}

export const unitStatusLabels: Record<UnitStatus, string> = statusLabel.unit;

export const tenantTypeLabels: Record<"INDIVIDUAL" | "COMPANY", string> = {
  INDIVIDUAL: "Individual",
  COMPANY: "Company",
};

export const contactMethodLabels: Record<"EMAIL" | "PHONE" | "SMS", string> = {
  EMAIL: "Email",
  PHONE: "Phone",
  SMS: "SMS",
};

export const leaseStatusLabels: Record<LeaseStatus, string> = {
  DRAFT: statusLabel.lease.DRAFT,
  ACTIVE: statusLabel.lease.ACTIVE,
  ENDED: statusLabel.lease.ENDED,
  TERMINATED: statusLabel.lease.TERMINATED,
};

export const signatureStatusLabels: Record<SignatureStatus, string> = statusLabel.esign;

export const paymentFrequencyLabels: Record<PaymentFrequency, string> = {
  WEEKLY: "Weekly",
  BIWEEKLY: "Biweekly",
  MONTHLY: "Monthly",
  QUARTERLY: "Quarterly",
};

export const paymentMethodLabels: Record<"ACH" | "CHECK" | "CREDIT_CARD" | "CASH" | "OTHER", string> = {
  ACH: "ACH",
  CHECK: "Check",
  CREDIT_CARD: "Credit card",
  CASH: "Cash",
  OTHER: "Other",
};

export const chargeTypeLabels: Record<"RENT" | "LATE_FEE" | "OTHER", string> = {
  RENT: "Rent",
  LATE_FEE: "Late fee",
  OTHER: "Other",
};

export const rentStatusLabels: Record<"PAID" | "PARTIAL" | "UNPAID" | "OVERDUE" | "NOT_BILLED", string> = statusLabel.rent;

export const ledgerKindLabels: Record<"CHARGE" | "PAYMENT", string> = {
  CHARGE: "Charge",
  PAYMENT: "Payment",
};

/** Options for a Select, in the order of the map: [{ value, label }]. */
export function labelOptions<K extends string>(labels: Record<K, string>): { value: K; label: string }[] {
  return (Object.keys(labels) as K[]).map((value) => ({ value, label: labels[value] }));
}

/** "1 unit" / "3 units". Pass the plural when it isn't singular + "s". */
export function plural(count: number, singular: string, pluralWord = `${singular}s`): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? singular : pluralWord}`;
}
