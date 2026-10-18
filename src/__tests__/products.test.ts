import { describe, expect, it } from 'vitest';
import { disclosureFor, organicOrder, outboundDestination, prefillFromProduct, SAMPLE_PRODUCTS, type ChallengeProduct } from '../data/products';
import { calculateExactScenario, validateScenario } from '../engine';
import { WORKED_EXAMPLE } from '../state/scenario';

const byId = (id: string) => SAMPLE_PRODUCTS.find((p) => p.id === id)!;

describe('product prefill', () => {
  it('imports only balance, target and static loss; never risk or strategy', () => {
    const d = prefillFromProduct(byId('sample-one-step-100k'));
    expect(d.allowed).toBe(true);
    if (d.allowed) {
      expect(Object.keys(d.fields).sort()).toEqual(['maxLossPct', 'startingBalance', 'targetPct']);
      expect(d.label).toBe('Simplified scenario based on selected published parameters.');
      expect(d.unsupportedRules.length).toBeGreaterThan(0);
    }
  });
  it('multi-phase: single-phase exploration only, never whole-programme', () => {
    const d = prefillFromProduct(byId('sample-two-step-50k'), 0);
    expect(d.allowed).toBe(true);
    if (d.allowed) {
      expect(d.phaseNote).toMatch(/phase 1 of 2 only/);
      expect(d.phaseNote).toMatch(/not whole-programme completion/);
      expect(d.phaseNote).toMatch(/must not be multiplied/);
    }
  });
  it('disables prefill for trailing drawdown and missing phase data', () => {
    const t = prefillFromProduct(byId('sample-trailing-25k'));
    expect(t.allowed).toBe(false);
    const u = prefillFromProduct(byId('sample-unknown-phases'));
    expect(u.allowed).toBe(false);
    if (!u.allowed) expect(u.reason).toMatch(/not available/);
  });
  it('all sample records are labelled illustrative and carry version + source snapshot ids', () => {
    for (const p of SAMPLE_PRODUCTS) {
      expect(p.illustrative).toBe(true);
      expect(p.reviewState).toBe('illustrative-sample');
      expect(p.versionId).toMatch(/@\d+$/);
      expect(p.sources.every((s) => s.snapshotId.startsWith('illustrative-'))).toBe(true);
    }
  });
  it('product context flows into the result (unsupported rules, versions, not real data)', () => {
    const p = byId('sample-one-step-100k');
    const d = prefillFromProduct(p);
    if (!d.allowed) throw new Error('expected allowed');
    const v = validateScenario({ ...WORKED_EXAMPLE, ...d.fields }, {
      productId: p.id, productVersionId: p.versionId, productName: p.name, illustrative: true,
      unsupportedRules: d.unsupportedRules, sourceVersionIds: p.sources.map((s) => s.snapshotId),
    });
    if (!v.ok) throw new Error('invalid');
    const r = calculateExactScenario(v.value);
    expect(r.unsupportedRules).toEqual(p.unsupportedRules);
    expect(r.sourceVersionIds).toEqual(['illustrative-one-step-100k-v1']);
    expect(r.realProductDataUsed).toBe(false);
  });
});

describe('commercial separation', () => {
  const withCommercial = (p: ChallengeProduct, commissionRatePct: number, sponsor: boolean): ChallengeProduct => ({
    ...p, commercial: { ...p.commercial, hasCommercialRelationship: true, commissionRatePct, sponsor, referralUrl: 'https://partner.example/ref' },
  });
  it('commission and sponsor status do not change organic order', () => {
    const baseline = organicOrder(SAMPLE_PRODUCTS).map((p) => p.id);
    const boosted = SAMPLE_PRODUCTS.map((p, i) => withCommercial(p, 50 - i * 10, i === SAMPLE_PRODUCTS.length - 1));
    expect(organicOrder(boosted).map((p) => p.id)).toEqual(baseline);
    expect(organicOrder([...boosted].reverse()).map((p) => p.id)).toEqual(baseline);
  });
  it('commission does not affect calculation results', () => {
    const p = byId('sample-one-step-100k');
    const d1 = prefillFromProduct(p); const d2 = prefillFromProduct(withCommercial(p, 40, true));
    expect(d2).toEqual(d1);
  });
  it('disclosure renders only when a commercial relationship exists', () => {
    for (const p of SAMPLE_PRODUCTS) expect(disclosureFor(p)).toBeNull();
    expect(disclosureFor(withCommercial(byId('sample-one-step-100k'), 10, false))).toMatch(/does not change the calculation or your comparison order/);
  });
  it('outbound destinations must be https and allowlisted', () => {
    const p = withCommercial(byId('sample-one-step-100k'), 10, false);
    expect(outboundDestination(p)).toBeNull(); // empty allowlist
    expect(outboundDestination(p, ['partner.example'])).toEqual({ url: 'https://partner.example/ref', isReferral: true });
    const http = { ...p, commercial: { ...p.commercial, referralUrl: 'http://partner.example/ref' } };
    expect(outboundDestination(http, ['partner.example'])).toBeNull();
    const js = { ...p, commercial: { ...p.commercial, referralUrl: 'javascript:alert(1)' } };
    expect(outboundDestination(js, ['partner.example'])).toBeNull();
  });
});
