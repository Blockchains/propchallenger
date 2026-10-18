import type { ExactScenarioResult, ScenarioInput } from '../engine';
import { formatProbability } from '../engine';

/** Worked example from the brief (hypothetical; not historical performance). */
export const WORKED_EXAMPLE: ScenarioInput = {
  winRatePct: '50',
  winnerR: '3',
  loserR: '1',
  costR: '0',
  riskPct: '1',
  startingBalance: '100000',
  targetPct: '10',
  maxLossPct: '10',
  horizon: '20',
  tradesPerWeek: '',
};

/** Neutral starting point for "Build my scenario": values a user is expected to replace. */
export const BLANK_SCENARIO: ScenarioInput = { ...WORKED_EXAMPLE };

export const FIELD_KEYS: (keyof ScenarioInput)[] = [
  'winRatePct', 'winnerR', 'loserR', 'costR', 'riskPct', 'startingBalance', 'targetPct', 'maxLossPct', 'horizon', 'tradesPerWeek',
];
const SHORT: Record<keyof ScenarioInput, string> = {
  winRatePct: 'wr', winnerR: 'w', loserR: 'l', costR: 'c', riskPct: 'r', startingBalance: 'b', targetPct: 't', maxLossPct: 'd', horizon: 'n', tradesPerWeek: 'tpw',
};
const SAFE_VALUE = /^-?\d{0,10}(\.\d{0,6})?$/;

/** Share links contain model inputs only — never email, uploads or account data. */
export function encodeScenario(s: ScenarioInput, productVersionId?: string | null): string {
  const params = new URLSearchParams();
  for (const k of FIELD_KEYS) {
    const v = (s[k] ?? '').trim();
    if (v !== '') params.set(SHORT[k], v);
  }
  if (productVersionId) params.set('pv', productVersionId);
  return params.toString();
}

export function decodeScenario(search: string): { scenario: ScenarioInput; productVersionId: string | null } | null {
  const params = new URLSearchParams(search);
  if (!params.has(SHORT.winRatePct)) return null;
  const out: ScenarioInput = { ...WORKED_EXAMPLE };
  for (const k of FIELD_KEYS) {
    const v = params.get(SHORT[k]);
    if (v !== null && SAFE_VALUE.test(v)) out[k] = v;
  }
  const pv = params.get('pv');
  return { scenario: out, productVersionId: pv && /^[a-z0-9@-]{1,80}$/.test(pv) ? pv : null };
}

const STORAGE_KEY = 'propchallenger.savedScenarios.v1';
export interface SavedScenario { id: string; title: string; savedAt: string; scenario: ScenarioInput; productVersionId: string | null }

export function loadSaved(storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage): SavedScenario[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, 50) : [];
  } catch {
    return [];
  }
}
export function persistSaved(list: SavedScenario[], storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage): void {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50))); } catch { /* storage unavailable */ }
}

/** Neutralise spreadsheet formula injection in exported CSV cells. */
export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const EDUCATIONAL_STATEMENT =
  'Educational model only. This is not a forecast of real-world performance, a trading signal, investment advice or a guarantee. The model does not include every rule of a real challenge.';

export function resultToCsv(r: ExactScenarioResult, generatedAt = new Date()): string {
  const i = r.input.raw;
  const rows: [string, unknown][] = [
    ['Generated', generatedAt.toISOString()],
    ['Engine version', r.engineVersion],
    ['Method', r.method],
    ['Win rate (%)', i.winRatePct], ['Winner (R)', i.winnerR], ['Loser (R)', i.loserR], ['Cost per trade (R)', i.costR],
    ['Risk per trade (% of starting balance)', i.riskPct], ['Starting balance', i.startingBalance],
    ['Profit target (%)', i.targetPct], ['Static maximum loss (%)', i.maxLossPct], ['Trade horizon (trades)', i.horizon],
    ['Target reached within horizon', r.passProbability], ['Loss boundary reached within horizon', r.failProbability], ['Still running at horizon', r.unresolvedProbability],
    ['Target reached (display)', formatProbability(r.passProbability)], ['Loss boundary reached (display)', formatProbability(r.failProbability)], ['Still running (display)', formatProbability(r.unresolvedProbability)],
    ['Net expectancy per trade (R)', r.expectancyR],
    ['Conditional mean trades to target', r.conditionalMeanTradesToTarget ?? 'Undefined'],
    ['Conditional median trades to target', r.conditionalMedianTradesToTarget ?? 'Undefined'],
    ['Unsupported rules', r.unsupportedRules.join('; ') || 'None declared (custom scenario)'],
    ['Product version', r.input.product?.productVersionId ?? 'None (custom scenario)'],
    ['Source snapshots', r.sourceVersionIds.join('; ') || 'None'],
    ['Disclosure', 'No commercial relationship affects this calculation.'],
    ['Statement', EDUCATIONAL_STATEMENT],
  ];
  return ['Field,Value', ...rows.map(([k, v]) => `${csvCell(k)},${csvCell(v)}`)].join('\n');
}

export function resultToJson(r: ExactScenarioResult, generatedAt = new Date()): string {
  return JSON.stringify(
    {
      generatedAt: generatedAt.toISOString(),
      engineVersion: r.engineVersion,
      method: r.method,
      boundaryConvention: r.boundaryConvention,
      inputs: r.input.raw,
      product: r.input.product,
      results: {
        passProbability: r.passProbability,
        failProbability: r.failProbability,
        unresolvedProbability: r.unresolvedProbability,
        expectancyR: r.expectancyR,
        breakevenWinRate: r.breakevenWinRate,
        expectedTradesUntilStop: r.expectedTradesUntilStop,
        conditionalMeanTradesToTarget: r.conditionalMeanTradesToTarget,
        conditionalMedianTradesToTarget: r.conditionalMedianTradesToTarget,
        cumulativePassByTrade: r.cumulativePassByTrade,
        cumulativeFailByTrade: r.cumulativeFailByTrade,
      },
      supportedAssumptions: r.supportedAssumptions,
      unsupportedRules: r.unsupportedRules,
      numerical: r.numerical,
      statement: EDUCATIONAL_STATEMENT,
    },
    null,
    2,
  );
}
