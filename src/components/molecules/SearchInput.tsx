import { Search } from "lucide-react";
import { Input, type InputProps } from "@/components/atoms/Input";
import { Kbd } from "@/components/atoms/Input";
import { cn } from "@/lib/cn";

export interface SearchInputProps extends Omit<InputProps, "type"> {
  /** Show a keyboard shortcut hint on the right (global search uses ⌘K). */
  shortcut?: string;
  containerClassName?: string;
}

export function SearchInput({ shortcut, containerClassName, className, "aria-label": ariaLabel, placeholder, ...props }: SearchInputProps) {
  return (
    <label className={cn("relative block w-full max-w-[360px] flex-1", containerClassName)}>
      <span className="sr-only">{ariaLabel ?? placeholder ?? "Search"}</span>
      <Search aria-hidden size={16} strokeWidth={1.5} className="absolute left-3 top-3 text-text-muted" />
      <Input type="search" placeholder={placeholder} className={cn("pl-9", shortcut && "pr-12", className)} {...props} />
      {shortcut && <Kbd className="absolute right-2.5 top-[11px]">{shortcut}</Kbd>}
    </label>
  );
}
