import { describe, expect, it } from 'vitest';
import { calculateFromInput, formatProbability } from '../engine';
import { csvCell, decodeScenario, encodeScenario, resultToCsv, resultToJson, WORKED_EXAMPLE } from '../state/scenario';

describe('share links', () => {
  it('round-trips model inputs only', () => {
    const qs = encodeScenario({ ...WORKED_EXAMPLE, riskPct: '0.5' }, 'sample-one-step-100k@1');
    const d = decodeScenario(qs)!;
    expect(d.scenario.riskPct).toBe('0.5');
    expect(d.productVersionId).toBe('sample-one-step-100k@1');
    expect(qs).not.toMatch(/email|@[a-z]+\./i);
  });
  it('drops unsafe values', () => {
    const d = decodeScenario('wr=<script>&w=3&r=1e9&pv=../../etc')!;
    expect(d.scenario.winRatePct).toBe(WORKED_EXAMPLE.winRatePct);
    expect(d.scenario.riskPct).toBe(WORKED_EXAMPLE.riskPct);
    expect(d.productVersionId).toBeNull();
  });
});

describe('exports', () => {
  it('neutralises spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('+1')).toBe("'+1");
    expect(csvCell('-1')).toBe("'-1");
    expect(csvCell('@SUM')).toBe("'@SUM");
  });
  it('CSV and JSON include version, method, inputs, all three outcomes, omitted rules and statement', () => {
    const r = calculateFromInput(WORKED_EXAMPLE);
    const csv = resultToCsv(r, new Date('2026-10-18T00:00:00Z'));
    for (const s of ['Engine version', 'Method', 'Target reached within horizon', 'Loss boundary reached within horizon', 'Still running at horizon', 'Unsupported rules', 'Educational model only']) expect(csv).toContain(s);
    const j = JSON.parse(resultToJson(r));
    expect(j.engineVersion).toBe('1.0.0');
    expect(j.results.unresolvedProbability).toBeCloseTo(r.unresolvedProbability, 15);
  });
});

describe('probability formatting', () => {
  it('never rounds nonzero risk to zero or near-certainty to 100%', () => {
    expect(formatProbability(3.5e-11)).toBe('<0.01%');
    expect(formatProbability(0)).toBe('0%');
    expect(formatProbability(0.99999)).toBe('>99.99%');
    expect(formatProbability(0.912596702576)).toBe('91.26%');
    expect(formatProbability(0.0019111633)).toBe('0.19%');
  });
});
