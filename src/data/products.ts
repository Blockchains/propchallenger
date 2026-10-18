/**
 * Challenge catalogue records.
 *
 * IMPORTANT: every record below is an ILLUSTRATIVE SAMPLE created for this
 * repository. None describes a real firm or product, none has been reviewed
 * against a published source, and no fee, rule or date here should be read as
 * a claim about any real company. Replace with reviewed records (with source
 * snapshots) before presenting anything as real product data.
 *
 * Commercial fields live in a separate `commercial` object. They are never read
 * by the calculation engine, compatibility checks or organic ordering.
 */

export type LossBoundaryType = 'static' | 'trailing' | 'unknown';

export interface SourceReference {
  snapshotId: string;
  label: string;
  url: string | null;
  capturedDate: string | null;
}

export interface PhaseRules {
  targetPct: number | null;
  /** Static overall loss from starting balance, if that is the documented convention. */
  maxLossPct: number | null;
  lossBoundaryType: LossBoundaryType;
}

export interface CommercialRelationship {
  hasCommercialRelationship: boolean;
  /** Only shown when hasCommercialRelationship is true and URL host is allowlisted. */
  referralUrl: string | null;
  officialUrl: string | null;
  commissionRatePct: number | null;
  sponsor: boolean;
}

export interface ChallengeProduct {
  id: string;
  versionId: string;
  name: string;
  firmName: string;
  illustrative: boolean;
  nominalBalance: number;
  currency: string;
  phases: PhaseRules[];
  /** False when the number/rules of phases are not known from a reviewed source. */
  phaseDataAvailable: boolean;
  /** Rules present on the product that the P0 engine does NOT model. */
  unsupportedRules: string[];
  fee: { amount: number | null; currency: string; note: string };
  keyRestrictions: string[];
  importantUnknowns: string[];
  reviewedDate: string | null;
  reviewState: 'illustrative-sample' | 'reviewed' | 'stale';
  sources: SourceReference[];
  commercial: CommercialRelationship;
}

const NO_COMMERCIAL: CommercialRelationship = {
  hasCommercialRelationship: false,
  referralUrl: null,
  officialUrl: null,
  commissionRatePct: null,
  sponsor: false,
};

const ILLUSTRATIVE_SOURCE = (id: string): SourceReference => ({
  snapshotId: `illustrative-${id}-v1`,
  label: 'Illustrative sample created by PropChallenger for demonstration. Not a published product.',
  url: null,
  capturedDate: null,
});

export const SAMPLE_PRODUCTS: ChallengeProduct[] = [
  {
    id: 'sample-one-step-100k',
    versionId: 'sample-one-step-100k@1',
    name: 'Sample One-Step 100K',
    firmName: 'Illustrative Firm Alpha',
    illustrative: true,
    nominalBalance: 100000,
    currency: 'USD',
    phases: [{ targetPct: 10, maxLossPct: 10, lossBoundaryType: 'static' }],
    phaseDataAvailable: true,
    unsupportedRules: ['Daily loss limit (5% illustrative)', 'Minimum trading-day requirement'],
    fee: { amount: null, currency: 'USD', note: 'No fee shown: illustrative sample.' },
    keyRestrictions: ['Daily loss limit', 'Minimum trading days'],
    importantUnknowns: ['Whether boundaries are checked on closed-trade or intraday equity', 'Fee and refund terms'],
    reviewedDate: null,
    reviewState: 'illustrative-sample',
    sources: [ILLUSTRATIVE_SOURCE('one-step-100k')],
    commercial: NO_COMMERCIAL,
  },
  {
    id: 'sample-two-step-50k',
    versionId: 'sample-two-step-50k@1',
    name: 'Sample Two-Step 50K',
    firmName: 'Illustrative Firm Beta',
    illustrative: true,
    nominalBalance: 50000,
    currency: 'USD',
    phases: [
      { targetPct: 8, maxLossPct: 10, lossBoundaryType: 'static' },
      { targetPct: 5, maxLossPct: 10, lossBoundaryType: 'static' },
    ],
    phaseDataAvailable: true,
    unsupportedRules: ['Additional evaluation phase (phase 2)', 'Daily loss limit', 'News-event trading restrictions'],
    fee: { amount: null, currency: 'USD', note: 'No fee shown: illustrative sample.' },
    keyRestrictions: ['Two evaluation phases', 'Daily loss limit', 'News restrictions'],
    importantUnknowns: ['Time limits per phase', 'Whether phase 2 resets the balance'],
    reviewedDate: null,
    reviewState: 'illustrative-sample',
    sources: [ILLUSTRATIVE_SOURCE('two-step-50k')],
    commercial: NO_COMMERCIAL,
  },
  {
    id: 'sample-trailing-25k',
    versionId: 'sample-trailing-25k@1',
    name: 'Sample Trailing 25K',
    firmName: 'Illustrative Firm Gamma',
    illustrative: true,
    nominalBalance: 25000,
    currency: 'USD',
    phases: [{ targetPct: 6, maxLossPct: 6, lossBoundaryType: 'trailing' }],
    phaseDataAvailable: true,
    unsupportedRules: ['Trailing drawdown', 'Consistency rule'],
    fee: { amount: null, currency: 'USD', note: 'No fee shown: illustrative sample.' },
    keyRestrictions: ['Trailing drawdown', 'Consistency rule'],
    importantUnknowns: ['Whether the trailing boundary locks at breakeven'],
    reviewedDate: null,
    reviewState: 'illustrative-sample',
    sources: [ILLUSTRATIVE_SOURCE('trailing-25k')],
    commercial: NO_COMMERCIAL,
  },
  {
    id: 'sample-unknown-phases',
    versionId: 'sample-unknown-phases@1',
    name: 'Sample Programme (phase data unavailable)',
    firmName: 'Illustrative Firm Delta',
    illustrative: true,
    nominalBalance: 200000,
    currency: 'USD',
    phases: [],
    phaseDataAvailable: false,
    unsupportedRules: ['Unknown phase structure'],
    fee: { amount: null, currency: 'USD', note: 'No fee shown: illustrative sample.' },
    keyRestrictions: ['Not documented in this sample'],
    importantUnknowns: ['Number of phases', 'Targets and loss boundaries'],
    reviewedDate: null,
    reviewState: 'illustrative-sample',
    sources: [ILLUSTRATIVE_SOURCE('unknown-phases')],
    commercial: NO_COMMERCIAL,
  },
];

export type PrefillDecision =
  | {
      allowed: true;
      phaseIndex: number;
      fields: { startingBalance: string; targetPct: string; maxLossPct: string };
      label: string;
      phaseNote: string | null;
      unsupportedRules: string[];
    }
  | { allowed: false; reason: string };

/**
 * Decide what (if anything) may be imported from a product into the simulator.
 * Only nominal balance, one-phase target and static loss boundary are imported.
 * Risk per trade and strategy performance are NEVER prefilled: they are user assumptions.
 */
export function prefillFromProduct(product: ChallengeProduct, phaseIndex = 0): PrefillDecision {
  if (!product.phaseDataAvailable || product.phases.length === 0) {
    return { allowed: false, reason: 'Prefill disabled: the phase structure, target and loss boundary for this product are not available from a reviewed source.' };
  }
  const phase = product.phases[phaseIndex];
  if (!phase) return { allowed: false, reason: 'Prefill disabled: that phase is not documented.' };
  if (phase.lossBoundaryType !== 'static') {
    return {
      allowed: false,
      reason: `Prefill disabled: this product uses a ${phase.lossBoundaryType === 'trailing' ? 'trailing' : 'undocumented'} loss boundary, which the P0 model (static boundary only) cannot represent reliably.`,
    };
  }
  if (phase.targetPct === null || phase.maxLossPct === null) {
    return { allowed: false, reason: 'Prefill disabled: target or static loss boundary is missing from the record.' };
  }
  const multi = product.phases.length > 1;
  return {
    allowed: true,
    phaseIndex,
    fields: { startingBalance: String(product.nominalBalance), targetPct: String(phase.targetPct), maxLossPct: String(phase.maxLossPct) },
    label: 'Simplified scenario based on selected published parameters.',
    phaseNote: multi
      ? `Single-phase exploration: phase ${phaseIndex + 1} of ${product.phases.length} only. This is not whole-programme completion, and phase results must not be multiplied together.`
      : null,
    unsupportedRules: [...product.unsupportedRules],
  };
}

/** Published organic sorting basis. Commission, partner payment and sponsor status are never inputs. */
export const SORTING_BASIS =
  'Products are listed alphabetically by product name. Commission, partner payments and sponsor status are not used in ordering or compatibility.';

/** Organic ordering: deliberately ignores `commercial`. */
export function organicOrder(products: ChallengeProduct[]): ChallengeProduct[] {
  const strip = products.map((p) => ({ p, sortKey: p.name.toLocaleLowerCase('en-GB') }));
  strip.sort((a, b) => (a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : a.p.id < b.p.id ? -1 : 1));
  return strip.map((s) => s.p);
}

/** Outbound hosts approved for referral/official links. Empty until reviewed partnerships exist. */
export const OUTBOUND_ALLOWLIST: readonly string[] = [];

export function outboundDestination(product: ChallengeProduct, allowlist: readonly string[] = OUTBOUND_ALLOWLIST): { url: string; isReferral: boolean } | null {
  const candidate = product.commercial.hasCommercialRelationship && product.commercial.referralUrl ? product.commercial.referralUrl : product.commercial.officialUrl;
  if (!candidate) return null;
  try {
    const u = new URL(candidate);
    if (u.protocol !== 'https:' || !allowlist.includes(u.hostname)) return null;
    return { url: u.toString(), isReferral: candidate === product.commercial.referralUrl && product.commercial.hasCommercialRelationship };
  } catch {
    return null;
  }
}

export const COMMISSION_DISCLOSURE =
  'We may receive a commission if you purchase through this link. It does not change the calculation or your comparison order.';

/** Disclosure renders only when a real commercial relationship exists. */
export function disclosureFor(product: ChallengeProduct): string | null {
  return product.commercial.hasCommercialRelationship ? COMMISSION_DISCLOSURE : null;
}
