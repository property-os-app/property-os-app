import { useState, type Ref } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button, Input, type InputProps } from "@/components/atoms";
import { cn } from "@/lib/cn";

/** Design system Input (type password) with a small ghost eye button that shows or hides the text. Accepts `invalid` from FormField. */
export function PasswordInput({ className, ref, ...props }: Omit<InputProps, "type"> & { ref?: Ref<HTMLInputElement> }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input ref={ref} type={visible ? "text" : "password"} className={cn("pr-11", className)} {...props} />
      <Button
        variant="ghost"
        size="sm"
        iconOnly
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-1 top-1"
        icon={visible ? <EyeOff size={16} strokeWidth={1.5} /> : <Eye size={16} strokeWidth={1.5} />}
      />
    </div>
  );
}
