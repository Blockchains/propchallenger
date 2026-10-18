/**
 * INDEPENDENT reference implementation used only by tests.
 *
 * Deliberately different from the production engine:
 *  - exact rational probabilities (BigInt numerator/denominator), no floats;
 *  - P&L states are rational fractions of balance held in a Map keyed by
 *    canonical "num/den" strings (not a wins-indexed lattice);
 *  - a separate brute-force path enumerator for small horizons.
 */
export interface Rat { n: bigint; d: bigint }

const gcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a; b = b < 0n ? -b : b;
  while (b) [a, b] = [b, a % b];
  return a;
};
export const rat = (n: bigint, d = 1n): Rat => {
  if (d < 0n) { n = -n; d = -d; }
  const g = gcd(n, d) || 1n;
  return { n: n / g, d: d / g };
};
export const add = (a: Rat, b: Rat) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
export const sub = (a: Rat, b: Rat) => rat(a.n * b.d - b.n * a.d, a.d * b.d);
export const mul = (a: Rat, b: Rat) => rat(a.n * b.n, a.d * b.d);
export const cmp = (a: Rat, b: Rat) => { const x = a.n * b.d - b.n * a.d; return x > 0n ? 1 : x < 0n ? -1 : 0; };
export const key = (a: Rat) => `${a.n}/${a.d}`;
export const toNum = (a: Rat) => Number(a.n) / Number(a.d);
export function dec(s: string): Rat {
  const [i, f = ''] = s.split('.');
  return rat(BigInt(i + f), 10n ** BigInt(f.length));
}

export interface RefInput { p: string; w: string; l: string; c?: string; riskPct: string; targetPct: string; lossPct: string; N: number }
export interface RefOutput { pass: Rat; fail: Rat; unresolved: Rat }

export function rationalDp(i: RefInput): RefOutput {
  const p = dec(i.p); const q = sub(rat(1n), p);
  const r = mul(dec(i.riskPct), rat(1n, 100n));
  const c = dec(i.c ?? '0');
  const win = mul(r, sub(dec(i.w), c));
  const loss = mul(r, add(dec(i.l), c));
  const U = mul(dec(i.targetPct), rat(1n, 100n));
  const L = mul(dec(i.lossPct), rat(-1n, 100n));
  let act = new Map<string, { s: Rat; m: Rat }>([[key(rat(0n)), { s: rat(0n), m: rat(1n) }]]);
  let pass = rat(0n); let fail = rat(0n);
  for (let t = 0; t < i.N; t++) {
    const nxt = new Map<string, { s: Rat; m: Rat }>();
    for (const { s, m } of act.values()) {
      for (const [d, pr] of [[win, p], [rat(-loss.n, loss.d), q]] as const) {
        const s2 = add(s, d); const m2 = mul(m, pr);
        if (cmp(s2, U) >= 0) pass = add(pass, m2);
        else if (cmp(s2, L) <= 0) fail = add(fail, m2);
        else {
          const k = key(s2); const e = nxt.get(k);
          nxt.set(k, { s: s2, m: e ? add(e.m, m2) : m2 });
        }
      }
    }
    act = nxt;
  }
  let unresolved = rat(0n);
  for (const { m } of act.values()) unresolved = add(unresolved, m);
  return { pass, fail, unresolved };
}

/** Enumerates all 2^N full-length outcome sequences. Only for N ≤ ~14. */
export function bruteForce(i: RefInput): RefOutput {
  const p = dec(i.p); const q = sub(rat(1n), p);
  const r = mul(dec(i.riskPct), rat(1n, 100n));
  const c = dec(i.c ?? '0');
  const win = mul(r, sub(dec(i.w), c));
  const loss = mul(r, add(dec(i.l), c));
  const U = mul(dec(i.targetPct), rat(1n, 100n));
  const L = mul(dec(i.lossPct), rat(-1n, 100n));
  let pass = rat(0n), fail = rat(0n), unresolved = rat(0n);
  for (let mask = 0; mask < 1 << i.N; mask++) {
    let s = rat(0n); let prob = rat(1n); let outcome: 'p' | 'f' | 'u' = 'u';
    for (let t = 0; t < i.N; t++) {
      const isWin = (mask >> t) & 1;
      prob = mul(prob, isWin ? p : q);
      if (outcome === 'u') {
        s = isWin ? add(s, win) : sub(s, loss);
        if (cmp(s, U) >= 0) outcome = 'p';
        else if (cmp(s, L) <= 0) outcome = 'f';
      }
    }
    if (outcome === 'p') pass = add(pass, prob);
    else if (outcome === 'f') fail = add(fail, prob);
    else unresolved = add(unresolved, prob);
  }
  return { pass, fail, unresolved };
}
