import { useGlobalSettings } from "@/components/providers/global-settings-provider";
import { formatCurrency } from "@/utils/calculations";

/**
 * Returns a formatCurrency function pre-bound to the global currency symbol.
 * Use this in React components instead of importing formatCurrency directly.
 *
 * @example
 * const fmt = useCurrencyFormatter();
 * fmt(5000) // "৳5,000" or "$5,000" depending on settings
 */
export function useCurrencyFormatter() {
  const { currencySymbol } = useGlobalSettings();
  return (amount: number) => formatCurrency(amount, currencySymbol);
}
