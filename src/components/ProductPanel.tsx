import { disclosureFor, outboundDestination, organicOrder, prefillFromProduct, SAMPLE_PRODUCTS, SORTING_BASIS, type ChallengeProduct } from '../data/products';

export function UnsupportedRulesBanner({ rules, phaseNote, illustrative }: { rules: string[]; phaseNote?: string | null; illustrative: boolean }) {
  if (!rules.length && !phaseNote) return null;
  return (
    <div className="notice notice-warn banner" role="note" aria-label="Simplified model">
      <p>
        <strong>Simplified model:</strong> this calculation includes the selected target and static loss boundary, but does not model{' '}
        {rules.length ? rules.join(', ').toLowerCase() : 'every product rule'}.
      </p>
      {phaseNote && <p>{phaseNote}</p>}
      <p className="small">Simplified scenario based on selected published parameters. This is not an official pass probability.{illustrative ? ' The selected record is an illustrative sample, not a real product.' : ''}</p>
    </div>
  );
}

export function ReferralCard({ product }: { product: ChallengeProduct }) {
  const dest = outboundDestination(product);
  const disclosure = disclosureFor(product);
  return (
    <article className="referral-card" aria-labelledby={`rc-${product.id}`}>
      <h4 id={`rc-${product.id}`}>{product.name} {product.illustrative && <span className="tag">Illustrative sample</span>}</h4>
      <dl>
        <div><dt>Firm</dt><dd>{product.firmName}</dd></div>
        <div><dt>Current known fees</dt><dd>{product.fee.amount === null ? product.fee.note : `${product.fee.amount} ${product.fee.currency}`}</dd></div>
        <div><dt>Key restrictions</dt><dd>{product.keyRestrictions.join('; ')}</dd></div>
        <div><dt>Reviewed date</dt><dd>{product.reviewedDate ?? 'Not reviewed (illustrative sample)'}</dd></div>
        <div><dt>Important unknowns</dt><dd>{product.importantUnknowns.join('; ')}</dd></div>
        <div><dt>Sources</dt><dd>{product.sources.map((s) => `${s.label} [${s.snapshotId}]`).join('; ')}</dd></div>
      </dl>
      {dest ? (
        <p><a className="button secondary" href={dest.url} rel={dest.isReferral ? 'sponsored noopener' : 'noopener'} target="_blank">Review current terms at {product.firmName}</a></p>
      ) : (
        <p className="small">No outbound link: {product.illustrative ? 'this is an illustrative sample with no real provider.' : 'no reviewed destination is available.'}</p>
      )}
      {disclosure && <p className="small disclosure">{disclosure}</p>}
    </article>
  );
}

export function ProductPicker({ selectedId, phaseIndex, onSelect }: { selectedId: string | null; phaseIndex: number; onSelect: (id: string | null, phase: number) => void }) {
  const products = organicOrder(SAMPLE_PRODUCTS);
  const selected = products.find((p) => p.id === selectedId) ?? null;
  const decision = selected ? prefillFromProduct(selected, phaseIndex) : null;
  return (
    <div className="product-picker">
      <div className="notice">
        <p><strong>Illustrative sample data.</strong> The records below are fictional examples created to demonstrate how prefill and unsupported-rule labelling work. They do not describe any real firm or product. Reviewed product records are not yet loaded.</p>
      </div>
      <label htmlFor="product-select">Reviewed challenge starting point</label>
      <select id="product-select" value={selectedId ?? ''} onChange={(e) => onSelect(e.target.value || null, 0)}>
        <option value="">Choose a record…</option>
        {products.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.firmName} (illustrative)</option>)}
      </select>
      {selected && selected.phases.length > 1 && (
        <>
          <label htmlFor="phase-select">Phase to explore on its own</label>
          <select id="phase-select" value={phaseIndex} onChange={(e) => onSelect(selected.id, Number(e.target.value))}>
            {selected.phases.map((_, i) => <option key={i} value={i}>Phase {i + 1} of {selected.phases.length}</option>)}
          </select>
        </>
      )}
      <p className="small">Sorting basis: {SORTING_BASIS}</p>
      <p className="small">Only the nominal balance, one-phase target and static loss boundary are imported. Risk per trade and strategy performance are your assumptions and are never prefilled.</p>
      {decision && !decision.allowed && <p className="notice notice-warn" role="status">{decision.reason}</p>}
      {selected && <ReferralCard product={selected} />}
    </div>
  );
}
