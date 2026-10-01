/**
 * A seeded generator — mulberry32 (NSP-003 §2.2). In-house rather than `fast-check`, for the
 * lockfile reason README §9 gives. The seed is the ONLY input: the same seed yields the same
 * sequence of numbers on any machine (AC2), and every run prints its seed.
 */

export interface Rng {
  /** [0, 1) */
  next(): number;
  int(maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  chance(p: number): boolean;
}

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  const next = (): number => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (max) => Math.floor(next() * max),
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p
  };
}

/** The murmur3 finaliser: every input bit moves about half the output bits. */
function mix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Derives the seed of the i-th sequence of a run from the run's seed — stable, well spread, and
 * DIFFERENT across runs. The run seed is mixed on its own before the index joins it.
 *
 * ⚠️ NSP-013 §6.1b T4 — it used to start from `runSeed ^ (index + 1)`, so run d's sequence i WAS
 * run d′'s sequence i′ whenever `d ^ (i+1) = d′ ^ (i′+1)`. The default run seed is the UTC day,
 * and adjacent days differ in their low bits: day 20727 and 20728 shared 192 of their 200
 * sequences, and thirty days of PR-CI (6,000 plays) reached 429 distinct ones. Pinned in
 * tests/runner.test.ts: adjacent run seeds share no sequence in their first 200.
 */
export function sequenceSeed(runSeed: number, index: number): number {
  return mix32((mix32((runSeed ^ 0x9e3779b9) >>> 0) + Math.imul(index + 1, 0x9e3779b9)) >>> 0);
}
