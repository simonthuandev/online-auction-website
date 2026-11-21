/**
 * Money utilities for VND currency.
 *
 * Backend Rule:
 * All currency values are non-negative integer VND strings (pattern: ^(0|[1-9][0-9]{0,15})$).
 * Never use JavaScript floating-point `number` for monetary calculation to prevent precision loss.
 * Always compute using `BigInt` and return strings for API communication.
 */

export type VndInput = string | bigint | number;

const VND_PATTERN = /^(0|[1-9][0-9]{0,15})$/;

/**
 * Safely parse any valid VND representation to a BigInt.
 * Throws TypeError / RangeError if value is invalid or negative.
 */
export function toBigInt(value: VndInput): bigint {
  if (typeof value === 'bigint') {
    if (value < 0n) throw new RangeError('VND amount cannot be negative');
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError('VND amount must be a finite non-negative number');
    }
    return BigInt(Math.trunc(value));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!VND_PATTERN.test(trimmed)) {
      throw new Error(`Invalid VND string format: "${value}". Expected digits matching ^(0|[1-9][0-9]{0,15})$`);
    }
    return BigInt(trimmed);
  }

  throw new TypeError(`Cannot convert value of type ${typeof value} to BigInt VND`);
}

/**
 * Validates whether a given string is a strictly valid VND integer string as required by the backend.
 */
export function isValidVnd(value: string): boolean {
  if (typeof value !== 'string') return false;
  return VND_PATTERN.test(value.trim());
}

/**
 * Checks if the amount is strictly positive (> 0).
 */
export function isPositiveVnd(value: VndInput): boolean {
  try {
    return toBigInt(value) > 0n;
  } catch {
    return false;
  }
}

/**
 * Format VND amount into human-readable Vietnamese currency string (e.g. "1.500.000 ₫").
 * Uses BigInt string manipulation so no precision is ever lost.
 */
export function formatVnd(
  amount: VndInput,
  options: { suffix?: string; spaceBeforeSuffix?: boolean } = {}
): string {
  try {
    const bi = toBigInt(amount);
    const suffix = options.suffix ?? '₫';
    const space = options.spaceBeforeSuffix ?? true ? ' ' : '';

    // Standard Vietnamese grouping using dot '.' as thousands separator
    const raw = bi.toString();
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${formatted}${space}${suffix}`.trim();
  } catch {
    return '0 ₫';
  }
}

/**
 * Compare two VND amounts.
 * Returns:
 *  -1 if a < b
 *   0 if a == b
 *   1 if a > b
 */
export function compareVnd(a: VndInput, b: VndInput): number {
  const biA = toBigInt(a);
  const biB = toBigInt(b);

  if (biA < biB) return -1;
  if (biA > biB) return 1;
  return 0;
}

/**
 * Add two VND amounts, returning the resulting string for API requests.
 */
export function addVnd(a: VndInput, b: VndInput): string {
  const sum = toBigInt(a) + toBigInt(b);
  return sum.toString();
}

/**
 * Subtract b from a (a - b). Throws if result is negative.
 */
export function subtractVnd(a: VndInput, b: VndInput): string {
  const diff = toBigInt(a) - toBigInt(b);
  if (diff < 0n) {
    throw new RangeError('VND subtraction resulted in a negative amount');
  }
  return diff.toString();
}

/**
 * Multiply a VND amount by an integer multiplier (e.g., 2, 5 steps).
 */
export function multiplyVnd(amount: VndInput, multiplier: number | bigint): string {
  const multBi = typeof multiplier === 'bigint' ? multiplier : BigInt(Math.trunc(multiplier));
  if (multBi < 0n) {
    throw new RangeError('Multiplier cannot be negative');
  }
  const result = toBigInt(amount) * multBi;
  return result.toString();
}
