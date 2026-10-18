/** Shared scenario schema and result types for the Challenge Fit Simulator. */

export const ENGINE_VERSION = '1.0.0';
export const INPUT_SCHEMA_VERSION = 1;
export const EXACT_METHOD = 'exact-finite-horizon-dp-binomial-lattice' as const;

/**
 * Raw scenario input as entered by a user. Values are decimal strings so that
 * the exact precision the user typed is preserved (see decimal.ts).
 */
export interface ScenarioInput {
  /** Win rate, percent (0–100). Max 4 decimal places. */
  winRatePct: string;
  /** Average winner, in R (positive). Max 3 decimal places. */
  winnerR: string;
  /** Average loser magnitude, in R (positive; entered as a magnitude). Max 3 decimal places. */
  loserR: string;
  /** Fixed cost per completed trade, in R (≥ 0). Max 3 decimal places. */
  costR: string;
  /** Baseline risk per trade, percent of STARTING balance. Max 3 decimal places. */
  riskPct: string;
  /** Nominal starting balance (display/monetary conversion only). Max 2 decimal places. */
  startingBalance: string;
  /** Profit target, percent of starting balance. Max 3 decimal places. */
  targetPct: string;
  /** Static maximum loss, percent of starting balance. Max 3 decimal places. */
  maxLossPct: string;
  /** Maximum number of completed trades (integer). */
  horizon: string;
  /** Optional: trades per week, for a simple calendar conversion only. */
  tradesPerWeek?: string;
}

/** Context attached when a scenario was prefilled from a (reviewed or illustrative) product record. */
export interface ProductContext {
  productId: string;
  productVersionId: string;
  productName: string;
  illustrative: boolean;
  unsupportedRules: string[];
  sourceVersionIds: string[];
  /** e.g. "Phase 1 of 2 only" when a multi-phase product is explored one phase at a time. */
  phaseNote?: string;
}

export interface ValidatedScenarioInput {
  readonly __brand: 'ValidatedScenarioInput';
  readonly schemaVersion: number;
  /** Echo of the normalised decimal strings. */
  readonly raw: Readonly<Required<Omit<ScenarioInput, 'tradesPerWeek'>>> & { tradesPerWeek: string | null };
  /** Probability of a winning trade, as a double (used only for probability mass). */
  readonly p: number;
  readonly winnerR: number;
  readonly loserR: number;
  readonly costR: number;
  readonly riskFraction: number;
  readonly startingBalance: number;
  readonly targetFraction: number;
  readonly maxLossFraction: number;
  readonly horizon: number;
  readonly tradesPerWeek: number | null;
  /**
   * Exact integer lattice (common units, reduced by GCD):
   *   net winner step  = winStep   (may be ≤ 0 when costs ≥ winner)
   *   net loser step   = -lossStep (lossStep > 0)
   *   pass when S ≥ targetUnits, fail when S ≤ -failUnits
   */
  readonly lattice: {
    readonly winStep: number;
    readonly lossStep: number;
    readonly targetUnits: number;
    readonly failUnits: number;
    /** One lattice unit expressed as a fraction of the starting balance. */
    readonly unitFractionOfBalance: number;
  };
  readonly product: ProductContext | null;
}

export interface FieldError {
  field: keyof ScenarioInput | 'scenario';
  message: string;
}

export type ValidationResult =
  | { ok: true; value: ValidatedScenarioInput; warnings: string[] }
  | { ok: false; errors: FieldError[] };

export interface TerminalState {
  /** P&L as a fraction of starting balance. */
  pnlFraction: number;
  /** P&L in currency units of the starting balance. */
  pnlMoney: number;
  wins: number;
  losses: number;
  probability: number;
}

export interface ExactScenarioResult {
  engineVersion: string;
  method: typeof EXACT_METHOD;
  methodDescription: string;
  boundaryConvention: {
    pass: string;
    fail: string;
    evaluation: string;
  };
  input: ValidatedScenarioInput;
  /** Probabilities within the horizon. */
  passProbability: number;
  failProbability: number;
  unresolvedProbability: number;
  /** Index n = 0..N: cumulative probability absorbed by the end of trade n. */
  cumulativePassByTrade: number[];
  cumulativeFailByTrade: number[];
  unresolvedByTrade: number[];
  /** Index n = 0..N (index 0 is always 0): probability the boundary is FIRST hit on trade n. */
  firstPassByTrade: number[];
  firstFailByTrade: number[];
  /** Active (unresolved) distribution after the final trade, sorted by P&L ascending. */
  terminalUnresolved: TerminalState[];
  /** E[min(stopping trade, N)]: expected completed trades until absorption or horizon. */
  expectedTradesUntilStop: number;
  /** Conditional on reaching the target; null (undefined), never 0, if no path passes. */
  conditionalMeanTradesToTarget: number | null;
  conditionalMedianTradesToTarget: number | null;
  expectancyR: number;
  expectancyMoney: number;
  breakevenWinRate: { value: number; meaningful: boolean; note: string };
  supportedAssumptions: string[];
  unsupportedRules: string[];
  realProductDataUsed: boolean;
  sourceVersionIds: string[];
  warnings: string[];
  numerical: {
    tolerance: number;
    probabilityMassError: number;
    representation: string;
  };
  runtime: {
    milliseconds: number;
    latticeStatesEvaluated: number;
    maxActiveStates: number;
  };
}

export class ScenarioRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ScenarioRejectedError';
  }
}
