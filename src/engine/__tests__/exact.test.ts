import { describe, expect, it } from 'vitest';
import { calculateExactScenario, calculateFromInput, validateScenario, ScenarioRejectedError, type ScenarioInput } from '..';
import { bruteForce, key, rationalDp, toNum, type RefInput } from './rationalReference';

const base: ScenarioInput = {
  winRatePct: '50', winnerR: '3', loserR: '1', costR: '0', riskPct: '1',
  startingBalance: '100000', targetPct: '10', maxLossPct: '10', horizon: '10',
};
const run = (over: Partial<ScenarioInput>) => calculateFromInput({ ...base, ...over });
const ref = (over: Partial<RefInput>): RefInput => ({ p: '0.5', w: '3', l: '1', riskPct: '1', targetPct: '10', lossPct: '10', N: 10, ...over });

/**
 * Frozen exact values. Each was computed by TWO independent methods with exact
 * rational arithmetic (reference/fixtures_reference.py: rational DP over P&L
 * states AND brute-force enumeration of all 2^N paths) and is re-derived here
 * by a third, TypeScript BigInt rational implementation.
 */
const FIXTURES = {
  A: { input: { horizon: '10' }, refIn: ref({}), pass: '653/1024', fail: '1/1024', unresolved: '185/512' },
  B: { input: { horizon: '20' }, refIn: ref({ N: 20 }), pass: '956927/1048576', fail: '501/262144', unresolved: '89645/1048576' },
  C: { input: { horizon: '20', riskPct: '0.5' }, refIn: ref({ N: 20, riskPct: '0.5' }), pass: '630829/1048576', fail: '1/1048576', unresolved: '208873/524288' },
  D: { input: { winRatePct: '70', winnerR: '1' }, refIn: ref({ p: '0.7', w: '1' }), pass: '282475249/10000000000', fail: '59049/10000000000', unresolved: '4858732851/5000000000' },
  E: { input: { winRatePct: '70', winnerR: '1', riskPct: '0.5', horizon: '20' }, refIn: ref({ p: '0.7', w: '1', riskPct: '0.5', N: 20 }), pass: '79792266297612001/100000000000000000000', fail: '3486784401/100000000000000000000', unresolved: '49960103865107801799/50000000000000000000' },
  F: { input: { winRatePct: '30', winnerR: '5', horizon: '20' }, refIn: ref({ p: '0.3', w: '5', N: 20 }), pass: '799886000878553457/1000000000000000000', fail: '42490209429829/1000000000000000', unresolved: '157623789691617543/1000000000000000000' },
} as const;

const fracToNum = (s: string) => { const [n, d] = s.split('/').map(BigInt); return Number(n) / Number(d); };

describe('regression fixtures A–F', () => {
  for (const [name, fx] of Object.entries(FIXTURES)) {
    it(`fixture ${name}: engine matches frozen exact rational values`, () => {
      const r = run(fx.input);
      expect(r.passProbability).toBeCloseTo(fracToNum(fx.pass), 12);
      expect(r.failProbability).toBeCloseTo(fracToNum(fx.fail), 12);
      expect(r.unresolvedProbability).toBeCloseTo(fracToNum(fx.unresolved), 12);
    });
    it(`fixture ${name}: independent TS rational reference reproduces frozen values exactly`, () => {
      const out = rationalDp(fx.refIn);
      expect(key(out.pass)).toBe(fx.pass);
      expect(key(out.fail)).toBe(fx.fail);
      expect(key(out.unresolved)).toBe(fx.unresolved);
    });
  }

  it('fixture A equals the brief’s exact constants', () => {
    const r = run({});
    expect(r.passProbability).toBe(0.6376953125);
    expect(r.failProbability).toBe(0.0009765625);
    expect(r.unresolvedProbability).toBe(0.361328125);
  });
  it('fixtures D/E equal closed forms 0.7^N and 0.3^N', () => {
    const d = run(FIXTURES.D.input); const e = run(FIXTURES.E.input);
    expect(d.passProbability).toBeCloseTo(0.7 ** 10, 14);
    expect(d.failProbability).toBeCloseTo(0.3 ** 10, 16);
    expect(e.passProbability).toBeCloseTo(0.7 ** 20, 15);
    expect(e.failProbability).toBeCloseTo(0.3 ** 20, 20);
  });
  it('fixtures C and F agree with the brief’s approximate pass values', () => {
    expect(run(FIXTURES.C.input).passProbability).toBeCloseTo(0.60161, 5);
    expect(run(FIXTURES.F.input).passProbability).toBeCloseTo(0.79989, 5);
  });
  it('fixture B: brief’s approximate constants differ from the verified exact value by < 1e-5 (documented discrepancy)', () => {
    const r = run(FIXTURES.B.input);
    // Brief: 0.9126033783 / 0.0019054413 / 0.0854911804. Verified exact: 956927/2^20 etc.
    expect(Math.abs(r.passProbability - 0.9126033783)).toBeLessThan(1e-5);
    expect(Math.abs(r.failProbability - 0.0019054413)).toBeLessThan(1e-5);
    expect(r.passProbability).not.toBeCloseTo(0.9126033783, 9);
    expect((r.passProbability * 100).toFixed(2)).toBe('91.26');
  });
});

describe('brute-force enumeration agreement (small horizons)', () => {
  const cases: Array<[Partial<ScenarioInput>, RefInput]> = [
    [{ horizon: '12' }, ref({ N: 12 })],
    [{ winRatePct: '41.5', winnerR: '2.25', loserR: '1', riskPct: '1.5', horizon: '12' }, ref({ p: '0.415', w: '2.25', riskPct: '1.5', N: 12 })],
    [{ winRatePct: '62', winnerR: '1.2', loserR: '0.8', costR: '0.05', riskPct: '2', targetPct: '8', maxLossPct: '6', horizon: '11' }, ref({ p: '0.62', w: '1.2', l: '0.8', c: '0.05', riskPct: '2', targetPct: '8', lossPct: '6', N: 11 })],
    [{ winRatePct: '35', winnerR: '2.5', costR: '0.1', riskPct: '0.75', targetPct: '5', maxLossPct: '4', horizon: '13' }, ref({ p: '0.35', w: '2.5', c: '0.1', riskPct: '0.75', targetPct: '5', lossPct: '4', N: 13 })],
  ];
  cases.forEach(([inp, ri], idx) => {
    it(`case ${idx + 1}`, () => {
      const r = run(inp);
      const b = bruteForce(ri);
      const d = rationalDp(ri);
      expect(key(b.pass)).toBe(key(d.pass));
      expect(key(b.fail)).toBe(key(d.fail));
      expect(r.passProbability).toBeCloseTo(toNum(b.pass), 12);
      expect(r.failProbability).toBeCloseTo(toNum(b.fail), 12);
      expect(r.unresolvedProbability).toBeCloseTo(toNum(b.unresolved), 12);
    });
  });
});

describe('boundary crossing and decimal precision', () => {
  it('inclusive boundaries: landing exactly on target passes, exactly on loss boundary fails', () => {
    // 1% risk, +5R winner: two winners = exactly +10%.
    const r = run({ winRatePct: '100', winnerR: '5', horizon: '2' });
    expect(r.passProbability).toBe(1);
    expect(r.firstPassByTrade[2]).toBe(1);
    const f = run({ winRatePct: '0', horizon: '10' });
    expect(f.failProbability).toBe(1);
    expect(f.firstFailByTrade[10]).toBe(1);
  });
  it('0.1 + 0.2 style decimals do not mis-key states (naive floats would)', () => {
    // 0.1% risk × 1R steps; target 0.3% must be hit by exactly three winners.
    const r = run({ winRatePct: '100', winnerR: '1', riskPct: '0.1', targetPct: '0.3', horizon: '3' });
    expect(r.passProbability).toBe(1);
    expect(r.firstPassByTrade[3]).toBe(1);
  });
  it('rejects excess decimal precision instead of rounding', () => {
    const v = validateScenario({ ...base, riskPct: '0.12345' });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.errors[0].message).toMatch(/at most 3 decimal places/);
  });
  it('accepts trailing zeros beyond the precision limit', () => {
    expect(validateScenario({ ...base, riskPct: '1.000000' }).ok).toBe(true);
  });
});

describe('cost treatment', () => {
  it('costs reduce both winners and losers once (no double deduction)', () => {
    const r = run({ costR: '0.5', horizon: '1' });
    // net winner 2.5R → +2.5%; net loser 1.5R → −1.5%. One trade: unresolved.
    const states = r.terminalUnresolved.map((s) => Number((s.pnlFraction * 100).toFixed(6)));
    expect(states).toEqual([-1.5, 2.5]);
    expect(r.expectancyR).toBeCloseTo(0.5 * 3 - 0.5 * 1 - 0.5, 12);
    expect(r.breakevenWinRate.value).toBeCloseTo(1.5 / 4, 12);
  });
  it('positive costs never improve outcomes under otherwise identical rules', () => {
    for (const N of ['5', '10', '20', '40']) {
      const a = run({ horizon: N, winRatePct: '45' });
      const b = run({ horizon: N, winRatePct: '45', costR: '0.2' });
      expect(b.passProbability).toBeLessThanOrEqual(a.passProbability + 1e-15);
      expect(b.failProbability).toBeGreaterThanOrEqual(a.failProbability - 1e-15);
    }
  });
  it('cost ≥ winner makes the target unreachable and warns', () => {
    const r = run({ costR: '3', horizon: '20' });
    expect(r.passProbability).toBe(0);
    expect(r.conditionalMeanTradesToTarget).toBeNull();
    expect(r.conditionalMedianTradesToTarget).toBeNull();
    expect(r.warnings.join(' ')).toMatch(/cannot be reached/);
  });
  it('breakeven outside meaningful range is flagged', () => {
    const r = run({ costR: '3.5' });
    expect(r.breakevenWinRate.meaningful).toBe(false);
  });
});

describe('general invariants', () => {
  const grid: Partial<ScenarioInput>[] = [];
  for (const winRatePct of ['20', '50', '73.5']) for (const winnerR of ['0.8', '2', '5']) for (const riskPct of ['0.25', '1', '3']) grid.push({ winRatePct, winnerR, riskPct });

  it('probabilities are non-negative and sum to one', () => {
    for (const g of grid) for (const horizon of ['0', '1', '17', '60']) {
      const r = run({ ...g, horizon });
      for (const v of [r.passProbability, r.failProbability, r.unresolvedProbability]) expect(v).toBeGreaterThanOrEqual(0);
      expect(Math.abs(r.passProbability + r.failProbability + r.unresolvedProbability - 1)).toBeLessThan(1e-12);
      r.firstPassByTrade.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
      r.terminalUnresolved.forEach((s) => expect(s.probability).toBeGreaterThan(0));
    }
  });
  it('longer horizons never decrease pass/fail nor increase unresolved; series are monotone', () => {
    for (const g of grid) {
      const r = run({ ...g, horizon: '50' });
      for (let n = 1; n <= 50; n++) {
        expect(r.cumulativePassByTrade[n]).toBeGreaterThanOrEqual(r.cumulativePassByTrade[n - 1]);
        expect(r.cumulativeFailByTrade[n]).toBeGreaterThanOrEqual(r.cumulativeFailByTrade[n - 1]);
        expect(r.unresolvedByTrade[n]).toBeLessThanOrEqual(r.unresolvedByTrade[n - 1] + 1e-15);
      }
      const short = run({ ...g, horizon: '25' });
      expect(short.passProbability).toBeCloseTo(r.cumulativePassByTrade[25], 13);
      expect(short.failProbability).toBeCloseTo(r.cumulativeFailByTrade[25], 13);
    }
  });
  it('starting balance does not change probabilities in the cost-free percentage model', () => {
    for (const startingBalance of ['1', '2500', '100000', '987654.32']) {
      const r = run({ startingBalance, horizon: '20' });
      expect(r.passProbability).toBeCloseTo(fracToNum(FIXTURES.B.pass), 13);
    }
  });
  it('no universal monotonicity in risk size is asserted (counter-example exists)', () => {
    // Documented: with these inputs raising risk can raise OR lower the pass probability.
    const p = (riskPct: string, winRatePct: string) => run({ riskPct, winRatePct, horizon: '20' }).passProbability;
    expect(p('1', '50')).toBeGreaterThan(p('0.5', '50')); // more risk → higher pass here
    expect(p('4', '50')).toBeLessThan(p('2', '50')); // more risk → lower pass here
    // Higher risk also raises failure probability in this example.
    expect(run({ riskPct: '4', horizon: '20' }).failProbability).toBeGreaterThan(run({ riskPct: '1', horizon: '20' }).failProbability);
  });
});

describe('result fields and edge cases', () => {
  it('zero horizon: everything unresolved', () => {
    const r = run({ horizon: '0' });
    expect(r.unresolvedProbability).toBe(1);
    expect(r.passProbability).toBe(0);
    expect(r.conditionalMeanTradesToTarget).toBeNull();
    expect(r.expectedTradesUntilStop).toBe(0);
  });
  it('first-hit distributions sum to totals; conditional stats are coherent', () => {
    const r = run({ horizon: '20' });
    expect(r.firstPassByTrade.reduce((a, b) => a + b, 0)).toBeCloseTo(r.passProbability, 14);
    expect(r.firstFailByTrade.reduce((a, b) => a + b, 0)).toBeCloseTo(r.failProbability, 14);
    expect(r.conditionalMeanTradesToTarget!).toBeGreaterThanOrEqual(4);
    expect(r.conditionalMedianTradesToTarget!).toBeGreaterThanOrEqual(4);
    expect(r.firstPassByTrade.slice(0, 4).every((v) => v === 0)).toBe(true); // four winners needed (+12% ≥ 10%)
    expect(r.terminalUnresolved.reduce((a, s) => a + s.probability, 0)).toBeCloseTo(r.unresolvedProbability, 14);
    expect(r.expectedTradesUntilStop).toBeGreaterThan(0);
    expect(r.expectedTradesUntilStop).toBeLessThanOrEqual(20);
  });
  it('expected trades until stop matches direct definition', () => {
    const r = run({ horizon: '15' });
    let direct = 0;
    for (let n = 1; n <= 15; n++) direct += n * (r.firstPassByTrade[n] + r.firstFailByTrade[n]);
    direct += 15 * r.unresolvedProbability;
    expect(r.expectedTradesUntilStop).toBeCloseTo(direct, 12);
  });
  it('metadata is present', () => {
    const r = run({});
    expect(r.engineVersion).toBe('1.0.0');
    expect(r.method).toMatch(/exact/);
    expect(r.boundaryConvention.pass).toMatch(/≥/);
    expect(r.numerical.tolerance).toBeGreaterThan(0);
    expect(r.realProductDataUsed).toBe(false);
    expect(r.supportedAssumptions.length).toBeGreaterThan(3);
  });
  it('large horizons run within limits', () => {
    const r = run({ horizon: '1000', riskPct: '0.1', winRatePct: '40', winnerR: '1.6' });
    expect(Math.abs(r.passProbability + r.failProbability + r.unresolvedProbability - 1)).toBeLessThan(1e-9);
    expect(r.runtime.milliseconds).toBeLessThan(2000);
  });
});

describe('invalid inputs', () => {
  const bad: Array<Partial<ScenarioInput>> = [
    { winRatePct: '101' }, { winRatePct: '-1' }, { winnerR: '0' }, { loserR: '-1' }, { riskPct: '0' },
    { horizon: '1001' }, { horizon: '2.5' }, { targetPct: 'abc' }, { maxLossPct: '1e3' }, { startingBalance: '' },
  ];
  bad.forEach((b) => it(`rejects ${JSON.stringify(b)}`, () => {
    expect(validateScenario({ ...base, ...b }).ok).toBe(false);
    expect(() => run(b)).toThrow(ScenarioRejectedError);
  }));
  it('engine refuses unvalidated input', () => {
    expect(() => calculateExactScenario(base as never)).toThrow(ScenarioRejectedError);
  });
});
