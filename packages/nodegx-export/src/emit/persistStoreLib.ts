/**
 * EXP-021 AC4 (P18 session 139) — a Global Store whose declarer authors Persist, emitted into the app:
 * `src/lib/persistStore.ts`, called once by each persisted store's module (`src/stores/<name>.ts`).
 *
 * Transcribed from `noodl-runtime/src/nodes/std-library/agent/globalstore.ts`: `configureStore` (the stored copy, under
 * `noodl_store_<Storage Key or Store Name>`, applied over the initial state in one commit; a value that is not a plain
 * object reported as a `load` error and ignored), `schedulePersist` / `persistNow` (every commit saved on the next turn,
 * coalesced, the whole state as JSON), `loadPersisted`, `resolveStorage` (`localStorage` on the global object, else no
 * storage and a `persist` error on the first save) and `reportError` (no listener: `console.error` with the store's name
 * and the phase).
 *
 * Two residuals, said in the module's own comment: the runtime loads when the first persisting declarer mounts and the
 * export when the store's module is imported (before the first render); and `@nodegx/core`'s store notifies on every
 * write (its CONTRACT C2), so a write that changed nothing saves the same JSON again where the runtime does not save.
 */

/** Where the module lands in the exported app. */
export const PERSIST_STORE_LIB_PATH = 'src/lib/persistStore.ts';

export function persistStoreLibSource(): string {
  return `//
// A Global Store with Persist on, transcribed from the interpreter it has to agree with:
// noodl-runtime/src/nodes/std-library/agent/globalstore.ts — configureStore (the stored copy applied over the
// initial state in one commit), loadPersisted, schedulePersist / persistNow (every commit saved on the next turn,
// coalesced) and reportError (with nothing listening, console.error with the store's name and the phase).
//
// The runtime loads when the first persisting Global Store node mounts; this loads when the store's module is
// imported, so the first render already reads the stored copy. @nodegx/core's store notifies on every write, so a
// write that changed nothing saves the same JSON again (the runtime skips it); what is stored is the same.
//
import type { Store } from '@nodegx/core';

/** The runtime's STORAGE_KEY_PREFIX. */
const STORAGE_KEY_PREFIX = 'noodl_store_';

/** The minimum a persistence backend provides — localStorage's shape. */
interface StoreStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function resolveStorage(): StoreStorage | null {
  const candidate = (globalThis as { localStorage?: StoreStorage }).localStorage;
  return candidate && typeof candidate.setItem === 'function' ? candidate : null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function reportError(storeName: string, phase: 'persist' | 'load', error: unknown): void {
  console.error(\`[GlobalStore:\${storeName}] \${phase}: \${String((error as Error)?.message || error)}\`);
}

/**
 * Keeps \`target\` in browser storage under \`noodl_store_<storageKey>\`: the stored copy is written over the initial
 * state now, and every change is saved on the next turn.
 */
export function persistStore<T extends object>(target: Store<T>, storageKey: string): void {
  const key = STORAGE_KEY_PREFIX + storageKey;
  const storage = resolveStorage();

  let persisted: Record<string, unknown> | undefined;
  if (storage) {
    try {
      const raw = storage.getItem(key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isPlainObject(parsed)) persisted = parsed;
        else reportError(target.name, 'load', new Error('persisted state is not an object; ignoring it'));
      }
    } catch (error) {
      reportError(target.name, 'load', error);
    }
  }

  let timer: ReturnType<typeof setTimeout> | null = null;
  const persistNow = () => {
    timer = null;
    if (!storage) {
      reportError(target.name, 'persist', new Error('no storage available; persistence is disabled'));
      return;
    }
    try {
      storage.setItem(key, JSON.stringify(target.peek()));
    } catch (error) {
      reportError(target.name, 'persist', error);
    }
  };
  const schedulePersist = () => {
    if (timer === null) timer = setTimeout(persistNow, 0);
  };

  target.subscribe(schedulePersist);
  if (persisted !== undefined && Object.keys(persisted).length > 0) {
    target.set(persisted as Partial<T>);
  } else if (Object.keys(target.peek()).length > 0) {
    // The runtime's configure commits the initial state's keys with persist already on, so it saves them once.
    schedulePersist();
  }
}
`;
}
