import { formatProbability, formatR, tradesPhrase, type ExactScenarioResult } from '../engine';

/**
 * Deterministic explanation template (no AI). Every number comes from the engine result.
 */
export function headlineSentence(r: ExactScenarioResult): string {
  return `Under the assumptions entered, the model reaches the target in ${formatProbability(r.passProbability)} of paths within ${tradesPhrase(r.input.horizon)}.`;
}

export function explain(r: ExactScenarioResult): { drivers: string[]; unfinished: string; whyDiffer: string } {
  const i = r.input;
  const L = i.lattice;
  const winsNeeded = L.winStep > 0 ? Math.ceil(L.targetUnits / L.winStep) : null;
  const lossesToFail = Math.ceil(L.failUnits / L.lossStep);
  const netWin = (i.winnerR - i.costR);
  const netLoss = (i.loserR + i.costR);
  const drivers: string[] = [];
  drivers.push(
    `Each trade risks ${i.raw.riskPct}% of the starting balance. Net of costs a winner moves P&L by ${(netWin * i.riskFraction * 100).toFixed(3).replace(/\.?0+$/, '')}% (${formatR(netWin)}) and a loser by −${(netLoss * i.riskFraction * 100).toFixed(3).replace(/\.?0+$/, '')}% (${formatR(-netLoss)}).`,
  );
  drivers.push(
    winsNeeded === null
      ? 'A winning trade does not increase P&L after costs, so the target cannot be reached.'
      : `With no losers at all, the target needs ${winsNeeded} consecutive winner${winsNeeded === 1 ? '' : 's'}; with no winners, ${lossesToFail} consecutive loser${lossesToFail === 1 ? '' : 's'} reach the loss boundary.`,
  );
  drivers.push(
    `The distance to the target (${i.raw.targetPct}%) and to the loss boundary (${i.raw.maxLossPct}%) measured in trades — not the balance itself — drives the result. In this fixed-risk model the starting balance does not change any probability.`,
  );
  const unfinished =
    r.unresolvedProbability > 0
      ? `${formatProbability(r.unresolvedProbability)} of modelled paths are still running after ${tradesPhrase(i.horizon)}: they reached neither the target nor the loss boundary. That is not the same as failing; with more trades some would pass and some would fail. This model does not estimate an unlimited-horizon outcome.`
      : `No modelled path is still running after ${tradesPhrase(i.horizon)}.`;
  const whyDiffer = `Net expectancy is ${formatR(Number(r.expectancyR.toFixed(4)))} per trade: the average result of one unrestricted trade. Target-hit probability is different: paths stop at the first boundary, the horizon is limited, and the order of wins and losses matters. A positive expectancy does not mean the target will be reached within the horizon, and a negative one does not mean it cannot be.`;
  return { drivers, unfinished, whyDiffer };
}

export const MODEL_EXCLUSIONS: string[] = [
  'Daily-loss limits',
  'Trailing drawdown',
  'Intraday (open-trade) equity monitoring',
  'Multiple simultaneous or correlated positions',
  'Dynamic position sizing and compounded-equity risk',
  'Variable winners and losers (every winner and every loser is identical here)',
  'Streaks, regime changes or any dependence between trades',
  'News-event restrictions, minimum profitable days and consistency rules',
  'Multiple evaluation phases and funded-stage reward eligibility',
  'Broker execution, slippage beyond the fixed cost, and live data',
];
