import type { ExactScenarioResult } from '../engine';
import { formatProbability, formatSignedPct } from '../engine';

const W = 640;
const H = 260;
const PAD = { l: 52, r: 16, t: 16, b: 40 };
const iw = W - PAD.l - PAD.r;
const ih = H - PAD.t - PAD.b;

function yTicks(max: number) {
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max);
  return ticks;
}

function Axes({ xLabel, yLabel, yMax, xMax, xMin = 0, xFormat = (v: number) => String(Math.round(v)) }: { xLabel: string; yLabel: string; yMax: number; xMax: number; xMin?: number; xFormat?: (v: number) => string }) {
  const xt = Array.from({ length: 6 }, (_, i) => xMin + ((xMax - xMin) * i) / 5);
  return (
    <g className="axes" aria-hidden="true">
      <line x1={PAD.l} y1={PAD.t + ih} x2={PAD.l + iw} y2={PAD.t + ih} />
      <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + ih} />
      {yTicks(yMax).map((t) => {
        const y = PAD.t + ih - (yMax ? (t / yMax) * ih : 0);
        return (
          <g key={t}>
            <line className="grid" x1={PAD.l} x2={PAD.l + iw} y1={y} y2={y} />
            <text x={PAD.l - 6} y={y + 4} textAnchor="end">{(t * 100).toFixed(yMax < 0.05 ? 2 : 0)}%</text>
          </g>
        );
      })}
      {xt.map((t) => {
        const x = PAD.l + (xMax === xMin ? 0 : ((t - xMin) / (xMax - xMin)) * iw);
        return <text key={t} x={x} y={PAD.t + ih + 16} textAnchor="middle">{xFormat(t)}</text>;
      })}
      <text x={PAD.l + iw / 2} y={H - 4} textAnchor="middle" className="axis-label">{xLabel}</text>
      <text x={12} y={PAD.t + ih / 2} textAnchor="middle" transform={`rotate(-90 12 ${PAD.t + ih / 2})`} className="axis-label">{yLabel}</text>
    </g>
  );
}

export function CumulativeOutcomesChart({ r }: { r: ExactScenarioResult }) {
  const N = r.input.horizon;
  const x = (n: number) => PAD.l + (N ? (n / N) * iw : 0);
  const y = (v: number) => PAD.t + ih - v * ih;
  const path = (arr: number[]) => arr.map((v, n) => `${n ? 'L' : 'M'}${x(n).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const series = [
    { key: 'pass', label: 'Target reached (cumulative)', data: r.cumulativePassByTrade, cls: 's-pass' },
    { key: 'fail', label: 'Loss boundary reached (cumulative)', data: r.cumulativeFailByTrade, cls: 's-fail' },
    { key: 'unres', label: 'Still running', data: r.unresolvedByTrade, cls: 's-unres' },
  ];
  const sample = Array.from(new Set([0, Math.round(N / 4), Math.round(N / 2), Math.round((3 * N) / 4), N])).filter((n) => n >= 0 && n <= N);
  return (
    <figure className="chart">
      <figcaption>
        <strong>Cumulative outcomes by trade.</strong> After {N} trades: target reached {formatProbability(r.passProbability)}, loss boundary
        reached {formatProbability(r.failProbability)}, still running {formatProbability(r.unresolvedProbability)} of modelled paths.
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Line chart of cumulative target reached, loss boundary reached and still running probabilities by trade number. Values are listed in the table below.">
        <Axes xLabel="Completed trades" yLabel="Share of modelled paths" yMax={1} xMax={N} />
        {series.map((s) => <path key={s.key} className={`series ${s.cls}`} d={path(s.data)} />)}
      </svg>
      <ul className="legend">
        {series.map((s) => <li key={s.key}><span className={`swatch ${s.cls}`} aria-hidden="true" />{s.label}</li>)}
      </ul>
      <details>
        <summary>Table of values</summary>
        <table>
          <thead><tr><th scope="col">After trade</th><th scope="col">Target reached</th><th scope="col">Loss boundary reached</th><th scope="col">Still running</th></tr></thead>
          <tbody>
            {sample.map((n) => (
              <tr key={n}><th scope="row">{n}</th><td>{formatProbability(r.cumulativePassByTrade[n])}</td><td>{formatProbability(r.cumulativeFailByTrade[n])}</td><td>{formatProbability(r.unresolvedByTrade[n])}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

function Bars({ values, labels, cls, ariaLabel, xLabel, yLabel }: { values: number[]; labels: string[]; cls: string; ariaLabel: string; xLabel: string; yLabel: string }) {
  const max = Math.max(...values, 1e-12);
  const bw = iw / Math.max(values.length, 1);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      <g className="axes" aria-hidden="true">
        <line x1={PAD.l} y1={PAD.t + ih} x2={PAD.l + iw} y2={PAD.t + ih} />
        <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={PAD.t + ih} />
        {[0, 0.5, 1].map((f) => {
          const yy = PAD.t + ih - f * ih;
          return <g key={f}><line className="grid" x1={PAD.l} x2={PAD.l + iw} y1={yy} y2={yy} /><text x={PAD.l - 6} y={yy + 4} textAnchor="end">{(f * max * 100).toFixed(max < 0.1 ? 2 : 1)}%</text></g>;
        })}
        {labels.map((lab, i) => (values.length <= 24 || i % Math.ceil(values.length / 12) === 0 ? <text key={i} x={PAD.l + bw * i + bw / 2} y={PAD.t + ih + 16} textAnchor="middle">{lab}</text> : null))}
        <text x={PAD.l + iw / 2} y={H - 4} textAnchor="middle" className="axis-label">{xLabel}</text>
        <text x={12} y={PAD.t + ih / 2} textAnchor="middle" transform={`rotate(-90 12 ${PAD.t + ih / 2})`} className="axis-label">{yLabel}</text>
      </g>
      {values.map((v, i) => {
        const h = (v / max) * ih;
        return <rect key={i} className={`bar ${cls}`} x={PAD.l + bw * i + bw * 0.1} width={bw * 0.8} y={PAD.t + ih - h} height={h} />;
      })}
    </svg>
  );
}

export function FirstHitChart({ r }: { r: ExactScenarioResult }) {
  const N = r.input.horizon;
  const values = r.firstPassByTrade.slice(1);
  const labels = values.map((_, i) => String(i + 1));
  let mode = 0;
  values.forEach((v, i) => { if (v > values[mode]) mode = i; });
  return (
    <figure className="chart">
      <figcaption>
        <strong>First target-hit distribution.</strong>{' '}
        {r.passProbability > 0
          ? `Share of all modelled paths that reach the target for the first time on each trade. The most common first-hit trade is trade ${mode + 1} (${formatProbability(values[mode])} of paths).`
          : `No modelled path reaches the target within ${N} trades, so there is no first-hit distribution.`}
      </figcaption>
      {N > 0 && (
        <Bars values={values} labels={labels} cls="s-pass" xLabel="Trade on which the target is first reached" yLabel="Share of all paths" ariaLabel="Bar chart of the probability of first reaching the target on each trade. Values are listed in the table below." />
      )}
      <details>
        <summary>Table of values</summary>
        <table>
          <thead><tr><th scope="col">Trade</th><th scope="col">First reaches target</th><th scope="col">First reaches loss boundary</th></tr></thead>
          <tbody>
            {values.map((v, i) => (v > 0 || r.firstFailByTrade[i + 1] > 0 ? (
              <tr key={i}><th scope="row">{i + 1}</th><td>{formatProbability(v)}</td><td>{formatProbability(r.firstFailByTrade[i + 1])}</td></tr>
            ) : null))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

export function TerminalUnresolvedChart({ r }: { r: ExactScenarioResult }) {
  const states = r.terminalUnresolved;
  return (
    <figure className="chart">
      <figcaption>
        <strong>Where still-running paths finish.</strong>{' '}
        {states.length
          ? `Closed-trade P&L after ${r.input.horizon} trades for the ${formatProbability(r.unresolvedProbability)} of paths that reached neither boundary. These paths are unfinished, not failed.`
          : 'Every modelled path reached a boundary within the horizon; nothing is still running.'}
      </figcaption>
      {states.length > 0 && (
        <Bars
          values={states.map((s) => s.probability)}
          labels={states.map((s) => formatSignedPct(s.pnlFraction, 1))}
          cls="s-unres"
          xLabel="P&L at horizon (% of starting balance)"
          yLabel="Share of all paths"
          ariaLabel="Bar chart of the P&L distribution of unresolved paths at the end of the horizon. Values are listed in the table below."
        />
      )}
      {states.length > 0 && (
        <details>
          <summary>Table of values</summary>
          <table>
            <thead><tr><th scope="col">P&amp;L at horizon</th><th scope="col">Wins / losses</th><th scope="col">Share of all paths</th></tr></thead>
            <tbody>
              {states.map((s) => (
                <tr key={s.wins}><th scope="row">{formatSignedPct(s.pnlFraction)}</th><td>{s.wins} / {s.losses}</td><td>{formatProbability(s.probability)}</td></tr>
              ))}
            </tbody>
          </table>
        </details>
      )}
    </figure>
  );
}
