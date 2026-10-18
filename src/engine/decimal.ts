/**
 * Bounded-decimal parsing into scaled integers (BigInt).
 *
 * The exact engine never uses floating-point monetary values as state keys.
 * Every percentage / R-multiple input is parsed from its decimal string into
 * an integer number of "units" at a fixed, documented scale. A value with more
 * decimal places than allowed is REJECTED rather than silently rounded.
 */

export interface ScaledDecimal {
  /** Integer value at the given scale, e.g. "0.125" at 3dp → 125n. */
  readonly units: bigint;
  /** Number of decimal places the units represent. */
  readonly scale: number;
}

const DECIMAL_RE = /^([+-])?(\d+)(?:\.(\d+))?$/;

export type DecimalParseResult =
  | { ok: true; value: ScaledDecimal }
  | { ok: false; reason: 'not-a-number' | 'too-many-decimal-places' };

/** Parse a plain decimal string ("12", "0.5", "-1.25"). No exponents, no thousands separators. */
export function parseScaledDecimal(input: string | number, maxDecimalPlaces: number): DecimalParseResult {
  const text = typeof input === 'number' ? numberToPlainString(input) : input.trim();
  if (text === null) return { ok: false, reason: 'not-a-number' };
  const m = DECIMAL_RE.exec(text);
  if (!m) return { ok: false, reason: 'not-a-number' };
  const sign = m[1] === '-' ? -1n : 1n;
  const intPart = m[2];
  let frac = m[3] ?? '';
  // Trailing zeros carry no precision; strip them before checking the limit.
  frac = frac.replace(/0+$/, '');
  if (frac.length > maxDecimalPlaces) return { ok: false, reason: 'too-many-decimal-places' };
  const padded = frac.padEnd(maxDecimalPlaces, '0');
  const units = sign * BigInt(intPart + padded);
  return { ok: true, value: { units, scale: maxDecimalPlaces } };
}

function numberToPlainString(n: number): string | null {
  if (!Number.isFinite(n)) return null;
  // Up to 15 significant decimals without exponent notation.
  const s = n.toString();
  if (/e/i.test(s)) {
    const fixed = n.toFixed(12);
    return fixed.includes('.') ? fixed.replace(/0+$/, '').replace(/\.$/, '') : fixed;
  }
  return s;
}

export function bigAbs(a: bigint): bigint {
  return a < 0n ? -a : a;
}

export function bigGcd(a: bigint, b: bigint): bigint {
  a = bigAbs(a);
  b = bigAbs(b);
  while (b !== 0n) {
    const t = a % b;
    a = b;
    b = t;
  }
  return a;
}

export function toNumberChecked(a: bigint): number {
  if (a > BigInt(Number.MAX_SAFE_INTEGER) || a < -BigInt(Number.MAX_SAFE_INTEGER)) {
    throw new RangeError('Integer state exceeds the safe integer range.');
  }
  return Number(a);
}
