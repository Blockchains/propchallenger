import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { calculateFromInput, formatNumber, formatProbability, formatR, validateScenario, type ScenarioInput } from '../engine';
import { ScenarioEditor } from './ScenarioEditor';

export interface ComparisonScenario {
  id: string;
  title: string;
  scenario: ScenarioInput;
  unsupportedRules: string[];
  evidenceSource: string;
}

export const COMPARISON_PRESETS: { id: string; label: string; build: (s: ScenarioInput) => ScenarioInput[] ; titles: string[] }[] = [
  { id: 'risk', label: 'Same strategy, 1% vs 0.5% risk', titles: ['1% risk', '0.5% risk'], build: (s) => [{ ...s, riskPct: '1' }, { ...s, riskPct: '0.5' }] },
  { id: 'horizon', label: 'Same risk, different horizons', titles: ['10 trades', '20 trades', '40 trades'], build: (s) => [{ ...s, horizon: '10' }, { ...s, horizon: '20' }, { ...s, horizon: '40' }] },
  { id: 'target', label: 'Same strategy, different targets', titles: ['8% target', '10% target'], build: (s) => [{ ...s, targetPct: '8' }, { ...s, targetPct: '10' }] },
  { id: 'loss', label: 'Same strategy, different loss allowances', titles: ['6% loss boundary', '10% loss boundary'], build: (s) => [{ ...s, maxLossPct: '6' }, { ...s, maxLossPct: '10' }] },
  { id: 'worse', label: 'Baseline vs worse assumptions', titles: ['Baseline', 'Worse: −5pt win rate, +0.1R cost'], build: (s) => [{ ...s }, { ...s, winRatePct: String(Math.max(0, Number(s.winRatePct) - 5)), costR: String(Number((Number(s.costR) + 0.1).toFixed(3))) }] },
];

export function Comparison({ items, onChange }: { items: ComparisonScenario[]; onChange: (items: ComparisonScenario[]) => void }) {
  const computed = useMemo(
    () => items.map((it) => {
      const v = validateScenario(it.scenario);
      if (!v.ok) return { it, r: null, errors: v.errors };
      try { return { it, r: calculateFromInput(it.scenario), errors: [] }; } catch (e) { return { it, r: null, errors: [{ field: 'scenario' as const, message: (e as Error).message }] }; }
    }),
    [items],
  );
  if (items.length === 0) return <p>No comparison yet. Add the current scenario or pick a preset above.</p>;
  const rows: [string, (c: (typeof computed)[number]) => ReactNode][] = [
    ['Win rate', (c) => `${c.it.scenario.winRatePct}%`],
    ['Winner / loser', (c) => `${formatR(Number(c.it.scenario.winnerR))} / ${formatR(-Number(c.it.scenario.loserR))}`],
    ['Cost per trade', (c) => `${c.it.scenario.costR}R`],
    ['Risk per trade', (c) => `${c.it.scenario.riskPct}% of starting balance`],
    ['Profit target', (c) => `+${c.it.scenario.targetPct}%`],
    ['Static loss boundary', (c) => `−${c.it.scenario.maxLossPct}%`],
    ['Trade horizon', (c) => `${c.it.scenario.horizon} trades`],
    ['Target reached', (c) => (c.r ? formatProbability(c.r.passProbability) : '—')],
    ['Loss boundary reached', (c) => (c.r ? formatProbability(c.r.failProbability) : '—')],
    ['Still running', (c) => (c.r ? formatProbability(c.r.unresolvedProbability) : '—')],
    ['Mean / median trades to target (paths that reach it)', (c) => (c.r ? (c.r.conditionalMeanTradesToTarget === null ? 'Undefined' : `${formatNumber(c.r.conditionalMeanTradesToTarget)} / ${c.r.conditionalMedianTradesToTarget}`) : '—')],
    ['Net expectancy per trade', (c) => (c.r ? formatR(Number(c.r.expectancyR.toFixed(4))) : '—')],
    ['Unsupported rules', (c) => (c.it.unsupportedRules.length ? c.it.unsupportedRules.join('; ') : 'None declared (custom scenario)')],
    ['Evidence source', (c) => c.it.evidenceSource],
  ];
  const update = (id: string, patch: Partial<ComparisonScenario>) => onChange(items.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  return (
    <div className="comparison">
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Scenario comparison table">
        <table className="compare-table">
          <caption>Side-by-side comparison. Every outcome is within the stated horizon under this model. No scenario is labelled “best”.</caption>
          <thead>
            <tr>
              <th scope="col">Row</th>
              {computed.map((c) => (
                <th scope="col" key={c.it.id}>
                  <input aria-label="Scenario title" className="title-input" value={c.it.title} onChange={(e) => update(c.it.id, { title: e.target.value.slice(0, 60) })} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, fn]) => (
              <tr key={label}><th scope="row">{label}</th>{computed.map((c) => <td key={c.it.id}>{fn(c)}</td>)}</tr>
            ))}
            <tr>
              <th scope="row">Edit</th>
              {computed.map((c) => (
                <td key={c.it.id}>
                  <details>
                    <summary>Edit assumptions</summary>
                    <ScenarioEditor compact value={c.it.scenario} errors={c.errors} onChange={(s) => update(c.it.id, { scenario: s })} />
                  </details>
                  <button type="button" className="button secondary small-btn" onClick={() => onChange(items.filter((x) => x.id !== c.it.id))}>Remove</button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="notice">
        <p><strong>Reading the trade-offs.</strong> A higher target-reached figure is not automatically preferable. You may reasonably prefer a scenario with a lower loss-boundary probability, lower fees, slower completion, different restrictions or less aggressive assumptions. Raising risk can raise both the target-reached and loss-boundary figures at once.</p>
      </div>
    </div>
  );
}
