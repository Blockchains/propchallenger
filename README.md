# PropChallenger — Challenge Fit Simulator (P0)

> **See how your assumptions fit the challenge.**
> Model targets, loss limits and trading horizons. Compare the outcomes, inspect the assumptions and understand what the model does not include.

An evidence-led, **educational** modelling tool. It is not a trading signal, investment recommendation, or guarantee of passing any challenge. Every result shows **target reached, loss boundary reached and still running together**, states its horizon and assumptions, and lists the rules it does not model.

- Live (GitHub Pages): https://blockchains.github.io/propchallenger/
- Simulator: https://blockchains.github.io/propchallenger/tools/challenge-fit-simulator
- Canonical production origin (not yet pointed here): https://propchallenger.com

## Stack and architecture

Static SPA, **Vite 5 + React 18 + TypeScript + React Router 6**, prerendered to static HTML for every route (real content and HTTP 200 on any static host). No backend, no paid APIs, no AI, no analytics, no cookies.

```
src/
  engine/              Pure calculation library (no React/DOM imports)
    decimal.ts         Bounded-decimal → BigInt scaled integers, GCD
    validate.ts        Schema validation, documented limits, integer lattice
    exact.ts           calculateExactScenario() — exact finite-horizon DP
    format.ts          Display rules (<0.01%, >99.99%, never "no risk")
    types.ts           ScenarioInput, ValidatedScenarioInput, ExactScenarioResult
    __tests__/         Fixtures A–F, brute force, invariants + independent BigInt rational reference
  data/products.ts     ILLUSTRATIVE sample challenge records, prefill rules, organic ordering, outbound allowlist
  state/               Worked example, share-link encoding, local saves, CSV/JSON export, sensitivity, deterministic explanation
  components/          Editor, results dashboard (three cards), SVG charts + tables, comparison, stress test, product panel
  pages/               Home, Simulator, Learn (4 draft notes), Demo (expo), NotFound
  entry-client.tsx     Hydrates prerendered HTML
  entry-server.tsx     renderToString for prerender (and tests)
scripts/prerender.mjs  Writes dist/<route>/index.html, 404.html, sitemap.xml, robots.txt, optional CNAME
reference/fixtures_reference.py  Independent Python Fraction reference (DP + optional brute force)
```

Routes: `/`, `/tools/challenge-fit-simulator`, `/learn/expectancy-vs-pass-probability`, `/learn/why-unfinished-is-not-failed`, `/learn/fixed-risk-vs-compounded-risk`, `/learn/challenge-simulation-assumptions`, `/demo`.

## Calculation method

`calculateExactScenario(input: ValidatedScenarioInput): ExactScenarioResult` (engine `1.0.0`, method `exact-finite-horizon-dp-binomial-lattice`).

Model (P0): one phase; fixed monetary risk `R = B0·r` from the **starting** balance; independent trades with win probability `p`; fixed net winner `R(w − c)` and loser `−R(l + c)`; static boundaries **passed when P&L ≥ target**, **failed when P&L ≤ −max loss** (both inclusive), checked after each completed trade; first boundary stops the path; remaining paths at `N` are **unresolved**.

Numerical representation:
- Inputs are decimal strings parsed with bounded precision (win rate ≤ 4 dp; R values, cost, risk %, target %, loss % ≤ 3 dp; balance ≤ 2 dp). **Excess precision is rejected, never rounded.**
- All P&L quantities become integers in units of 10⁻⁸ of starting balance, reduced by their GCD. After `n` trades with `k` wins, P&L is exactly `k·W − (n−k)·L`, so states are a lattice indexed by `(n, k)` (identical states merge automatically because `W + L > 0`).
- Probability mass is IEEE-754 double with Neumaier compensated summation; conservation is checked to `1e-9`, otherwise the result is rejected.
- Limits: horizon 0–1000 trades (≤ 600,000 lattice states), 2 s runtime budget; beyond that the engine throws `ScenarioRejectedError` rather than approximating. Worst case runs in tens of milliseconds, so it runs on the main thread with a 150 ms input debounce (a Web Worker is unnecessary at these limits; see Deferred).

Outputs: pass / fail / unresolved within horizon; cumulative pass/fail and unresolved by trade; first-hit distributions; terminal unresolved P&L distribution; expected trades until absorption or horizon; conditional mean and median trades to target (`null` = undefined when no path passes, never 0); net expectancy (R and money); breakeven win rate with range flag; supported assumptions; unsupported rules; real-product flag; source snapshot IDs; warnings; tolerance and mass error; runtime metadata. No drawdown statistics (the state doesn't track them) and no unlimited-horizon probability.

### Fixture verification

Fixtures A–F are frozen to **exact rationals** computed independently by (1) Python `Fraction` DP over P&L states, (2) Python brute-force enumeration of all 2ᴺ paths (`--brute`), and re-derived in CI by (3) a TypeScript BigInt rational implementation that does not share code with the engine.

| Fixture | Pass | Fail | Unresolved |
|---|---|---|---|
| A (50%, +3R/−1R, 1%, 10) | 653/1024 = 0.6376953125 | 1/1024 = 0.0009765625 | 185/512 = 0.361328125 |
| B (same, 20) | 956927/2²⁰ ≈ 0.9125967026 | 501/2¹⁸ ≈ 0.0019111633 | 89645/2²⁰ ≈ 0.0854921341 |
| C (0.5%, 20) | 630829/2²⁰ ≈ 0.6016054153 | 1/2²⁰ ≈ 0.0000009537 | 208873/2¹⁹ ≈ 0.3983936310 |
| D (70%, ±1R, 1%, 10) | 0.7¹⁰ = 0.0282475249 | 0.3¹⁰ = 0.0000059049 | 0.9717465702 |
| E (70%, ±1R, 0.5%, 20) | 0.7²⁰ ≈ 0.000797922663 | 0.3²⁰ ≈ 3.4868e-11 | ≈ 0.999202077302 |
| F (30%, +5R/−1R, 1%, 20) | ≈ 0.799886000879 | ≈ 0.042490209430 | ≈ 0.157623789692 |

**Discrepancy found:** the brief's *approximate* fixture B constants (0.9126033783 / 0.0019054413 / 0.0854911804) do not match either independent exact method; they differ by < 1e‑5 (7/2²⁰ moved between pass and fail). The verified values are frozen; the displayed figure still rounds to **91.26%**. A, C (0.60161), D, E and F (0.79989) agree with the brief.

## Commands

```bash
npm ci
npm test               # vitest: 68 tests (engine fixtures, brute force, invariants, products, exports, prerender wording)
npm run typecheck      # tsc --noEmit
npm run build          # client + SSR bundle + prerender → dist/   (BASE_PATH=/propchallenger/ for Pages)
npm run dev            # local dev server
npm run reference      # Python exact-rational reference (add -- --brute for 2^N enumeration, ~3 min)
```

CI (`.github/workflows/ci.yml`): typecheck, tests, both base-path builds, Python reference, gitleaks. Deploy (`.github/workflows/pages.yml`): on push to `main`, tests then builds and publishes `dist/` to GitHub Pages.

## Serving at prop.grok.me / propchallenger.com

The build is base-path aware via `BASE_PATH` (default `/`). **No DNS has been changed.** To serve from a custom domain apex later:

**Option A — GitHub Pages custom domain**
1. Set repo variables: `PAGES_BASE_PATH=/` and `PAGES_CUSTOM_DOMAIN=prop.grok.me` (or `propchallenger.com`). The deploy writes `dist/CNAME`.
2. DNS: for a subdomain (`prop.grok.me`) add `CNAME prop → blockchains.github.io`. For an apex (`propchallenger.com`) add `A` records 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153 (and `AAAA` 2606:50c0:8000::153 … 8003::153), optionally `www CNAME blockchains.github.io`.
3. Repo Settings → Pages → Custom domain → enter the host, wait for the certificate, tick *Enforce HTTPS*. Verify the domain under the account's Pages settings to prevent takeover.
4. Re-run the Pages workflow.

**Option B — import into Grok Build / another static host**
Build command `npm ci && npm run build` with `BASE_PATH=/`; output directory `dist/`; no environment secrets; no server required. Each route has its own `index.html`; `404.html` handles unknown paths.

Canonical URLs, `sitemap.xml` and `robots.txt` already point at `https://propchallenger.com`. If `prop.grok.me` becomes the long-term host instead, change `CANONICAL_ORIGIN` in `src/seo.ts`.

Environment variables: `BASE_PATH` (build), `CUSTOM_DOMAIN` (optional, writes CNAME). No runtime secrets.

## Commercial separation

- Product records keep `commercial` data in a separate object that the engine, prefill and `organicOrder()` never read. Ordering is alphabetical and published on the page.
- Commission disclosure renders only when `hasCommercialRelationship` is true (false for every record today). Outbound links require HTTPS and an allowlisted host (allowlist is empty).
- Tests assert commission/sponsor changes affect neither order nor prefill.

## Sample data

All four product records in `src/data/products.ts` are **fictional illustrative samples** ("Illustrative Firm Alpha" etc.) used to demonstrate prefill, multi-phase single-phase exploration, trailing-drawdown refusal, and missing-phase-data refusal. They make no claim about any real firm.

## Status

**Implemented and tested:** exact engine + fixtures/invariants/brute-force; validation and precision rejection; simulator route with hero, mode selection, strategy/challenge/calendar inputs (numeric + sliders, explain toggles, reset), assumptions summary, three cards always, recommended wording, three charts with text summaries and tables, explanatory panel, stress-test table; 2–4 scenario comparison with presets and in-place edit; illustrative prefill with unsupported-rule banners; share links (inputs only, `noindex`), browser-local save/delete, CSV (formula-safe) / JSON export, print report; homepage; guided demo; draft learn pages (`noindex`, not in sitemap); SEO title/description/canonical; CI + Pages.

**Awaiting configuration:** custom domain + DNS; Pages repo variables for apex base path.

**Awaiting reviewed data:** real product records, fees, source snapshots, editorial review of learn pages; outbound allowlist and any real commercial relationships.

**Deferred (not claimed):** seeded Monte Carlo and path charts; heatmaps; CSV trade-history import; AI explanation (deterministic template is used instead); server API/database (`SimulationScenario`, `SimulationResult`, `ScenarioComparison`, `EvidenceClaim`) and server-side saved/shared reports with revocable tokens; evidence-review component; analytics; Web Worker execution and cancellation; offline cache/service worker for expo mode; email delivery; all rules in brief §3 "Deferred" (daily loss, trailing drawdown, multi-phase, compounding, etc.).

**Known limitations:** share links are client-side URLs (cannot be revoked; no server tokens); local saves are per browser; the engine is binary fixed-outcome only; probabilities are doubles (exact states, checked mass) — not arbitrary-precision; charts are simple SVG without interactive tooltips (tables provided).

## Expo demo script

`/demo`: (1) 50% win rate, +3R/−1R → (2) 1% risk, 20 trades: **91.26%** target reached, 0.19% loss boundary, 8.55% still running → (3) 0.5% risk: **60.16%** → (4) 39.84% still running, not failed → (5) real rules add restrictions → open simulator comparison. Labelled "Hypothetical example. Not historical performance." All figures computed locally.
