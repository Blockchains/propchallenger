import { bigGcd, parseScaledDecimal, toNumberChecked } from './decimal';
import {
  INPUT_SCHEMA_VERSION,
  type FieldError,
  type ProductContext,
  type ScenarioInput,
  type ValidatedScenarioInput,
  type ValidationResult,
} from './types';

/** Documented precision and bounds. Inputs outside these are rejected, never approximated. */
export const LIMITS = {
  winRatePct: { min: 0, max: 100, dp: 4 },
  winnerR: { min: 0.001, max: 100, dp: 3 },
  loserR: { min: 0.001, max: 100, dp: 3 },
  costR: { min: 0, max: 10, dp: 3 },
  riskPct: { min: 0.001, max: 100, dp: 3 },
  startingBalance: { min: 1, max: 1_000_000_000, dp: 2 },
  targetPct: { min: 0.001, max: 1000, dp: 3 },
  maxLossPct: { min: 0.001, max: 100, dp: 3 },
  horizon: { min: 0, max: 1000, dp: 0 },
  tradesPerWeek: { min: 0.1, max: 1000, dp: 1 },
} as const;

/** Hard cap on lattice states the exact engine may evaluate (horizon ≤ 1000 ⇒ ≤ ~500k). */
export const MAX_STATE_EVALUATIONS = 600_000;
/** Lattice unit before GCD reduction: 1e-8 of starting balance (3dp percent × 3dp R). */
const BASE_UNIT_FRACTION = 1e-8;

type NumericField = keyof typeof LIMITS;

const LABELS: Record<NumericField, string> = {
  winRatePct: 'Win rate',
  winnerR: 'Average winner (R)',
  loserR: 'Average loser (R)',
  costR: 'Cost per trade (R)',
  riskPct: 'Risk per trade',
  startingBalance: 'Starting balance',
  targetPct: 'Profit target',
  maxLossPct: 'Static maximum loss',
  horizon: 'Trade horizon',
  tradesPerWeek: 'Trades per week',
};

function parseField(
  input: Partial<ScenarioInput>,
  field: NumericField,
  errors: FieldError[],
  optional = false,
): { units: bigint; value: number; text: string } | null {
  const rawValue = input[field as keyof ScenarioInput];
  const text = rawValue === undefined || rawValue === null ? '' : String(rawValue).trim();
  if (text === '') {
    if (!optional) errors.push({ field, message: `${LABELS[field]} is required.` });
    return null;
  }
  const lim = LIMITS[field];
  const parsed = parseScaledDecimal(text, lim.dp);
  if (!parsed.ok) {
    errors.push({
      field,
      message:
        parsed.reason === 'too-many-decimal-places'
          ? lim.dp === 0
            ? `${LABELS[field]} must be a whole number.`
            : `${LABELS[field]} supports at most ${lim.dp} decimal places.`
          : `${LABELS[field]} must be a plain number (for example 12.5).`,
    });
    return null;
  }
  const value = Number(parsed.value.units) / 10 ** lim.dp;
  if (value < lim.min || value > lim.max) {
    errors.push({ field, message: `${LABELS[field]} must be between ${lim.min} and ${lim.max}.` });
    return null;
  }
  return { units: parsed.value.units, value, text };
}

export function validateScenario(
  input: Partial<ScenarioInput>,
  product: ProductContext | null = null,
): ValidationResult {
  const errors: FieldError[] = [];
  const warnings: string[] = [];
  const winRate = parseField(input, 'winRatePct', errors);
  const winner = parseField(input, 'winnerR', errors);
  const loser = parseField(input, 'loserR', errors);
  const cost = parseField(input, 'costR', errors);
  const risk = parseField(input, 'riskPct', errors);
  const balance = parseField(input, 'startingBalance', errors);
  const target = parseField(input, 'targetPct', errors);
  const maxLoss = parseField(input, 'maxLossPct', errors);
  const horizon = parseField(input, 'horizon', errors);
  const tpw = parseField(input, 'tradesPerWeek', errors, true);

  if (!winRate || !winner || !loser || !cost || !risk || !balance || !target || !maxLoss || !horizon || errors.length) {
    return { ok: false, errors };
  }

  // Exact integer lattice in units of 1e-8 of the starting balance.
  const rawWin = risk.units * (winner.units - cost.units);
  const rawLoss = risk.units * (loser.units + cost.units);
  const rawTarget = target.units * 1000n;
  const rawFail = maxLoss.units * 1000n;
  let g = bigGcd(bigGcd(rawWin, rawLoss), bigGcd(rawTarget, rawFail));
  if (g === 0n) g = 1n;
  const N = Number(horizon.units);
  const winStepB = rawWin / g;
  const lossStepB = rawLoss / g;
  const targetB = rawTarget / g;
  const failB = rawFail / g;
  const maxMagnitude = [winStepB < 0n ? -winStepB : winStepB, lossStepB].reduce((a, b) => (a > b ? a : b)) * BigInt(Math.max(N, 1));
  let lattice: ValidatedScenarioInput['lattice'];
  try {
    toNumberChecked(maxMagnitude + targetB + failB);
    lattice = {
      winStep: toNumberChecked(winStepB),
      lossStep: toNumberChecked(lossStepB),
      targetUnits: toNumberChecked(targetB),
      failUnits: toNumberChecked(failB),
      unitFractionOfBalance: Number(g) * BASE_UNIT_FRACTION,
    };
  } catch {
    return { ok: false, errors: [{ field: 'scenario', message: 'This combination exceeds the exact engine’s integer range. Reduce the horizon or precision.' }] };
  }

  const p = Number(winRate.units) / 1e6;
  if (cost.value >= winner.value) {
    warnings.push('The cost per trade is at least as large as the average winner, so a winning trade does not increase P&L. The target cannot be reached under these assumptions.');
  }
  if (lattice.winStep > 0 && Math.ceil(lattice.targetUnits / lattice.winStep) > N) {
    warnings.push('Even an unbroken run of winners cannot reach the target within this trade horizon.');
  }
  if (lattice.lossStep >= lattice.failUnits) {
    warnings.push('A single losing trade reaches the static loss boundary under these assumptions.');
  }
  if (p === 0 || p === 1) {
    warnings.push(`A win rate of ${winRate.text}% is an extreme, degenerate assumption; results follow mechanically and say nothing about real trading.`);
  }

  const value: ValidatedScenarioInput = {
    __brand: 'ValidatedScenarioInput',
    schemaVersion: INPUT_SCHEMA_VERSION,
    raw: {
      winRatePct: winRate.text,
      winnerR: winner.text,
      loserR: loser.text,
      costR: cost.text,
      riskPct: risk.text,
      startingBalance: balance.text,
      targetPct: target.text,
      maxLossPct: maxLoss.text,
      horizon: horizon.text,
      tradesPerWeek: tpw ? tpw.text : null,
    },
    p,
    winnerR: winner.value,
    loserR: loser.value,
    costR: cost.value,
    riskFraction: risk.value / 100,
    startingBalance: balance.value,
    targetFraction: target.value / 100,
    maxLossFraction: maxLoss.value / 100,
    horizon: N,
    tradesPerWeek: tpw ? tpw.value : null,
    lattice,
    product,
  };
  return { ok: true, value, warnings };
}
