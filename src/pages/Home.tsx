import { Link } from 'react-router-dom';
import { Head } from '../components/Head';
import { SIMULATOR_PATH } from '../seo';

export function Home() {
  return (
    <div className="home">
      <Head />
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">PropChallenger · evidence-led challenge research</p>
          <h1>See how your assumptions fit the challenge.</h1>
          <p className="lede">Model targets, loss limits and trading horizons. Compare the outcomes, inspect the assumptions and understand what the model does not include.</p>
          <div className="actions">
            <Link className="button" to={SIMULATOR_PATH}>Open the Challenge Fit Simulator</Link>
            <Link className="button secondary" to="/learn/challenge-simulation-assumptions">Read the method</Link>
          </div>
        </div>
      </section>
      <div className="wrap">
        <section className="promise-grid" aria-label="How PropChallenger works">
          <article>
            <h2>Three outcomes, always together</h2>
            <p>Every result shows the share of modelled paths that reach the target, reach the loss boundary, and are still running at the end of the trade horizon. Unfinished is never merged into failed.</p>
          </article>
          <article>
            <h2>Assumptions in plain view</h2>
            <p>Win rate, winner and loser in R, costs, fixed risk, target, static loss boundary and horizon are listed with every result, together with the boundary convention and the rules the model does not include.</p>
          </article>
          <article>
            <h2>Exact, reproducible calculation</h2>
            <p>P0 uses an exact finite-horizon calculation over integer P&amp;L states, with a versioned engine and published regression fixtures. It is a model of your assumptions, not a forecast of your trading.</p>
          </article>
          <article>
            <h2>Commercial separation</h2>
            <p>Referral commissions, partner payments and sponsor status never affect calculations, product compatibility or organic ordering. Where no commercial relationship exists, no commission disclosure is shown.</p>
          </article>
        </section>
        <section className="journey" aria-labelledby="journey-h">
          <h2 id="journey-h">A considered path</h2>
          <ol>
            <li>Explore your assumptions.</li>
            <li>Understand the challenge rules — including the ones the model leaves out.</li>
            <li>Compare relevant products on reviewed data.</li>
            <li>Review costs and limitations.</li>
            <li>Optionally visit the provider.</li>
          </ol>
          <p className="small">Product records in this build are illustrative samples only. Reviewed product data is not yet loaded.</p>
        </section>
      </div>
    </div>
  );
}
