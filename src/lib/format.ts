/** Formatting rules from the PropOS guideline, section 11. */

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });

/** $1,450.00 in tables and ledgers. Negative values use a minus sign. */
export function formatCurrency(value: number): string {
  return value < 0 ? `-${usd.format(Math.abs(value))}` : usd.format(value);
}

/** $128.4K / $24.6M in KPI cards and charts. */
export function formatCompactCurrency(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

/** 94.2% with one decimal in KPIs; pass digits=0 for badges. */
export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`;
}

/** "Oct 7, 2026" in tables. */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Relative time for the last 7 days ("2h ago", "Yesterday"), otherwise formatDate. */
export function formatRelative(date: Date | string, now = new Date()): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return formatDate(d);
}

/** "Expires in 23 days" / "Expired 5 days ago", with the tone the guideline prescribes. */
export function leaseCountdown(end: Date | string, now = new Date()): { label: string; tone: "neutral" | "warning" | "danger" } {
  const d = typeof end === "string" ? new Date(end) : end;
  const days = Math.ceil((d.getTime() - now.getTime()) / 86_400_000);
  if (days < 0) return { label: `Expired ${Math.abs(days)} days ago`, tone: "danger" };
  if (days < 30) return { label: `Expires in ${days} days`, tone: "danger" };
  if (days < 60) return { label: `Expires in ${days} days`, tone: "warning" };
  return { label: formatDate(d), tone: "neutral" };
}

/** Initials for avatars: "Jordan Blake" -> "JB". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

/** Empty values render as a single dash, never "N/A". */
export const EMPTY = "-";
