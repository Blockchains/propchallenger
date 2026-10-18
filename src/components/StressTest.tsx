import { useMemo, useState } from 'react';
import { formatProbability, type ExactScenarioResult, type ScenarioInput } from '../engine';
import { runVariations, VARIATIONS } from '../state/sensitivity';

export function StressTest({ base, scenario }: { base: ExactScenarioResult; scenario: ScenarioInput }) {
  const [amounts, setAmounts] = useState<Record<string, number>>(() => Object.fromEntries(VARIATIONS.map((v) => [v.id, v.defaultAmount])));
  const rows = useMemo(() => runVariations(scenario, amounts), [scenario, amounts]);
  return (
    <section className="stress" aria-labelledby="stress-h">
      <h2 id="stress-h">Stress-test the assumptions</h2>
      <p className="notice">In real trading, win rate, reward size and execution costs may change together. Each row changes one input on its own: a hypothetical sensitivity test, not proof it can be adjusted independently in live trading.</p>
      <div className="table-scroll" tabIndex={0} role="region" aria-label="Stress test table">
        <table>
          <thead>
            <tr><th scope="col">Change</th><th scope="col">Amount</th><th scope="col">Target reached</th><th scope="col">Loss boundary reached</th><th scope="col">Still running</th></tr>
          </thead>
          <tbody>
            <tr className="baseline-row"><th scope="row">Current scenario</th><td>—</td><td>{formatProbability(base.passProbability)}</td><td>{formatProbability(base.failProbability)}</td><td>{formatProbability(base.unresolvedProbability)}</td></tr>
            {rows.map((row) => (
              <tr key={row.variation.id}>
                <th scope="row">{row.variation.label}</th>
                <td>
                  {row.variation.unit ? (
                    <label>
                      <span className="sr-only">{row.variation.label} amount ({row.variation.unit})</span>
                      <input type="number" inputMode="decimal" min={0} step="any" className="amount-input" value={amounts[row.variation.id]}
                        onChange={(e) => setAmounts({ ...amounts, [row.variation.id]: Math.max(0, Number(e.target.value) || 0) })} />{' '}
                      {row.variation.unit}
                    </label>
                  ) : '—'}
                </td>
                {row.result ? (
                  <>
                    <td>{formatProbability(row.result.passProbability)}</td>
                    <td>{formatProbability(row.result.failProbability)}</td>
                    <td>{formatProbability(row.result.unresolvedProbability)}</td>
                  </>
                ) : (
                  <td colSpan={3}>{row.error}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small">Risk rows are shown for understanding only. They are not a suggestion to change risk; larger risk changes both how quickly the target and the loss boundary can be reached.</p>
    </section>
  );
}
