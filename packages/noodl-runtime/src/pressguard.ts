/**
 * P112 OWN-026 FIX-03 B — **a press that saves is taken once.**
 *
 * A Button's Click and a Text Input's On Enter are the two ways a person *submits*. Pressed twice
 * quickly (a double-click, Enter pressed twice) both used to fire, and a graph that saves on the
 * press saved twice: measured in t1-nodegx-3, fuel +2 for one right answer. The graph-level guard
 * (a busy flag wired back to `enabled`) was advice, and a model under pressure argued it away
 * ("double presses are a minor risk"), and forgot the keyboard path entirely.
 *
 * So the guard is the runtime's, on by default:
 *
 * - A press is noted against its **keys**: the nodes its signal is wired to (or the control
 *   itself when the signal goes nowhere). Two controls wired to the same node — a Check button
 *   and its field's Enter, both into one `Run` — share keys, so they share the guard.
 * - The next update after the press is that press's **cause**. Any backend write that starts
 *   while it runs (`cloudstore.js`'s six write methods: every Record node and `Noodl.Records`
 *   call goes through them) holds the keys until the backend has answered, and for at least
 *   {@link DOUBLE_PRESS_MS} after the press — a localhost backend answers inside a double-click.
 * - A press on a held key is ignored. A press that started no write holds nothing: a Button
 *   that navigates, counts or opens a popup is untouched.
 *
 * ⚠️ **Only writes started synchronously by the press's update are attributed.** A Function
 * script's first `await Noodl.Records.update(…)` starts its request before the `await` suspends,
 * so it counts; a second write after that `await` runs outside the update and does not. The first
 * write's hold still covers the double-click, which is the case this exists for.
 *
 * ⚠️ **Module state, kept on `globalThis`**, because the viewer bundle imports this file by path
 * (`@noodl/runtime/src/pressguard`) beside the runtime's own copy, and two copies would each hold
 * half of the state. One page runs one graph, so one state is right.
 */

/** The platform double-click time: a second press inside it is the same press. */
export const DOUBLE_PRESS_MS = 500;

/** A write that never answers must not leave a control dead for ever. */
export const SAVE_HOLD_CAP_MS = 15000;

interface Hold {
  /** Writes attributed to a press and not yet answered. */
  writes: number;
  /** Held until this time (ms since epoch) whatever the writes say. */
  until: number;
}

interface PressCause {
  keys: object[];
  at: number;
}

interface PressGuardState {
  holds: WeakMap<object, Hold>;
  awaitingUpdate: PressCause[];
  cause: PressCause[] | null;
  depth: number;
}

const GLOBAL_KEY = '__nodegxPressGuard';

function state(): PressGuardState {
  const g = globalThis as unknown as Record<string, PressGuardState | undefined>;
  let s = g[GLOBAL_KEY];
  if (!s) {
    s = { holds: new WeakMap(), awaitingUpdate: [], cause: null, depth: 0 };
    g[GLOBAL_KEY] = s;
  }
  return s;
}

function holdOf(key: object): Hold {
  const s = state();
  let h = s.holds.get(key);
  if (!h) {
    h = { writes: 0, until: 0 };
    s.holds.set(key, h);
  }
  return h;
}

/** The minimal shape of a runtime node this file reads. */
interface PressingNode {
  getOutput?(name: string): { connections?: { node: object }[] } | undefined;
  hasOutput?(name: string): boolean;
}

/** The nodes a press on `outputName` reaches, or the control itself when it is wired to nothing. */
export function pressKeys(node: object, outputName: string): object[] {
  const n = node as PressingNode;
  const output = n.hasOutput && n.hasOutput(outputName) && n.getOutput ? n.getOutput(outputName) : undefined;
  const targets = output && output.connections ? output.connections.map((c) => c.node) : [];
  return targets.length > 0 ? Array.from(new Set(targets)) : [node];
}

/** Whether a press on these keys is to be ignored right now. */
export function isPressHeld(keys: object[], now: number = Date.now()): boolean {
  const s = state();
  for (const key of keys) {
    const h = s.holds.get(key);
    if (h && (h.writes > 0 || h.until > now)) return true;
  }
  return false;
}

/**
 * Note a press that is about to fire; the next update is its cause.
 *
 * ⚠️ **Two presses before that update both fire.** Holding the second "until the update has run"
 * was tried and is wrong twice over: it drops a press that starts no save (a Text Input's two
 * Enters in one frame, which its node spec plays), and it is not needed for a save — an Update
 * Record's `Do` pulsed twice in one update pass makes one request (`scheduleOnce`), so both
 * presses of a same-frame double press become one write.
 */
export function notePress(keys: object[], now: number = Date.now()): void {
  state().awaitingUpdate.push({ keys, at: now });
}

/** Called by `NodeContext.updateDirtyNodes` as it starts. Re-entrant calls are one update. */
export function beginPressUpdate(): void {
  const s = state();
  s.depth++;
  if (s.depth > 1) return;
  s.cause = s.awaitingUpdate.length > 0 ? s.awaitingUpdate : null;
  s.awaitingUpdate = [];
}

/** Called by `NodeContext.updateDirtyNodes` as it ends. */
export function endPressUpdate(): void {
  const s = state();
  s.depth = Math.max(0, s.depth - 1);
  if (s.depth > 0) return;
  s.cause = null;
}

/**
 * A backend write is starting. When a press's update is running, its keys are held until
 * `release` is called (idempotent), and at least {@link DOUBLE_PRESS_MS} after the press.
 * Outside a press's update it returns `undefined` and holds nothing.
 */
export function holdForWrite(now: number = Date.now()): (() => void) | undefined {
  const s = state();
  if (!s.cause) return undefined;
  const held: Hold[] = [];
  for (const press of s.cause) {
    for (const key of press.keys) {
      const h = holdOf(key);
      h.writes++;
      h.until = Math.max(h.until, press.at + DOUBLE_PRESS_MS);
      held.push(h);
    }
  }
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    clearTimeout(cap);
    for (const h of held) h.writes = Math.max(0, h.writes - 1);
  };
  const cap = setTimeout(release, SAVE_HOLD_CAP_MS);
  // Never keeps a Node process (a test, the headless renderer) alive on its own account.
  if (typeof cap === 'object' && cap !== null && 'unref' in cap) (cap as { unref(): void }).unref();
  return release;
}

/**
 * Wrap a write's `success` / `error` so the hold is released when the backend answers, whichever
 * way. Returns the options unchanged when no press is the cause.
 */
export function holdOptionsForWrite<T extends object>(options: T): T {
  const release = holdForWrite();
  if (!release) return options;
  const o = options as T & { success?: (...args: unknown[]) => unknown; error?: (...args: unknown[]) => unknown };
  const success = o.success;
  const error = o.error;
  return Object.assign({}, options, {
    success: (...args: unknown[]) => {
      release();
      return success ? success(...args) : undefined;
    },
    error: (...args: unknown[]) => {
      release();
      return error ? error(...args) : undefined;
    }
  });
}

/** Tests only: forget every hold and press. */
export function resetPressGuard(): void {
  const g = globalThis as unknown as Record<string, PressGuardState | undefined>;
  g[GLOBAL_KEY] = undefined;
}
