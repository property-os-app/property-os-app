/** tel: and mailto: links for reaching a tenant from the user's own phone or email app. No backend involved. */

/** "Grace Carter" -> "Grace"; empty -> "". */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}

/**
 * tel: link from a phone as stored (the backend doesn't check its format): digits only, a 10-digit number gets +1,
 * 11 digits starting with 1 get +, a number typed with a leading + keeps it. null when there are no digits.
 */
export function telHref(phone: string | null | undefined): string | null {
  const raw = phone?.trim() ?? "";
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (raw.startsWith("+")) return `tel:+${digits}`;
  if (digits.length === 10) return `tel:+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `tel:+${digits}`;
  return `tel:${digits}`;
}

/**
 * mailto: link with optional CC, subject and body, each encoded (spaces as %20, line breaks as %0D%0A); empty ones are
 * left out, so a plain link is just "mailto:name%40example.com". null without a To address.
 */
export function mailtoHref({ to, cc = [], subject = "", body = "" }: { to: string | null | undefined; cc?: string[]; subject?: string; body?: string }): string | null {
  if (!to?.trim()) return null;
  const params = [
    cc.length > 0 ? `cc=${cc.map(encodeURIComponent).join(",")}` : null,
    subject ? `subject=${encodeURIComponent(subject)}` : null,
    body ? `body=${encodeURIComponent(body.replace(/\r?\n/g, "\r\n"))}` : null,
  ].filter(Boolean);
  const address = `mailto:${encodeURIComponent(to.trim())}`;
  return params.length > 0 ? `${address}?${params.join("&")}` : address;
}
