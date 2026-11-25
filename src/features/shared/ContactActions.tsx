import { Copy, Mail, Phone } from "lucide-react";
import { LinkButton } from "@/components/atoms";
import { KebabMenu, type MenuItem } from "@/components/molecules";
import { mailtoHref, telHref } from "@/lib/contact";
import { copyWithToast } from "@/features/shared/copyToast";

export interface ContactActionsProps {
  /** Whose phone and email ("Call Grace Carter"). */
  name: string;
  phone: string | null | undefined;
  email: string | null | undefined;
}

/**
 * `ContactLink` as icon buttons: call (tel:), email (mailto:) and a ⋮ menu to copy them, for computers without a phone or
 * email app. What is missing is left out; a phone without digits can only be copied. 44px on phones.
 * `pointer-events-auto relative` lets it sit on top of a row's stretched button. Nothing without a phone and email.
 */
export function ContactActions({ name, phone, email }: ContactActionsProps) {
  const phoneText = phone?.trim() ?? "";
  const emailText = email?.trim() ?? "";
  const tel = telHref(phoneText);
  const mailto = mailtoHref({ to: emailText });

  const copyItems: MenuItem[] = [];
  if (phoneText) copyItems.push({ label: "Copy phone number", icon: <Copy strokeWidth={1.5} />, onSelect: () => void copyWithToast(phoneText, "phone number") });
  if (emailText) copyItems.push({ label: "Copy email", icon: <Copy strokeWidth={1.5} />, onSelect: () => void copyWithToast(emailText, "email") });
  if (copyItems.length === 0) return null;

  return (
    <div className="pointer-events-auto relative flex shrink-0 items-center gap-1">
      {tel && (
        <LinkButton href={tel} variant="ghost" size="sm" iconOnly aria-label={`Call ${name}`} title={`Call ${phoneText}`} className="max-md:size-11">
          <Phone size={16} strokeWidth={1.5} aria-hidden />
        </LinkButton>
      )}
      {mailto && (
        <LinkButton href={mailto} variant="ghost" size="sm" iconOnly aria-label={`Email ${name}`} title={`Email ${emailText}`} className="max-md:size-11">
          <Mail size={16} strokeWidth={1.5} aria-hidden />
        </LinkButton>
      )}
      <KebabMenu label={`Copy contact details of ${name}`} items={copyItems} />
    </div>
  );
}
