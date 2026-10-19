import { centsToAmount, formatCurrency, toCents, type MoneyInput } from "@/lib/format";

/** "$1,200.00", or "Credit $150.00" when the balance is negative (overpaid). */
export function balanceText(value: MoneyInput): string {
  const cents = toCents(value);
  return cents < 0 ? `Credit ${formatCurrency(centsToAmount(-cents))}` : formatCurrency(value);
}
