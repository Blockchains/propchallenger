import { Link, NavLink, Outlet } from 'react-router-dom';
import { SIMULATOR_PATH } from '../seo';

export function Layout() {
  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <header className="site-header">
        <div className="wrap header-inner">
          <Link to="/" className="brand" aria-label="PropChallenger home">PropChallenger</Link>
          <nav aria-label="Primary">
            <ul>
              <li><NavLink to={SIMULATOR_PATH}>Challenge Fit Simulator</NavLink></li>
              <li><NavLink to="/learn/challenge-simulation-assumptions">Method &amp; assumptions</NavLink></li>
              <li><NavLink to="/demo">Guided demo</NavLink></li>
            </ul>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
      <footer className="site-footer">
        <div className="wrap">
          <p>
            <strong>Educational modelling only.</strong> PropChallenger results are conditional on the assumptions you enter. They are not
            forecasts of real-world performance, trading signals, investment advice or guarantees, and the model does not include every rule
            of a real challenge.
          </p>
          <p>
            Commercial relationships never affect calculations, product compatibility or organic ordering. Product records shown in this
            build are <strong>illustrative samples</strong>, not real products.
          </p>
          <p className="small">
            <Link to="/learn/expectancy-vs-pass-probability">Expectancy vs target-hit probability</Link> ·{' '}
            <Link to="/learn/why-unfinished-is-not-failed">Why unfinished is not failed</Link> ·{' '}
            <Link to="/learn/fixed-risk-vs-compounded-risk">Fixed vs compounded risk</Link>
          </p>
        </div>
      </footer>
    </>
  );
}
