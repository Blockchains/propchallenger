import { describe, expect, it } from 'vitest';
import { render, ROUTES } from '../entry-server';

const BANNED = [
  /chance of passing/i,
  /guaranteed (pass|to pass|funding|payout)/i,
  /official pass probability(?! is| —)/i,
  /best chance to get funded/i,
  /increase risk to pass/i,
  /buy now/i,
  /expires today/i,
];

describe('prerendered pages', () => {
  it('simulator page renders hero, both modes, three outcome cards with horizon, and wording from the brief', () => {
    const { html, meta, canonical } = render('/tools/challenge-fit-simulator');
    expect(meta.title).toBe('Prop Challenge Simulator: Explore Risk, Targets and Trade Horizons | PropChallenger');
    expect(meta.description).toBe('Model how win rate, realised reward, risk and trade limits interact with a simplified prop challenge. Compare outcomes and inspect every assumption.');
    expect(canonical).toBe('https://propchallenger.com/tools/challenge-fit-simulator');
    for (const s of [
      'Does your strategy fit the challenge?',
      'Explore how win rate, realised rewards, risk and trading time affect outcomes under a transparent model.',
      'Build my scenario', 'Try a worked example', 'Custom challenge', 'Use a reviewed challenge as a starting point',
      'Target reached', 'Loss boundary reached', 'Still running',
      'Under the assumptions entered, the model reaches the target in 91.26% of paths within twenty trades.',
      'This is not a forecast of your real-world performance. The model does not include every rule of a real challenge.',
      'A desired win rate and target reward are not evidence that a strategy can achieve them. Use realised results where available.',
      'What drove the result', 'What remains unfinished', 'What the model excludes', 'Which assumptions matter most', 'Why expectancy and completion probability differ',
      'Cumulative outcomes by trade', 'First target-hit distribution', 'Where still-running paths finish',
      'In real trading, win rate, reward size and execution costs may change together.',
    ]) expect(html).toContain(s.replace(/&/g, '&amp;'));
    expect(html.match(/Within 20 trades under this model\./g)?.length).toBe(3);
  });
  it('homepage carries the product promise', () => {
    const { html } = render('/');
    expect(html).toContain('See how your assumptions fit the challenge.');
    expect(html).toContain('Model targets, loss limits and trading horizons. Compare the outcomes, inspect the assumptions and understand what the model does not include.');
  });
  it('demo is labelled hypothetical', () => {
    expect(render('/demo').html).toContain('Hypothetical example. Not historical performance.');
  });
  it('no page contains guaranteed-pass or manipulative language', () => {
    for (const r of ROUTES) {
      const { html } = render(r);
      for (const b of BANNED) expect(html, `${r} ${b}`).not.toMatch(b);
    }
  });
  it('no page claims a commission relationship for illustrative data', () => {
    for (const r of ROUTES) expect(render(r).html).not.toContain('We may receive a commission');
  });
});

import { renderToString } from 'react-dom/server';
import { UnsupportedRulesBanner } from '../components/ProductPanel';
describe('unsupported rules banner', () => {
  it('names the specific rules and the simplified-scenario label', () => {
    const html = renderToString(<UnsupportedRulesBanner rules={['Daily loss limit', 'Consistency rule']} phaseNote="Single-phase exploration: phase 1 of 2 only." illustrative />);
    expect(html).toContain('Simplified model:');
    expect(html).toContain('does not model');
    expect(html).toContain('daily loss limit, consistency rule');
    expect(html).toContain('Simplified scenario based on selected published parameters.');
    expect(html).toContain('illustrative sample');
  });
});
