/**
 * The smallest store that will do: a value, `set` with a patch, subscribers,
 * and a hook. The app has three of these (session, live chip, modals/toasts)
 * and none of them needs more.
 */
import { useEffect, useState } from 'preact/hooks';

export interface Store<T> {
  get(): T;
  set(patch: Partial<T>): void;
  replace(next: T): void;
  subscribe(listener: (state: T) => void): () => void;
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial;
  const listeners = new Set<(state: T) => void>();
  const notify = () => listeners.forEach((l) => l(state));
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...patch };
      notify();
    },
    replace(next) {
      state = next;
      notify();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    }
  };
}

export function useStore<T extends object>(store: Store<T>): T {
  const [state, setState] = useState(store.get());
  useEffect(() => {
    const unsubscribe = store.subscribe(setState);
    // 🔴 Re-read after subscribing. Preact runs effects after paint (up to 100 ms later), and the
    // session's whoami fetch answers a loopback backend in a few milliseconds — so the first
    // sign-in landed BEFORE this subscription existed and the shell never rendered.
    setState(store.get());
    return unsubscribe;
  }, [store]);
  return state;
}
