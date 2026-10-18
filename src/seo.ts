export const CANONICAL_ORIGIN = 'https://propchallenger.com';

export interface RouteMeta { title: string; description: string; noindex?: boolean; inSitemap: boolean }

export const SIMULATOR_PATH = '/tools/challenge-fit-simulator';

export const ROUTE_META: Record<string, RouteMeta> = {
  '/': {
    title: 'PropChallenger: See How Your Assumptions Fit the Challenge',
    description: 'Evidence-led, assumption-based modelling of prop trading challenges. Model targets, loss limits and trading horizons, and inspect what the model does not include.',
    inSitemap: true,
  },
  [SIMULATOR_PATH]: {
    title: 'Prop Challenge Simulator: Explore Risk, Targets and Trade Horizons | PropChallenger',
    description: 'Model how win rate, realised reward, risk and trade limits interact with a simplified prop challenge. Compare outcomes and inspect every assumption.',
    inSitemap: true,
  },
  '/learn/expectancy-vs-pass-probability': {
    title: 'Expectancy vs Target-Hit Probability (Draft) | PropChallenger',
    description: 'Why positive expectancy per trade is not the same as the probability of reaching a target within a limited number of trades.',
    noindex: true,
    inSitemap: false,
  },
  '/learn/why-unfinished-is-not-failed': {
    title: 'Why Unfinished Is Not Failed (Draft) | PropChallenger',
    description: 'Unresolved paths within a trade horizon are different from paths that reached a loss boundary.',
    noindex: true,
    inSitemap: false,
  },
  '/learn/fixed-risk-vs-compounded-risk': {
    title: 'Fixed Risk vs Compounded Risk (Draft) | PropChallenger',
    description: 'The simulator uses fixed risk based on the starting balance. This note explains what that means and what it excludes.',
    noindex: true,
    inSitemap: false,
  },
  '/learn/challenge-simulation-assumptions': {
    title: 'Challenge Simulation Assumptions and Method (Draft) | PropChallenger',
    description: 'The exact calculation method, boundary conventions, numerical representation and unsupported rules of the Challenge Fit Simulator.',
    noindex: true,
    inSitemap: false,
  },
  '/demo': {
    title: 'Guided Demo: Challenge Fit Simulator | PropChallenger',
    description: 'Hypothetical worked example. Not historical performance.',
    noindex: true,
    inSitemap: false,
  },
};

export const NOT_FOUND_META: RouteMeta = { title: 'Page not found | PropChallenger', description: 'This page does not exist.', noindex: true, inSitemap: false };

export function metaFor(path: string): RouteMeta {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return ROUTE_META[clean] ?? NOT_FOUND_META;
}

export function canonicalFor(path: string): string {
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : '/';
  return `${CANONICAL_ORIGIN}${clean === '/' ? '/' : clean}`;
}
