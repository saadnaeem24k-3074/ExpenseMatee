import type { Currency } from "./api"

// Converts an amount from one currency to another using each currency's
// rate_to_base (both rates share the same base, PKR, so we go via it).
export function convertAmount(
  amount: number,
  fromCode: string,
  toCode: string,
  currencies: Currency[]
): number {
  if (fromCode === toCode) return amount

  const from = currencies.find((c) => c.code === fromCode)
  const to = currencies.find((c) => c.code === toCode)
  if (!from || !to) return amount // unknown currency — don't guess, just pass through

  return (amount * from.rate_to_base) / to.rate_to_base
}

export function currencySymbol(code: string, currencies: Currency[]): string {
  return currencies.find((c) => c.code === code)?.symbol ?? code
}
