/**
 * Shrinking (NSP-003 §2.3): on a mismatch, drop steps, then simplify values, then drop params,
 * re-running the failing predicate each time, until nothing smaller still fails. The result is
 * the shortest sequence that shows the difference, written as a replay scenario.
 *
 * Bounded: `maxRuns` predicate evaluations, so a slow target cannot hang a run. Off in PR CI
 * (NSP-003 §4); the unshrunk sequence and its seed are reported there and shrunk locally.
 */

import type { Step } from '../adapter';
import type { WorldScript } from '../world';

export interface Candidate {
  params: Record<string, unknown>;
  steps: Step[];
  /** NSP-007: carried through unchanged — the script is part of what reproduces the divergence. An `advance` step shrinks like any other (dropped, then halved). */
  world?: WorldScript;
}

export type Fails = (c: Candidate) => Promise<boolean>;

export interface ShrinkOptions {
  maxRuns?: number;
}

/** A ladder of simpler values for one value — each is tried in order. */
export function simplerValues(v: unknown): unknown[] {
  if (v === undefined) return [];
  if (v === null) return [undefined];
  if (typeof v === 'number') {
    if (v === 0) return [undefined];
    if (Number.isNaN(v) || !Number.isFinite(v)) return [0, undefined];
    const out: unknown[] = [0];
    if (Number.isInteger(v)) {
      if (Math.abs(v) > 1) out.push(v > 0 ? 1 : -1, Math.trunc(v / 2));
    } else out.push(Math.trunc(v));
    out.push(undefined);
    return out;
  }
  if (typeof v === 'string') return v === '' ? [undefined] : ['', v.slice(0, Math.floor(v.length / 2)), undefined];
  if (typeof v === 'boolean') return v ? [false, undefined] : [undefined];
  if (Array.isArray(v)) return v.length === 0 ? [undefined] : [[], v.slice(0, Math.floor(v.length / 2)), undefined];
  if (typeof v === 'object') return Object.keys(v).length === 0 ? [undefined] : [{}, undefined];
  return [undefined];
}

export async function shrink(initial: Candidate, fails: Fails, options: ShrinkOptions = {}): Promise<{ result: Candidate; runs: number }> {
  const maxRuns = options.maxRuns ?? 2000;
  let runs = 0;
  let current: Candidate = { params: { ...initial.params }, steps: [...initial.steps] };
  if (initial.world) current.world = initial.world;

  const tryOne = async (next: Candidate): Promise<boolean> => {
    if (runs >= maxRuns) return false;
    runs++;
    if (await fails(next)) {
      current = next;
      return true;
    }
    return false;
  };

  let progress = true;
  while (progress && runs < maxRuns) {
    progress = false;

    const withWorld = (c: { params: Record<string, unknown>; steps: Step[] }): Candidate => (current.world ? { ...c, world: current.world } : c);

    // 1. drop steps — chunks first (halves, quarters …), then single steps
    for (let chunk = Math.max(1, Math.floor(current.steps.length / 2)); chunk >= 1; chunk = Math.floor(chunk / 2)) {
      for (let i = 0; i + chunk <= current.steps.length; ) {
        const steps = [...current.steps.slice(0, i), ...current.steps.slice(i + chunk)];
        if (steps.length > 0 && (await tryOne(withWorld({ params: current.params, steps })))) progress = true;
        else i += chunk;
      }
      if (chunk === 1) break;
    }

    // 2. simplify step values (an `advance` halves its milliseconds)
    for (let i = 0; i < current.steps.length; i++) {
      const step = current.steps[i];
      if (step === 'settle') continue;
      if ('advance' in step) {
        if (step.advance > 0) {
          const steps = [...current.steps];
          steps[i] = { advance: Math.floor(step.advance / 2) };
          if (await tryOne(withWorld({ params: current.params, steps }))) progress = true;
        }
        continue;
      }
      if (!('set' in step)) continue;
      for (const v of simplerValues(step.value)) {
        const steps = [...current.steps];
        steps[i] = v === undefined ? { set: step.set } : { set: step.set, value: v };
        if (await tryOne(withWorld({ params: current.params, steps }))) {
          progress = true;
          break;
        }
      }
    }

    // 3. drop params, then simplify the ones that stay
    for (const name of Object.keys(current.params)) {
      const params = { ...current.params };
      delete params[name];
      if (await tryOne(withWorld({ params, steps: current.steps }))) progress = true;
    }
    for (const name of Object.keys(current.params)) {
      for (const v of simplerValues(current.params[name])) {
        if (v === undefined) continue;
        const params = { ...current.params, [name]: v };
        if (await tryOne(withWorld({ params, steps: current.steps }))) {
          progress = true;
          break;
        }
      }
    }
  }
  return { result: current, runs };
}
