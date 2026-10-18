import { useState } from 'react';
import { formatNumber, formatProbability, formatR, formatMoney, tradesPhrase, type ExactScenarioResult } from '../engine';
import { explain, headlineSentence, MODEL_EXCLUSIONS } from '../state/explanation';
import { mostInfluential } from '../state/sensitivity';
import type { ScenarioInput } from '../engine';
import { useHydrated } from './useHydrated';
import { CumulativeOutcomesChart, FirstHitChart, TerminalUnresolvedChart } from './Charts';

export function OutcomeCards({ r, headingLevel = 3 }: { r: ExactScenarioResult; headingLevel?: 3 | 4 }) {
  const H = `h${headingLevel}` as 'h3';
  const within = `Within ${r.input.horizon} trades under this model.`;
  return (
    <div className="cards" role="group" aria-label="Modelled outcomes: target reached, loss boundary reached and still running">
      <div className="card card-pass">
        <span className="card-icon" aria-hidden="true">▲</span>
        <H>Target reached</H>
        <p className="card-value">{formatProbability(r.passProbability)}</p>
        <p className="card-note">{within}</p>
        <p className="card-sub">Modelled target-hit probability</p>
      </div>
      <div className="card card-fail">
        <span className="card-icon" aria-hidden="true">▼</span>
        <H>Loss boundary reached</H>
        <p className="card-value">{formatProbability(r.failProbability)}</p>
        <p className="card-note">{within}</p>
        <p className="card-sub">Modelled failure probability</p>
      </div>
      <div className="card card-unres">
        <span className="card-icon" aria-hidden="true">●</span>
        <H>Still running</H>
        <p className="card-value">{formatProbability(r.unresolvedProbability)}</p>
        <p className="card-note">{within}</p>
        <p className="card-sub">Unresolved: neither boundary reached</p>
      </div>
    </div>
  );
}

export function AssumptionsSummary({ r }: { r: ExactScenarioResult }) {
  const i = r.input.raw;
  return (
    <section className="assumptions" aria-labelledby="assumptions-h">
      <h3 id="assumptions-h">Assumptions used</h3>
      <ul className="assumption-list">
        <li>Win rate: <strong>{i.winRatePct}%</strong></li>
        <li>Winner: <strong>{formatR(Number(i.winnerR))}</strong>; loser: <strong>{formatR(-Number(i.loserR))}</strong></li>
        <li>Cost per trade: <strong>{i.costR}R</strong></li>
        <li>Risk per trade: <strong>{i.riskPct}%</strong> of starting balance (1R = {formatMoney(r.input.riskFraction * r.input.startingBalance)})</li>
        <li>Starting balance: <strong>{formatMoney(r.input.startingBalance)}</strong></li>
        <li>Profit target: <strong>+{i.targetPct}%</strong>; static loss boundary: <strong>−{i.maxLossPct}%</strong></li>
        <li>Trade horizon: <strong>{i.horizon}</strong> completed trades</li>
      </ul>
      <p className="small">
        Boundary convention: {r.boundaryConvention.pass} {r.boundaryConvention.fail} {r.boundaryConvention.evaluation}
      </p>
    </section>
  );
}

export function ResultsDashboard({ r, scenario, warnings }: { r: ExactScenarioResult; scenario: ScenarioInput; warnings: string[] }) {
  const [limitsOpen, setLimitsOpen] = useState(true);
  const hydrated = useHydrated();
  const ex = explain(r);
  const influential = mostInfluential(r, scenario);
  const tpw = r.input.tradesPerWeek;
  return (
    <section className="results" aria-labelledby="results-h">
      <h2 id="results-h">Modelled outcomes</h2>
      <AssumptionsSummary r={r} />
      {warnings.length > 0 && (
        <div className="notice notice-warn" role="status">
          <p><strong>Check these assumptions:</strong></p>
          <ul>{warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </div>
      )}
      <OutcomeCards r={r} />
      <p className="headline-sentence" aria-live="polite">{headlineSentence(r)} It reaches the loss boundary in {formatProbability(r.failProbability)} and leaves {formatProbability(r.unresolvedProbability)} still running.</p>
      <p className="disclaimer">This is not a forecast of your real-world performance. The model does not include every rule of a real challenge.</p>
      {r.passProbability >= 1 && <p className="disclaimer">100% here is a mechanical consequence of the inputs (for example a 100% win rate). It is not a guarantee about any real challenge.</p>}

      <div className="stats">
        <dl>
          <div><dt>Net expectancy per trade</dt><dd>{formatR(Number(r.expectancyR.toFixed(4)))} ({formatMoney(r.expectancyMoney)} per unrestricted trade)</dd></div>
          <div><dt>Breakeven win rate</dt><dd>{r.breakevenWinRate.meaningful ? formatProbability(r.breakevenWinRate.value) : 'Outside 0–100%'}<span className="small block">{r.breakevenWinRate.note}</span></dd></div>
          <div><dt>Expected trades until a boundary or the horizon</dt><dd>{formatNumber(r.expectedTradesUntilStop)}</dd></div>
          <div><dt>Mean trades to target (paths that reach it)</dt><dd>{r.conditionalMeanTradesToTarget === null ? 'Undefined — no path reaches the target' : formatNumber(r.conditionalMeanTradesToTarget)}</dd></div>
          <div><dt>Median trades to target (paths that reach it)</dt><dd>{r.conditionalMedianTradesToTarget === null ? 'Undefined — no path reaches the target' : r.conditionalMedianTradesToTarget}</dd></div>
          {tpw && (
            <div><dt>Simple calendar conversion</dt><dd>{tradesPhrase(r.input.horizon)} ÷ {tpw} per week ≈ {(r.input.horizon / tpw).toFixed(1)} weeks. A simple conversion, not a forecast of completion dates.</dd></div>
          )}
        </dl>
        <p className="small">Expectancy is per trade without boundaries. It is not multiplied by the horizon, because paths stop at the first boundary.</p>
      </div>

      <div className="charts">
        <CumulativeOutcomesChart r={r} />
        <FirstHitChart r={r} />
        <TerminalUnresolvedChart r={r} />
      </div>

      <section className="explain-panel" aria-labelledby="explain-h">
        <h3 id="explain-h">Understanding this result</h3>
        <h4>What drove the result</h4>
        <ul>{ex.drivers.map((d) => <li key={d}>{d}</li>)}</ul>
        <h4>What remains unfinished</h4>
        <p>{ex.unfinished}</p>
        <h4>Which assumptions matter most here</h4>
        <p className="small">Each line changes one input on its own. That is a hypothetical sensitivity test; in real trading, win rate, reward size and execution costs may change together.</p>
        <ul>
          {influential.map((v) => (
            <li key={v.label}>
              {v.label}{v.unit ? ` by ${v.amount} ${v.unit}` : ''}: target reached changes by {(v.deltaPass * 100).toFixed(2)} percentage points; loss boundary reached by {(v.deltaFail * 100).toFixed(2)} points.
            </li>
          ))}
        </ul>
        <h4>Why expectancy and completion probability differ</h4>
        <p>{ex.whyDiffer}</p>
        <h4>
          <button type="button" className="link-button" aria-expanded={limitsOpen} onClick={() => setLimitsOpen(!limitsOpen)}>
            What the model excludes {limitsOpen ? '▴' : '▾'}
          </button>
        </h4>
        {limitsOpen && <ul>{MODEL_EXCLUSIONS.map((m) => <li key={m}>{m}</li>)}</ul>}
        <details>
          <summary>Calculation metadata</summary>
          <ul className="small">
            <li>Engine version {r.engineVersion}; method: {r.method}.</li>
            <li>{r.methodDescription}</li>
            <li>{r.numerical.representation}</li>
            <li>Probability-mass error {r.numerical.probabilityMassError.toExponential(2)} (tolerance {r.numerical.tolerance.toExponential(0)}).</li>
            <li>{r.runtime.latticeStatesEvaluated.toLocaleString('en-GB')} lattice states evaluated{hydrated ? ` in ${r.runtime.milliseconds.toFixed(1)} ms` : ''}.</li>
            <li>Real product data used: {r.realProductDataUsed ? 'yes' : 'no'}{r.sourceVersionIds.length ? `; source snapshots: ${r.sourceVersionIds.join(', ')}` : ''}.</li>
          </ul>
        </details>
      </section>
    </section>
  );
}
