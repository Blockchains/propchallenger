import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Head } from '../components/Head';
import { SIMULATOR_PATH } from '../seo';
import { MODEL_EXCLUSIONS } from '../state/explanation';
import { ENGINE_VERSION, LIMITS } from '../engine';
import { NotFound } from './NotFound';

const DRAFT = (
  <p className="notice">Draft educational note awaiting editorial review. Excluded from search indexing until reviewed.</p>
);

const ARTICLES: Record<string, { title: string; body: ReactNode }> = {
  'expectancy-vs-pass-probability': {
    title: 'Expectancy is not target-hit probability',
    body: (
      <>
        <p>Net expectancy per trade is the average result of one trade under the model’s assumptions: <code>E = p·w − (1 − p)·l − c</code>, in R. It describes a single unrestricted trade.</p>
        <p>A challenge is different. Paths stop as soon as they reach the target or the loss boundary, and only a limited number of trades is allowed. The probability of reaching the target within that horizon depends on how many trades the boundaries are away, the order in which wins and losses arrive, and the horizon itself.</p>
        <p>That is why multiplying expectancy by the number of trades does not give the expected outcome of a challenge, and why a positive expectancy does not mean the target will be reached within the horizon.</p>
        <p>Example (hypothetical): 50% win rate, winner +3R, loser −1R, no costs. Expectancy is +1R per trade. With 1% risk, +10% target, −10% static loss and 20 trades, the model reaches the target in 91.26% of paths, reaches the loss boundary in 0.19%, and leaves 8.55% still running. With 0.5% risk and the same expectancy in R, target reached falls to 60.16%.</p>
      </>
    ),
  },
  'why-unfinished-is-not-failed': {
    title: 'Why unfinished is not failed',
    body: (
      <>
        <p>When the trade horizon ends, some modelled paths have reached neither the target nor the loss boundary. PropChallenger reports these as <strong>still running</strong> (unresolved).</p>
        <p>A path still running after twenty trades is not necessarily a failed account. Depending on the real rules, the account might continue, time out, or be reset. The model does not know which, so it does not merge unresolved and failed outcomes, and it does not estimate an unlimited-horizon probability.</p>
        <p>The simulator also shows where unresolved paths finish, so you can see whether they tend to sit close to the target, close to the loss boundary, or near the start.</p>
      </>
    ),
  },
  'fixed-risk-vs-compounded-risk': {
    title: 'Fixed risk vs compounded risk',
    body: (
      <>
        <p>The P0 model uses <strong>fixed monetary risk based on the starting balance</strong>: if risk is 1% of a 100,000 starting balance, every trade risks 1,000 for the whole scenario, regardless of gains or losses so far.</p>
        <p>Compounded (equity-based) risk recalculates the amount at risk from the current balance, so risk shrinks after losses and grows after gains. That changes how quickly both boundaries can be reached. The current model does <strong>not</strong> support compounded risk; results should not be read as applying to it.</p>
      </>
    ),
  },
  'challenge-simulation-assumptions': {
    title: 'Challenge simulation assumptions and method',
    body: (
      <>
        <h2>Model (engine {ENGINE_VERSION})</h2>
        <ul>
          <li>One evaluation phase; independent trades with constant win probability <code>p</code>.</li>
          <li>Fixed outcomes: net winner <code>R·(w − c)</code>, net loser <code>−R·(l + c)</code>, where <code>R</code> = risk % × starting balance.</li>
          <li>Static boundaries: passed when P&amp;L ≥ target; failed when P&amp;L ≤ −maximum loss (both inclusive), checked after each completed trade.</li>
          <li>Paths stop at the first boundary. After the horizon, remaining paths are unresolved.</li>
        </ul>
        <h2>Exact calculation</h2>
        <p>Inputs are parsed as bounded decimals (win rate ≤ {LIMITS.winRatePct.dp} dp; R values, risk, target and loss ≤ 3 dp) into integer units of 10⁻⁸ of the starting balance, reduced by their greatest common divisor. Inputs with more precision are rejected, never rounded. After n trades with k wins, P&amp;L is exactly <code>k·W − (n − k)·L</code>, so the state space is a lattice indexed by (n, k). A dynamic programme moves probability mass through this lattice, absorbing mass at the boundaries. Probability mass is held in double precision with compensated summation; conservation is checked to 10⁻⁹ and the result is rejected if it fails.</p>
        <p>Limits: horizon ≤ {LIMITS.horizon.max} trades (≤ 600,000 lattice states) and a 2-second runtime budget. Calculations beyond these limits are rejected rather than approximated.</p>
        <h2>Verification</h2>
        <p>Regression fixtures A–F are frozen to exact rational values computed by two independent methods (rational dynamic programme and brute-force enumeration of all 2ⁿ paths) and re-derived by a third BigInt implementation in the test suite. The brief’s approximate constants for fixture B (0.9126033783 / 0.0019054413 / 0.0854911804) differ from the verified exact values (956927/2²⁰ ≈ 0.9125967026; 501/2¹⁸ ≈ 0.0019111633; 89645/2²⁰ ≈ 0.0854921341) by under 10⁻⁵; the verified values are used.</p>
        <h2>Not modelled</h2>
        <ul>{MODEL_EXCLUSIONS.map((m) => <li key={m}>{m}</li>)}</ul>
      </>
    ),
  },
};

export function Learn() {
  const { slug = '' } = useParams();
  const a = ARTICLES[slug];
  if (!a) return <NotFound />;
  return (
    <article className="wrap learn">
      <Head />
      <h1>{a.title}</h1>
      {DRAFT}
      {a.body}
      <p><Link to={SIMULATOR_PATH}>Open the Challenge Fit Simulator</Link></p>
    </article>
  );
}
