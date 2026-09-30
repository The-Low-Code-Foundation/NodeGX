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

/** Derives the seed of the i-th sequence of a run from the run's seed — stable, well spread. */
export function sequenceSeed(runSeed: number, index: number): number {
  let h = (runSeed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (index + 1), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
