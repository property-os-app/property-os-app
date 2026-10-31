import { useRef, type KeyboardEvent } from "react";
import { Star } from "lucide-react";
import { Dash } from "@/components/atoms";
import { cn } from "@/lib/cn";

const STARS = [1, 2, 3, 4, 5] as const;
const starLabel = (n: number) => `${n} ${n === 1 ? "star" : "stars"}`;

/** "★ 4.7 (3 ratings)": a vendor's average, or Dash when not rated yet. `compact` drops the count's word: "(3)". */
export function RatingText({ rating, count, compact, className }: { rating: number | null; count?: number; compact?: boolean; className?: string }) {
  if (rating === null) return <Dash />;
  const countText = count === undefined ? null : compact ? `(${count})` : `(${count} ${count === 1 ? "rating" : "ratings"})`;
  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap tabular", className)}
      aria-label={`Rated ${rating.toFixed(1)} out of 5${count === undefined ? "" : `, ${count} ${count === 1 ? "rating" : "ratings"}`}`}
    >
      <Star aria-hidden size={14} strokeWidth={1.5} className="fill-current text-warning" />
      <span className="font-semibold text-text-primary">{rating.toFixed(1)}</span>
      {countText && <span className="text-text-secondary">{countText}</span>}
    </span>
  );
}

/** Five stars, the first `value` filled: one ticket's rating (read only). */
export function RatingStars({ value, className }: { value: number; className?: string }) {
  return (
    <span role="img" aria-label={`${starLabel(value)} out of 5`} className={cn("inline-flex items-center gap-0.5", className)}>
      {STARS.map((n) => (
        <Star key={n} aria-hidden size={16} strokeWidth={1.5} className={n <= value ? "fill-current text-warning" : "text-text-muted"} />
      ))}
    </span>
  );
}

export interface RatingInputProps {
  /** 1–5, or null for no rating. */
  value: number | null;
  onChange: (value: number) => void;
  /** Accessible name of the group, e.g. "Vendor rating". */
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
  /** Set by FormField: announced as aria-invalid (the stars have no error look of their own). */
  invalid?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * 1–5 star picker as a radio group: each star is a radio named "1 star" … "5 stars". One tab stop (the picked star, else
 * the first); Arrow Right / Up picks the next, Arrow Left / Down the previous, Home / End the first / last; Space or Enter
 * picks the focused star. 44px tap targets with a visible keyboard focus ring.
 */
export function RatingInput({ value, onChange, invalid, disabled, className, ...aria }: RatingInputProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const tabStop = value ?? 1;

  const pick = (n: number) => {
    onChange(n);
    refs.current[n - 1]?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, n: number) => {
    const next = { ArrowRight: n + 1, ArrowUp: n + 1, ArrowLeft: n - 1, ArrowDown: n - 1, Home: 1, End: 5 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    pick(Math.min(5, Math.max(1, next)));
  };

  return (
    <div
      role="radiogroup"
      {...aria}
      aria-disabled={disabled || undefined}
      aria-invalid={invalid || undefined}
      className={cn("inline-flex items-center", className)}
    >
      {STARS.map((n) => {
        const checked = value === n;
        return (
          <button
            key={n}
            ref={(el) => {
              refs.current[n - 1] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={starLabel(n)}
            tabIndex={n === tabStop ? 0 : -1}
            disabled={disabled}
            onClick={() => pick(n)}
            onKeyDown={(e) => onKeyDown(e, n)}
            className="inline-flex size-11 items-center justify-center rounded-control text-text-muted transition-colors duration-fast hover:text-warning focus-visible:focus-ring-tight disabled:opacity-50"
          >
            <Star aria-hidden size={24} strokeWidth={1.5} className={value !== null && n <= value ? "fill-current text-warning" : undefined} />
          </button>
        );
      })}
    </div>
  );
}
