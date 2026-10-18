import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { calculateExactScenario, validateScenario, type ExactScenarioResult, type FieldError, type ProductContext, type ScenarioInput } from '../engine';
import { prefillFromProduct, SAMPLE_PRODUCTS } from '../data/products';
import { ScenarioEditor } from '../components/ScenarioEditor';
import { ResultsDashboard } from '../components/ResultsDashboard';
import { Comparison, COMPARISON_PRESETS, type ComparisonScenario } from '../components/Comparison';
import { StressTest } from '../components/StressTest';
import { ProductPicker, UnsupportedRulesBanner } from '../components/ProductPanel';
import { Head } from '../components/Head';
import { decodeScenario, encodeScenario, loadSaved, persistSaved, resultToCsv, resultToJson, WORKED_EXAMPLE, type SavedScenario } from '../state/scenario';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function download(name: string, mime: string, text: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

let idCounter = 0;
const newId = () => `s${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export function computeScenario(scenario: ScenarioInput, product: ProductContext | null): { result: ExactScenarioResult | null; errors: FieldError[]; warnings: string[] } {
  const v = validateScenario(scenario, product);
  if (!v.ok) return { result: null, errors: v.errors, warnings: [] };
  try {
    return { result: calculateExactScenario(v.value), errors: [], warnings: v.warnings };
  } catch (e) {
    return { result: null, errors: [{ field: 'scenario', message: (e as Error).message }], warnings: [] };
  }
}

export function Simulator() {
  const location = useLocation();
  const [mode, setMode] = useState<'custom' | 'product'>('custom');
  const [scenario, setScenario] = useState<ScenarioInput>(WORKED_EXAMPLE);
  const [productId, setProductId] = useState<string | null>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [comparison, setComparison] = useState<ComparisonScenario[]>([]);
  const [saved, setSaved] = useState<SavedScenario[]>([]);
  const [shared, setShared] = useState(false);
  const [status, setStatus] = useState('');
  const editorRef = useRef<HTMLDivElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Load shared scenario from the URL after hydration (keeps SSR markup stable).
  useEffect(() => {
    setSaved(loadSaved());
    const decoded = decodeScenario(location.search);
    if (decoded) {
      setShared(true);
      setScenario(decoded.scenario);
      const prod = decoded.productVersionId ? SAMPLE_PRODUCTS.find((p) => p.versionId === decoded.productVersionId) : null;
      if (prod) { setMode('product'); setProductId(prod.id); }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const product = mode === 'product' ? SAMPLE_PRODUCTS.find((p) => p.id === productId) ?? null : null;
  const decision = product ? prefillFromProduct(product, phaseIndex) : null;
  const productContext: ProductContext | null =
    product && decision?.allowed
      ? {
          productId: product.id,
          productVersionId: product.versionId,
          productName: product.name,
          illustrative: product.illustrative,
          unsupportedRules: decision.unsupportedRules,
          sourceVersionIds: product.sources.map((s) => s.snapshotId),
          phaseNote: decision.phaseNote ?? undefined,
        }
      : null;

  const effective: ScenarioInput = productContext && decision?.allowed ? { ...scenario, ...decision.fields } : scenario;
  const debounced = useDebounced(effective, 150);
  const effectiveKey = JSON.stringify(effective);
  const debouncedKey = JSON.stringify(debounced);
  const target = typeof window === 'undefined' ? effective : debounced;
  const { result, errors, warnings } = useMemo(() => computeScenario(target, productContext), [typeof window === 'undefined' ? effectiveKey : debouncedKey, productContext?.productVersionId, productContext?.phaseNote]);
  const pending = typeof window !== 'undefined' && effectiveKey !== debouncedKey;

  const productBlocked = mode === 'product' && (!product || !decision?.allowed);

  const addToComparison = (items: { title: string; scenario: ScenarioInput }[], replace = false) => {
    const mapped = items.map((i) => ({
      id: newId(),
      title: i.title,
      scenario: i.scenario,
      unsupportedRules: productContext?.unsupportedRules ?? [],
      evidenceSource: productContext ? `${productContext.productName} (${productContext.illustrative ? 'illustrative sample' : productContext.productVersionId})` : 'Custom assumptions entered by you',
    }));
    setComparison((prev) => (replace ? mapped : [...prev, ...mapped]).slice(0, 4));
  };

  const shareUrl = () => {
    const qs = encodeScenario(effective, productContext?.productVersionId);
    return `${window.location.origin}${window.location.pathname}?${qs}`;
  };

  return (
    <div className="simulator">
      <Head forceNoindex={shared} />
      <section className="hero">
        <div className="wrap">
          <p className="eyebrow">Challenge Fit Simulator · educational model</p>
          <h1>Does your strategy fit the challenge?</h1>
          <p className="lede">Explore how win rate, realised rewards, risk and trading time affect outcomes under a transparent model.</p>
          <div className="actions">
            <button type="button" className="button" onClick={() => { editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); editorRef.current?.querySelector('input')?.focus(); }}>Build my scenario</button>
            <button type="button" className="button secondary" onClick={() => { setMode('custom'); setScenario(WORKED_EXAMPLE); resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setStatus('Worked example loaded: 50% win rate, winner +3R, loser −1R, 1% risk, 20 trades. Hypothetical example, not historical performance.'); }}>Try a worked example</button>
          </div>
          <p className="small">Hypothetical worked example pre-loaded: 50% win rate, winner +3R; loser −1R, 1% fixed risk of starting balance, +10% target, −10% static loss boundary, 20 trades.</p>
        </div>
      </section>

      <div className="wrap sim-grid">
        <div className="sim-inputs" ref={editorRef} id="build">
          <h2>Your scenario</h2>
          <div className="mode-select" role="radiogroup" aria-label="Mode">
            <label><input type="radio" name="mode" checked={mode === 'custom'} onChange={() => setMode('custom')} /> Custom challenge</label>
            <label><input type="radio" name="mode" checked={mode === 'product'} onChange={() => setMode('product')} /> Use a reviewed challenge as a starting point</label>
          </div>
          {mode === 'product' && (
            <ProductPicker selectedId={productId} phaseIndex={phaseIndex} onSelect={(id, ph) => { setProductId(id); setPhaseIndex(ph); }} />
          )}
          {productContext && <UnsupportedRulesBanner rules={productContext.unsupportedRules} phaseNote={productContext.phaseNote} illustrative={productContext.illustrative} />}
          <p className="notice notice-warn">A desired win rate and target reward are not evidence that a strategy can achieve them. Use realised results where available.</p>
          <p className="small">One R is the baseline amount put at risk on a trade in this model.</p>
          <ScenarioEditor
            value={effective}
            onChange={setScenario}
            errors={errors}
            lockedFields={productContext ? ['startingBalance', 'targetPct', 'maxLossPct'] : []}
          />
          <div className="actions">
            <button type="button" className="button secondary" onClick={() => { setScenario(WORKED_EXAMPLE); setStatus('Reset to the worked example.'); }}>Reset to example</button>
          </div>
          <p className="sr-only" role="status" aria-live="polite">{status}</p>
          {status && <p className="small" aria-hidden="true">{status}</p>}
        </div>

        <div className="sim-results" ref={resultsRef} aria-busy={pending}>
          {productBlocked ? (
            <div className="notice notice-warn"><p><strong>No product calculation shown.</strong> {decision && !decision.allowed ? decision.reason : 'Choose a record, or switch to a custom challenge.'}</p></div>
          ) : result ? (
            <>
              {productContext && <p className="tag-line">Simplified scenario based on selected published parameters{productContext.illustrative ? ' (illustrative sample record)' : ''}.</p>}
              <ResultsDashboard r={result} scenario={debounced} warnings={warnings} />
              <div className="actions export-actions">
                <button type="button" className="button secondary" onClick={() => addToComparison([{ title: `Scenario ${comparison.length + 1}`, scenario: effective }])} disabled={comparison.length >= 4}>Add to comparison</button>
                <button type="button" className="button secondary" onClick={() => {
                  const item: SavedScenario = { id: newId(), title: `Saved ${new Date().toLocaleString('en-GB')}`, savedAt: new Date().toISOString(), scenario: effective, productVersionId: productContext?.productVersionId ?? null };
                  const next = [item, ...saved].slice(0, 50); setSaved(next); persistSaved(next); setStatus('Scenario saved in this browser only.');
                }}>Save in this browser</button>
                <button type="button" className="button secondary" onClick={async () => {
                  const url = shareUrl();
                  try { await navigator.clipboard.writeText(url); setStatus('Share link copied. It contains model inputs only.'); } catch { setStatus(`Share link: ${url}`); }
                }}>Copy share link</button>
                <button type="button" className="button secondary" onClick={() => download('propchallenger-scenario.csv', 'text/csv', resultToCsv(result))}>Export CSV</button>
                <button type="button" className="button secondary" onClick={() => download('propchallenger-scenario.json', 'application/json', resultToJson(result))}>Export JSON</button>
                <button type="button" className="button secondary" onClick={() => window.print()}>Print report</button>
              </div>
              <p className="small">Share links contain only the model inputs (and an optional product record ID). Nothing is uploaded; saved scenarios stay in this browser’s local storage.</p>
            </>
          ) : (
            <div className="notice notice-warn" role="alert"><p><strong>No result yet.</strong> Fix the highlighted inputs to calculate.</p><ul>{errors.map((e) => <li key={e.message}>{e.message}</li>)}</ul></div>
          )}
        </div>
      </div>

      {result && !productBlocked && (
        <div className="wrap">
          <StressTest base={result} scenario={debounced} />
        </div>
      )}

      <section className="wrap compare-section" aria-labelledby="compare-h">
        <h2 id="compare-h">Compare scenarios side by side</h2>
        <p>Compare two to four scenarios. Presets start from your current inputs.</p>
        <div className="actions">
          {COMPARISON_PRESETS.map((p) => (
            <button key={p.id} type="button" className="button secondary" onClick={() => addToComparison(p.build(effective).map((s, i) => ({ title: p.titles[i], scenario: s })), true)}>{p.label}</button>
          ))}
          {comparison.length > 0 && <button type="button" className="link-button" onClick={() => setComparison([])}>Clear comparison</button>}
        </div>
        {comparison.length === 1 && <p className="small">Add at least one more scenario to compare.</p>}
        <Comparison items={comparison} onChange={setComparison} />
      </section>

      {saved.length > 0 && (
        <section className="wrap saved" aria-labelledby="saved-h">
          <h2 id="saved-h">Saved in this browser</h2>
          <ul>
            {saved.map((s) => (
              <li key={s.id}>
                {s.title}{' '}
                <button type="button" className="link-button" onClick={() => { setMode('custom'); setScenario(s.scenario); }}>Load</button>{' '}
                <button type="button" className="link-button" onClick={() => { const next = saved.filter((x) => x.id !== s.id); setSaved(next); persistSaved(next); }}>Delete</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
