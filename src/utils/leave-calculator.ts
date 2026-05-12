/**
 * Calculates pro-rata leave based on joining date and annual standard.
 * Logic uses "Nearest Month" for grace period:
 * - Join on or before the 15th: Full month included.
 * - Join after the 15th: Month excluded.
 * Rounds to the nearest whole number.
 */
export function calculateProRataLeave(
  joiningDate: Date,
  targetYear: number,
  annualAllowance: number
): number {
  const joinYear = joiningDate.getFullYear();
  const joinMonth = joiningDate.getMonth(); // 0-indexed
  const joinDay = joiningDate.getDate();

  // 1. If joined BEFORE target year, they get full allowance
  if (joinYear < targetYear) {
    return annualAllowance;
  }

  // 2. If joining AFTER target year, they get zero
  if (joinYear > targetYear) {
    return 0;
  }

  // 3. If joining DURING target year, calculate pro-rata
  // Nearest Month Logic:
  const effectiveJoinMonth = joinDay > 15 ? joinMonth + 1 : joinMonth;
  const monthsRemaining = Math.max(0, 12 - effectiveJoinMonth);

  const rawAllowance = (annualAllowance / 12) * monthsRemaining;
  return Math.round(rawAllowance);
}
