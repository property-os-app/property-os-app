import { toast } from "@/components/molecules";
import { copyText } from "@/lib/clipboard";

/** Copies `text` and says so: "Email copied", or how to copy it by hand. `what`: "email", "phone number", "lease number". */
export async function copyWithToast(text: string, what: string, anchor?: Element | null): Promise<void> {
  const ok = await copyText(text, anchor);
  if (ok) toast.success(`${what.charAt(0).toUpperCase()}${what.slice(1)} copied`);
  else toast.info("Couldn't copy", `Press and hold the ${what} to copy it.`);
}
