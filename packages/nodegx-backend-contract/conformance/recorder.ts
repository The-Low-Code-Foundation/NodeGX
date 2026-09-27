/**
 * What the suite actually touched — recorded, not annotated.
 *
 * BRG-003 §3.5. The register in {@link ./coverage} says which cases cover which
 * member of the storage surface. Left there, that is a **claim**: a line of
 * prose in a data structure, which stays true exactly as long as nobody edits
 * the case it names. Phase 84's reading applies —
 * `verify-the-consequence-not-just-the-mechanism` — so the gate does not
 * believe the register. It wraps the adapter, runs each case on its own,
 * records every member that case reached, and fails the register where the
 * claim and the recording disagree.
 *
 * This is also the only way the register can survive a refactor: a case that
 * stops calling `schema.addColumn` stops covering it, and the gate says so at
 * the moment it happens rather than the day a second adapter gets it wrong.
 *
 * @module conformance/recorder
 */

import type { IStorageAdapter, IStorageSchema } from '../src/storage';

/** `adapter:query`, `schema:addColumn` — the two objects a case can reach. */
export type RecordedMember = string;

export interface SurfaceRecorder {
  /** Start attributing calls to this case. */
  begin(caseId: string): void;
  /** Stop attributing (calls made outside a case are dropped, not misfiled). */
  end(): void;
  /** Case id → the members that case reached. */
  readonly byCase: ReadonlyMap<string, ReadonlySet<RecordedMember>>;
  /** Every case that reached `member`, in the order they ran. */
  callersOf(member: RecordedMember): readonly string[];
  /** Everything reached by anything. */
  reached(): ReadonlySet<RecordedMember>;
  /**
   * File one member against the case in flight. Called only by the proxies
   * below; a call made outside a case is dropped rather than misfiled.
   */
  note(member: RecordedMember): void;
}

export function createRecorder(): SurfaceRecorder {
  const byCase = new Map<string, Set<RecordedMember>>();
  let current: string | undefined;

  return {
    begin(caseId: string): void {
      current = caseId;
      if (!byCase.has(caseId)) byCase.set(caseId, new Set());
    },
    end(): void {
      current = undefined;
    },
    byCase,
    callersOf(member: RecordedMember): readonly string[] {
      const hits: string[] = [];
      for (const [caseId, members] of byCase) if (members.has(member)) hits.push(caseId);
      return hits;
    },
    reached(): ReadonlySet<RecordedMember> {
      const all = new Set<RecordedMember>();
      for (const members of byCase.values()) for (const m of members) all.add(m);
      return all;
    },
    note(member: RecordedMember): void {
      if (current) byCase.get(current)?.add(member);
    }
  };
}

/**
 * A proxy recording every member read off `target`.
 *
 * 🔴 It records the **read**, not the call. `context.ts` takes
 * `adapter.schemaManager` once and keeps it, and several cases hold a method
 * reference before invoking it; recording at invocation would need every call
 * shape wrapped, and recording the read is both simpler and strictly more
 * generous — which is the safe direction for a gate whose failure mode is a
 * false accusation against a case that did cover the member.
 */
function recordReads<T extends object>(target: T, rec: SurfaceRecorder, namespace: string): T {
  return new Proxy(target, {
    get(obj, prop, receiver) {
      if (typeof prop === 'string') rec.note(`${namespace}:${prop}`);
      const value = Reflect.get(obj, prop, receiver);
      // Bind through the real object: `invoke()` in context.ts reads the
      // method off the adapter and `.call`s it with the proxy as `this`, and a
      // native class method reached that way must still see its own instance.
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(obj) : value;
    }
  });
}

/**
 * Wrap a connected adapter so a run attributes every member it reaches.
 *
 * The wrapper is transparent: the suite cannot tell it is there, which is the
 * point — a recorder that changed behaviour would be measuring itself.
 */
export function recordingAdapter(adapter: IStorageAdapter, recorder: SurfaceRecorder): IStorageAdapter {
  const schema = recordReads(adapter.schemaManager as IStorageSchema & object, recorder, 'schema');
  return new Proxy(adapter, {
    get(obj, prop, receiver) {
      if (typeof prop === 'string') recorder.note(`adapter:${prop}`);
      if (prop === 'schemaManager') return schema;
      const value = Reflect.get(obj, prop, receiver);
      return typeof value === 'function' ? (value as (...a: unknown[]) => unknown).bind(obj) : value;
    }
  });
}
