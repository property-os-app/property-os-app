/** Types for the tenants endpoints. Source: docs/API.md sections 2 and 4 ("Tenant", "TenantDetail", "TenantListItem"). */
import type { UserRole } from "@/types/auth";

export type TenantType = "INDIVIDUAL" | "COMPANY";

export type ContactMethod = "EMAIL" | "PHONE" | "SMS";

/** POST /tenants and PATCH /tenants/:id answers (no createdBy). */
export interface Tenant {
  id: string;
  /** Set only for self-registered tenants. */
  userId: string | null;
  fullName: string;
  /** Always lowercase. */
  email: string;
  phone: string;
  idNumber: string | null;
  address: string | null;
  tenantType: TenantType;
  /** ISO timestamp ("YYYY-MM-DDT00:00:00.000Z"); read the first 10 characters for the date. */
  moveInDate: string | null;
  preferredContactMethod: ContactMethod;
  notes: string | null;
  createdById: string;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
}

/** Who added the tenant. */
export interface TenantCreatedBy {
  id: string;
  email: string;
  role: UserRole;
}

/** GET /tenants/:id: Tenant + createdBy. The only shape with idNumber that the UI shows. */
export interface TenantDetail extends Tenant {
  createdBy: TenantCreatedBy;
}

/** One row of GET /tenants: TenantDetail without idNumber. Newest first. */
export type TenantListItem = Omit<TenantDetail, "idNumber">;

/** POST /tenants body. Text is trimmed by the form; moveInDate is "YYYY-MM-DD". */
export interface TenantCreateBody {
  fullName: string;
  email: string;
  phone: string;
  idNumber?: string;
  address?: string;
  tenantType?: TenantType;
  moveInDate?: string;
  preferredContactMethod?: ContactMethod;
  notes?: string;
}

/** PATCH /tenants/:id body: any subset. Only idNumber, address, moveInDate and notes may be null (clears them). */
export type TenantUpdateBody = Partial<Omit<TenantCreateBody, "idNumber" | "address" | "moveInDate" | "notes">> & {
  idNumber?: string | null;
  address?: string | null;
  moveInDate?: string | null;
  notes?: string | null;
};
