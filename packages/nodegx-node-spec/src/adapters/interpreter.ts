/**
 * The spec interpreter as a target (NSP-002 §2.2) — the reference every other adapter is
 * compared with. Thin: `mount / set / signal / settle / trace` in interpreter.ts already record
 * the format; this maps the adapter contract onto them.
 *
 * `settle()` settles every live instance, in mount order, because the contract's settle is a
 * property of the target, not of one handle (the runtime drains one context).
 *
 * The world (NSP-007): `install(world)` makes it the world every instance mounted until `restore`
 * is handed (the play's world); without one, each instance gets a fresh default world — the
 * behaviour every spec without `needs` had before. `advance` is the interpreter's own.
 */

import type { AnyNodeSpec } from '../spec';
import type { Handle, TargetAdapter } from '../adapter';
import type { TraceEvent } from '../trace';
import { advance, mount, set, signal, settle, trace, type Instance } from '../interpreter';
import { specFor } from '../nodes';
import type { World } from '../world';

export interface InterpreterHandle extends Handle {
  readonly inst: Instance;
}

export interface InterpreterAdapterOptions {
  /** Where specs come from; defaults to the package registry. */
  resolve?: (type: string) => AnyNodeSpec | undefined;
}

export function interpreterAdapter(options: InterpreterAdapterOptions = {}): TargetAdapter<InterpreterHandle> {
  const resolve = options.resolve ?? specFor;
  const live = new Map<string, InterpreterHandle>();
  let next = 0;
  let current: World | undefined;
  return {
    name: 'interpreter',
    mount(type, params) {
      const spec = resolve(type);
      if (!spec) throw new Error(`interpreter: no spec for "${type}"`);
      const h: InterpreterHandle = { id: `${type}#${next++}`, type, inst: mount(spec, params, current) };
      live.set(h.id, h);
      return h;
    },
    set(h, port, value) {
      set(h.inst, port, value);
    },
    signal(h, port) {
      signal(h.inst, port);
    },
    async settle() {
      for (const h of live.values()) settle(h.inst);
    },
    trace(h): TraceEvent[] {
      return trace(h.inst);
    },
    dispose(h) {
      live.delete(h.id);
    },
    install(world) {
      const previous = current;
      current = world;
      return () => {
        current = previous;
      };
    },
    async advance(h, ms) {
      advance(h.inst, ms);
    }
  };
}
