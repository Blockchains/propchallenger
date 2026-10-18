import { MAX_STATE_EVALUATIONS, validateScenario } from './validate';
import {
  ENGINE_VERSION,
  EXACT_METHOD,
  ScenarioRejectedError,
  type ExactScenarioResult,
  type ScenarioInput,
  type TerminalState,
  type ValidatedScenarioInput,
} from './types';

/** Probability mass must be conserved to within this absolute tolerance. */
export const PROBABILITY_TOLERANCE = 1e-9;
/** Hard runtime budget; calculations exceeding it are rejected, not truncated. */
export const RUNTIME_BUDGET_MS = 2000;

const now = (): number =>
  typeof performance !== 'undefined' && typeof performance.now === 'function' ? performance.now() : Date.now();

/** Neumaier compensated summation for probability totals. */
function sum(values: number[]): number {
  let s = 0;
  let c = 0;
  for (const v of values) {
    const t = s + v;
    c += Math.abs(s) >= Math.abs(v) ? s - t + v : v - t + s;
    s = t;
  }
  return s + c;
}

export const SUPPORTED_ASSUMPTIONS: readonly string[] = [
  'One evaluation phase.',
  'Fixed monetary risk based on the starting balance (no compounding).',
  'Independent trades with a constant win probability.',
  'Fixed winning and losing outcomes in R.',
  'Fixed cost per completed trade, in R, deducted from both winners and losers.',
  'Static overall loss boundary measured from the starting balance.',
  'Boundaries checked on closed-trade P&L after each completed trade.',
  'A fixed maximum number of completed trades.',
];

/**
 * Exact finite-horizon calculation over a binomial lattice.
 *
 * Because each trade has exactly two fixed outcomes, the continuing P&L after n
 * trades is fully determined by the number of wins k:  S(n,k) = k·W − (n−k)·L.
 * Since W + L > 0, distinct k give distinct P&L, so merging identical states is
 * equivalent to indexing by k. States are integers (see validate.ts); only the
 * probability mass is a double, and its conservation is checked explicitly.
 */
export function calculateExactScenario(input: ValidatedScenarioInput): ExactScenarioResult {
  if (!input || input.__brand !== 'ValidatedScenarioInput') {
    throw new ScenarioRejectedError('calculateExactScenario requires a ValidatedScenarioInput (use validateScenario first).');
  }
  const started = now();
  const { p, horizon: N, lattice } = input;
  const q = 1 - p;
  const { winStep: W, lossStep: L, targetUnits: U, failUnits: F } = lattice;

  const estimatedStates = ((N + 1) * (N + 2)) / 2;
  if (estimatedStates > MAX_STATE_EVALUATIONS) {
    throw new ScenarioRejectedError(`Scenario would evaluate ${estimatedStates} lattice states; the limit is ${MAX_STATE_EVALUATIONS}.`);
  }

  // active[k] = probability of being unresolved after n trades with k wins.
  let active = new Float64Array(1);
  active[0] = 1;
  const cumulativePass = [0];
  const cumulativeFail = [0];
  const unresolvedByTrade = [1];
  const firstPass = [0];
  const firstFail = [0];
  let passAcc = 0;
  let failAcc = 0;
  let statesEvaluated = 1;
  let maxActive = 1;
  const activeMassBefore: number[] = [];

  for (let n = 0; n < N; n++) {
    activeMassBefore.push(sum(Array.from(active)));
    const next = new Float64Array(n + 2);
    const passThis: number[] = [];
    const failThis: number[] = [];
    for (let k = 0; k <= n; k++) {
      const m = active[k];
      if (m === 0) continue;
      // Winner: (n+1, k+1)
      const sWin = (k + 1) * W - (n - k) * L;
      const mWin = m * p;
      if (mWin !== 0) {
        if (sWin >= U) passThis.push(mWin);
        else if (sWin <= -F) failThis.push(mWin);
        else next[k + 1] += mWin;
      }
      // Loser: (n+1, k)
      const sLoss = k * W - (n + 1 - k) * L;
      const mLoss = m * q;
      if (mLoss !== 0) {
        if (sLoss >= U) passThis.push(mLoss);
        else if (sLoss <= -F) failThis.push(mLoss);
        else next[k] += mLoss;
      }
    }
    statesEvaluated += n + 2;
    const fp = sum(passThis);
    const ff = sum(failThis);
    passAcc += fp;
    failAcc += ff;
    firstPass.push(fp);
    firstFail.push(ff);
    cumulativePass.push(passAcc);
    cumulativeFail.push(failAcc);
    active = next;
    let nonZero = 0;
    for (const v of active) if (v !== 0) nonZero++;
    maxActive = Math.max(maxActive, nonZero);
    unresolvedByTrade.push(sum(Array.from(active)));
    if (now() - started > RUNTIME_BUDGET_MS) {
      throw new ScenarioRejectedError('Calculation exceeded the runtime budget and was stopped rather than approximated.');
    }
  }

  const passProbability = sum(firstPass);
  const failProbability = sum(firstFail);
  const unresolvedProbability = sum(Array.from(active));
  const massError = Math.abs(passProbability + failProbability + unresolvedProbability - 1);
  if (massError > PROBABILITY_TOLERANCE) {
    throw new ScenarioRejectedError(`Probability mass not conserved (error ${massError}); result rejected.`);
  }

  const unitMoney = lattice.unitFractionOfBalance * input.startingBalance;
  const terminalUnresolved: TerminalState[] = [];
  for (let k = 0; k < active.length; k++) {
    if (active[k] === 0) continue;
    const units = k * W - (N - k) * L;
    terminalUnresolved.push({
      pnlFraction: units * lattice.unitFractionOfBalance,
      pnlMoney: units * unitMoney,
      wins: k,
      losses: N - k,
      probability: active[k],
    });
  }
  terminalUnresolved.sort((a, b) => a.pnlFraction - b.pnlFraction);

  // E[min(tau, N)] = Σ_{n=0}^{N-1} P(still active after n trades)
  const expectedTradesUntilStop = sum(activeMassBefore);

  let conditionalMean: number | null = null;
  let conditionalMedian: number | null = null;
  if (passProbability > 0) {
    conditionalMean = sum(firstPass.map((v, n) => v * n)) / passProbability;
    const half = passProbability / 2;
    for (let n = 1; n <= N; n++) {
      if (cumulativePass[n] >= half - 1e-15) {
        conditionalMedian = n;
        break;
      }
    }
  }

  const { winnerR: w, loserR: l, costR: c } = input;
  const expectancyR = p * w - (1 - p) * l - c;
  const breakevenValue = (l + c) / (w + l);
  const meaningful = breakevenValue >= 0 && breakevenValue <= 1;

  const warnings: string[] = [];
  if (input.horizon === 0) warnings.push('A horizon of zero trades leaves every path unresolved.');
  if (passProbability === 0 && input.horizon > 0) {
    warnings.push('No modelled path reaches the target within the horizon, so conditional time-to-target statistics are undefined.');
  }

  return {
    engineVersion: ENGINE_VERSION,
    method: EXACT_METHOD,
    methodDescription:
      'Exact finite-horizon dynamic programme over integer P&L states (indexed by trade count and number of wins). States are exact integers; probability mass is IEEE-754 double precision with an explicit conservation check.',
    boundaryConvention: {
      pass: 'Passed when closed-trade P&L ≥ profit target (inclusive).',
      fail: 'Failed when closed-trade P&L ≤ −static maximum loss (inclusive).',
      evaluation: 'Checked after each completed trade; a path stops at the first boundary reached. Paths that reach neither by the horizon are unresolved.',
    },
    input,
    passProbability,
    failProbability,
    unresolvedProbability,
    cumulativePassByTrade: cumulativePass,
    cumulativeFailByTrade: cumulativeFail,
    unresolvedByTrade,
    firstPassByTrade: firstPass,
    firstFailByTrade: firstFail,
    terminalUnresolved,
    expectedTradesUntilStop,
    conditionalMeanTradesToTarget: conditionalMean,
    conditionalMedianTradesToTarget: conditionalMedian,
    expectancyR,
    expectancyMoney: expectancyR * input.riskFraction * input.startingBalance,
    breakevenWinRate: {
      value: breakevenValue,
      meaningful,
      note: meaningful
        ? 'Win rate at which net expectancy per trade is zero under these winner, loser and cost assumptions.'
        : 'Outside the meaningful 0–100% range: no win rate makes net expectancy non-negative under these assumptions.',
    },
    supportedAssumptions: [...SUPPORTED_ASSUMPTIONS],
    unsupportedRules: input.product ? [...input.product.unsupportedRules] : [],
    realProductDataUsed: input.product ? !input.product.illustrative : false,
    sourceVersionIds: input.product ? [...input.product.sourceVersionIds] : [],
    warnings,
    numerical: {
      tolerance: PROBABILITY_TOLERANCE,
      probabilityMassError: massError,
      representation:
        'Inputs parsed as bounded decimals into integer units of 1e-8 of starting balance, reduced by their greatest common divisor; probabilities as doubles with compensated summation.',
    },
    runtime: {
      milliseconds: now() - started,
      latticeStatesEvaluated: statesEvaluated,
      maxActiveStates: maxActive,
    },
  };
}

/** Convenience: validate then calculate. Throws ScenarioRejectedError with all validation messages. */
export function calculateFromInput(input: Partial<ScenarioInput>): ExactScenarioResult {
  const v = validateScenario(input);
  if (!v.ok) throw new ScenarioRejectedError(v.errors.map((e) => e.message).join(' '));
  const r = calculateExactScenario(v.value);
  r.warnings.unshift(...v.warnings);
  return r;
}
