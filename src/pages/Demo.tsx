import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Head } from '../components/Head';
import { OutcomeCards } from '../components/ResultsDashboard';
import { calculateFromInput } from '../engine';
import { WORKED_EXAMPLE } from '../state/scenario';
import { SIMULATOR_PATH } from '../seo';

const STEPS = [
  { title: 'Select the example', text: 'A hypothetical strategy: 50% win rate, winner +3R; loser −1R, no costs. Target +10%, static loss boundary −10%.', input: { ...WORKED_EXAMPLE } },
  { title: 'Fixed 1% risk, twenty trades', text: 'Risk is 1% of the starting balance on every trade. The model reaches the target in about 91.26% of paths within twenty trades.', input: { ...WORKED_EXAMPLE, riskPct: '1', horizon: '20' } },
  { title: 'Change risk to 0.5%', text: 'Same strategy in R, half the risk. Target reached falls to about 60.16% — mostly because many more paths are still running, not because more fail.', input: { ...WORKED_EXAMPLE, riskPct: '0.5', horizon: '20' } },
  { title: 'Highlight unresolved outcomes', text: 'Still running is not failed. With 0.5% risk, about 39.84% of paths have reached neither boundary after twenty trades.', input: { ...WORKED_EXAMPLE, riskPct: '0.5', horizon: '20' } },
  { title: 'Real rules add restrictions', text: 'Real challenges may add daily-loss limits, trailing drawdown, minimum trading days, consistency rules or more phases. This model includes none of them.', input: { ...WORKED_EXAMPLE, riskPct: '0.5', horizon: '20' } },
];

export function Demo() {
  const [step, setStep] = useState(0);
  const s = STEPS[step];
  const r = useMemo(() => calculateFromInput(s.input), [step]);
  return (
    <div className="wrap demo">
      <Head />
      <p className="demo-label" role="note"><strong>Hypothetical example. Not historical performance.</strong> Demo mode — no live product data, prices or referrals.</p>
      <h1>Guided demo</h1>
      <p className="small">Step {step + 1} of {STEPS.length}</p>
      <h2>{s.title}</h2>
      <p>{s.text}</p>
      <OutcomeCards r={r} />
      <p className="disclaimer">This is not a forecast of your real-world performance. The model does not include every rule of a real challenge.</p>
      <div className="actions">
        <button type="button" className="button secondary" disabled={step === 0} onClick={() => setStep(step - 1)}>Previous</button>
        {step < STEPS.length - 1 ? (
          <button type="button" className="button" onClick={() => setStep(step + 1)}>Next</button>
        ) : (
          <Link className="button" to={SIMULATOR_PATH}>Open the simulator and compare</Link>
        )}
      </div>
      <p className="small">All demo figures are computed locally by the same exact engine (no network needed). They do not imply that anyone possesses the assumed strategy.</p>
    </div>
  );
}
