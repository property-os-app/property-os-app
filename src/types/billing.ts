/** Types for automatic rent billing. Source: ../property-os-api/docs/frontend-handoff/API.md sections 4 ("BillingSettings", "BillingRunResponse") and 5 ("Billing"). */

/** GET / PATCH /settings/billing (OWNER). */
export interface BillingSettings {
  /** Whole number 1–28 (14 until the Owner changes it): rent is billed this many days before each lease's due date. */
  billingLeadDays: number;
}

/** One charge a billing run created. */
export interface BilledCharge {
  id: string;
  invoiceNumber: string;
  leaseId: string;
  leaseNumber: string;
  /** "YYYY-MM". */
  periodMonth: string;
  /** "YYYY-MM-DD". */
  dueDate: string;
  /** Money string. */
  amount: string;
}

/** POST /settings/billing/run answer (the same as the daily job). */
export interface BillingRunResponse {
  /** The run's day (UTC), "YYYY-MM-DD". */
  today: string;
  billingLeadDays: number;
  /** today + billingLeadDays: rent due up to this day is billed. */
  billThrough: string;
  /** Always two "YYYY-MM": the current and the next month. */
  months: string[];
  created: number;
  /** Counted per lease and month, only for ACTIVE leases whose term overlaps the month. */
  skipped: {
    /** A non-voided RENT charge for that month already exists. */
    existing: number;
    /** Due after billThrough; a later run bills it. */
    notYetDue: number;
    /** The lease isn't MONTHLY. */
    nonMonthly: number;
    /** The month's due date is outside the lease term. */
    outsideTerm: number;
  };
  charges: BilledCharge[];
}
