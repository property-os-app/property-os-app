/** The "Call" and "Email reminder" links for an overdue lease, used by the lease page and the Rent Roll menu. */
import { firstName, mailtoHref, telHref } from "@/lib/contact";
import { daysSince, formatCurrency, formatDate, type MoneyInput } from "@/lib/format";
import { plural } from "@/lib/labels";

export interface RentReminderInput {
  tenantName: string;
  /** Primary tenant: the To address. */
  email: string | null | undefined;
  /** Co-tenants' emails (CC). */
  cc?: string[];
  phone: string | null | undefined;
  propertyName: string;
  unitNumber: string;
  balance: MoneyInput;
  /** oldestUnpaidDueDate: the due date in the text and the start of the day count. */
  dueDate: string;
  /** The signed-in user's name, for the signature. */
  senderName: string;
}

export interface RentReminderLinks {
  /** "Grace". */
  firstName: string;
  /** null when the tenant has no phone: hide Call. */
  tel: string | null;
  /** null when the tenant has no email: hide Email reminder. */
  mailto: string | null;
}

/** Subject "Rent reminder – Maple Court 4B" and the reminder body; the day count is the one the screens show (`daysSince`). */
export function rentReminderLinks(p: RentReminderInput): RentReminderLinks {
  const name = firstName(p.tenantName);
  const place = `${p.propertyName} ${p.unitNumber}`;
  const body = [
    `Hi ${name},`,
    "",
    `This is a friendly reminder that your rent balance of ${formatCurrency(p.balance)} for ${place} is ${plural(daysSince(p.dueDate), "day")} overdue (due ${formatDate(p.dueDate)}).`,
    "",
    "Please pay as soon as you can, or reply to this email if you have any questions.",
    "",
    "Thank you,",
    p.senderName,
  ].join("\n");
  return {
    firstName: name,
    tel: telHref(p.phone),
    mailto: mailtoHref({ to: p.email, cc: p.cc, subject: `Rent reminder – ${place}`, body }),
  };
}
