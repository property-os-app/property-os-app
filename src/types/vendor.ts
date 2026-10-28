/** Types for the vendor endpoints. Source: ../property-os-api/docs/frontend-handoff/API.md section 4 ("Vendor", "Catalog items") and section 5 ("Vendors"). */

export type VendorRateUnit = "HOUR" | "VISIT" | "MONTH" | "JOB";

/** Computed by the server on read (UTC day): NONE no date · EXPIRED before today · EXPIRING today to today + 30 days · VALID later. */
export type VendorInsuranceStatus = "NONE" | "EXPIRED" | "EXPIRING" | "VALID";

/** GET /vendors/trades (catalog order). */
export interface VendorTrade {
  key: string;
  label: string;
}

/** GET /vendors (one row), GET /vendors/:id and every vendor write. */
export interface Vendor {
  id: string;
  /** Unique ignoring case, archived vendors too. */
  name: string;
  /** A key from GET /vendors/trades. */
  trade: string;
  contactName: string | null;
  phone: string | null;
  /** Lowercase. */
  email: string | null;
  /** Free text. */
  serviceArea: string | null;
  licenseNumber: string | null;
  insuranceProvider: string | null;
  insurancePolicyNumber: string | null;
  notes: string | null;
  /** Money string, set together with rateUnit. */
  rateAmount: string | null;
  rateUnit: VendorRateUnit | null;
  /** "YYYY-MM-DD". */
  insuranceExpiresOn: string | null;
  insuranceStatus: VendorInsuranceStatus;
  /** ISO timestamp; null = active. */
  archivedAt: string | null;
  /** Expenses that use it, voided ones too (delete needs 0). */
  expenseCount: number;
  createdById: string;
  createdBy: { id: string; name: string };
  /** ISO timestamps. */
  createdAt: string;
  updatedAt: string;
}

/** POST /vendors body. rateAmount (a number, max 2 decimals) and rateUnit: both or neither. */
export interface VendorCreateBody {
  name: string;
  trade: string;
  contactName?: string;
  phone?: string;
  email?: string;
  serviceArea?: string;
  licenseNumber?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  rateAmount?: number;
  rateUnit?: VendorRateUnit;
  /** "YYYY-MM-DD". */
  insuranceExpiresOn?: string;
  notes?: string;
}

/** PATCH /vendors/:id body: any POST field; null clears every field except name and trade. */
export interface VendorUpdateBody {
  name?: string;
  trade?: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  serviceArea?: string | null;
  licenseNumber?: string | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  rateAmount?: number | null;
  rateUnit?: VendorRateUnit | null;
  insuranceExpiresOn?: string | null;
  notes?: string | null;
}
