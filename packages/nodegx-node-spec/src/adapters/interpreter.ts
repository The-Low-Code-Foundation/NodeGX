/**
 * The spec interpreter as a target (NSP-002 §2.2) — the reference every other adapter is
 * compared with. Thin: `mount / set / signal / settle / trace` in interpreter.ts already record
 * the format; this maps the adapter contract onto them.
 *
 * `settle()` settles every live instance, in mount order, because the contract's settle is a
 * property of the target, not of one handle (the runtime drains one context).
 */

import type { AnyNodeSpec } from '../spec';
import type { Handle, TargetAdapter } from '../adapter';
import type { TraceEvent } from '../trace';
import { mount, set, signal, settle, trace, type Instance } from '../interpreter';
import { specFor } from '../nodes';

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
  return {
    name: 'interpreter',
    mount(type, params) {
      const spec = resolve(type);
      if (!spec) throw new Error(`interpreter: no spec for "${type}"`);
      const h: InterpreterHandle = { id: `${type}#${next++}`, type, inst: mount(spec, params) };
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
    }
  };
}
