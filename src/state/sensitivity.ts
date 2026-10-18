import { calculateFromInput, type ExactScenarioResult, type ScenarioInput } from '../engine';

export interface Variation {
  id: string;
  label: string;
  apply: (s: ScenarioInput, amount: number) => ScenarioInput | null;
  defaultAmount: number;
  unit: string;
}

const dec = (v: number, dp = 3) => {
  const s = v.toFixed(dp);
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
};

export const VARIATIONS: Variation[] = [
  { id: 'wr-down', label: 'Lower win rate', unit: 'percentage points', defaultAmount: 5,
    apply: (s, a) => { const v = Number(s.winRatePct) - a; return v >= 0 ? { ...s, winRatePct: dec(v, 4) } : null; } },
  { id: 'winner-down', label: 'Lower average winner', unit: 'R', defaultAmount: 0.5,
    apply: (s, a) => { const v = Number(s.winnerR) - a; return v >= 0.001 ? { ...s, winnerR: dec(v) } : null; } },
  { id: 'loser-up', label: 'Increase average loser', unit: 'R', defaultAmount: 0.25,
    apply: (s, a) => ({ ...s, loserR: dec(Number(s.loserR) + a) }) },
  { id: 'cost-up', label: 'Add cost per trade', unit: 'R', defaultAmount: 0.1,
    apply: (s, a) => ({ ...s, costR: dec(Number(s.costR) + a) }) },
  { id: 'horizon-down', label: 'Reduce available trades', unit: '% of horizon', defaultAmount: 25,
    apply: (s, a) => ({ ...s, horizon: String(Math.max(0, Math.round(Number(s.horizon) * (1 - a / 100)))) }) },
  { id: 'risk-half', label: 'Halve risk per trade', unit: '', defaultAmount: 0,
    apply: (s) => { const v = Number(s.riskPct) / 2; return v >= 0.001 ? { ...s, riskPct: dec(v) } : null; } },
  { id: 'risk-double', label: 'Double risk per trade', unit: '', defaultAmount: 0,
    apply: (s) => { const v = Number(s.riskPct) * 2; return v <= 100 ? { ...s, riskPct: dec(v) } : null; } },
];

export interface VariationResult { variation: Variation; amount: number; scenario: ScenarioInput; result: ExactScenarioResult | null; error: string | null }

export function runVariations(base: ScenarioInput, amounts: Record<string, number> = {}): VariationResult[] {
  return VARIATIONS.map((v) => {
    const amount = amounts[v.id] ?? v.defaultAmount;
    const scenario = v.apply(base, amount);
    if (!scenario) return { variation: v, amount, scenario: base, result: null, error: 'Not applicable to these inputs.' };
    try {
      return { variation: v, amount, scenario, result: calculateFromInput(scenario), error: null };
    } catch (e) {
      return { variation: v, amount, scenario, result: null, error: (e as Error).message };
    }
  });
}

/** Rank the default stress variations by absolute change in target-reached probability. */
export function mostInfluential(base: ExactScenarioResult, scenario: ScenarioInput, top = 3) {
  return runVariations(scenario)
    .filter((v) => v.result && !v.variation.id.startsWith('risk-'))
    .map((v) => ({ label: v.variation.label, amount: v.amount, unit: v.variation.unit, deltaPass: v.result!.passProbability - base.passProbability, deltaFail: v.result!.failProbability - base.failProbability }))
    .sort((a, b) => Math.abs(b.deltaPass) - Math.abs(a.deltaPass))
    .slice(0, top);
}
