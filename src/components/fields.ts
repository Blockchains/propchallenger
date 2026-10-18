import type { ScenarioInput } from '../engine';

export interface FieldDef {
  key: keyof ScenarioInput;
  label: string;
  unit: string;
  group: 'strategy' | 'challenge' | 'calendar';
  slider?: { min: number; max: number; step: number };
  explain: string;
  optional?: boolean;
  inputMode: 'decimal' | 'numeric';
}

export const FIELDS: FieldDef[] = [
  { key: 'winRatePct', label: 'Win rate', unit: '% of trades', group: 'strategy', slider: { min: 0, max: 100, step: 0.5 }, inputMode: 'decimal',
    explain: 'The probability that any single trade is a winner. The model treats every trade as independent with the same win probability. A desired win rate is not evidence a strategy achieves it; use realised results where available.' },
  { key: 'winnerR', label: 'Average winner', unit: 'R', group: 'strategy', slider: { min: 0.1, max: 10, step: 0.1 }, inputMode: 'decimal',
    explain: 'How much a winning trade makes, in multiples of R. One R is the baseline amount put at risk on a trade in this model. Winner: +3R means a winner gains three times the amount at risk.' },
  { key: 'loserR', label: 'Average loser', unit: 'R (magnitude)', group: 'strategy', slider: { min: 0.1, max: 5, step: 0.1 }, inputMode: 'decimal',
    explain: 'How much a losing trade loses, entered as a positive magnitude in R. Loser: −1R means a loser loses exactly the amount at risk. Slippage beyond the stop can make real losers larger than 1R.' },
  { key: 'costR', label: 'Cost per trade', unit: 'R', group: 'strategy', slider: { min: 0, max: 1, step: 0.01 }, inputMode: 'decimal',
    explain: 'A fixed cost (commission, spread, slippage) per completed trade, in R. It is deducted once from every winner and added once to every loser. It is not deducted again anywhere else.' },
  { key: 'riskPct', label: 'Risk per trade', unit: '% of starting balance', group: 'strategy', slider: { min: 0.1, max: 5, step: 0.05 }, inputMode: 'decimal',
    explain: 'The size of 1R as a percentage of the STARTING balance. It stays fixed for the whole scenario (no compounding). Changing it changes both how fast the target and the loss boundary can be reached.' },
  { key: 'startingBalance', label: 'Starting balance', unit: 'currency units', group: 'challenge', inputMode: 'decimal',
    explain: 'Nominal account size. In this percentage-based, cost-in-R model it only converts results into money; it does not change any probability.' },
  { key: 'targetPct', label: 'Profit target', unit: '% of starting balance', group: 'challenge', slider: { min: 1, max: 30, step: 0.5 }, inputMode: 'decimal',
    explain: 'A path counts as having reached the target when closed-trade P&L is greater than or equal to this percentage of the starting balance.' },
  { key: 'maxLossPct', label: 'Static maximum loss', unit: '% of starting balance', group: 'challenge', slider: { min: 1, max: 30, step: 0.5 }, inputMode: 'decimal',
    explain: 'A static loss boundary measured from the starting balance. A path counts as having reached it when closed-trade P&L is less than or equal to minus this percentage. Daily-loss and trailing rules are NOT modelled.' },
  { key: 'horizon', label: 'Trade horizon', unit: 'completed trades', group: 'challenge', slider: { min: 1, max: 200, step: 1 }, inputMode: 'numeric',
    explain: 'The maximum number of completed trades considered. Paths that reach neither boundary by then are reported as still running (unresolved), not as failed.' },
  { key: 'tradesPerWeek', label: 'Trades per week (optional)', unit: 'trades / week', group: 'calendar', optional: true, inputMode: 'decimal',
    explain: 'Used only for a simple conversion of trade counts into weeks. It is not a forecast of when a real challenge would finish.' },
];

export const GROUP_TITLES: Record<FieldDef['group'], string> = {
  strategy: 'Strategy assumptions',
  challenge: 'Challenge assumptions',
  calendar: 'Optional calendar assumption',
};
