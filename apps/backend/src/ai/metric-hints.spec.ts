import { buildMetricHints } from './metric-hints';

function seeded(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

describe('buildMetricHints', () => {
  it('returns two different metric targets', () => {
    const hints = buildMetricHints(seeded(7));
    expect(hints).toHaveLength(2);
    expect(hints[0]).not.toBe(hints[1]);
  });

  it('varies across calls', () => {
    const runs = new Set(
      Array.from({ length: 10 }, (_, i) => buildMetricHints(seeded(i + 1)).join('|')),
    );
    expect(runs.size).toBeGreaterThan(5);
  });

  it('avoids the overused 30–40% defaults', () => {
    for (let i = 1; i <= 200; i += 1) {
      for (const hint of buildMetricHints(seeded(i))) {
        expect(hint).not.toMatch(/^(30|32|35|38|40)%/);
      }
    }
  });
});
