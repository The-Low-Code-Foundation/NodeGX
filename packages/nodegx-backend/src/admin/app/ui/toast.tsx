/**
 * Toasts — every action reports, success or failure. A refused request
 * surfaces the server's own message verbatim, including the read-only tier's
 * refusal (RUN-004: nothing fails quietly).
 */
import { createStore, useStore } from '../store';

export type ToastKind = '' | 'ok' | 'bad';

interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

const toasts = createStore<{ items: Toast[] }>({ items: [] });
let nextId = 1;

export function toast(message: string, kind: ToastKind = ''): void {
  const id = nextId++;
  toasts.set({ items: [...toasts.get().items, { id, message, kind }] });
  setTimeout(() => dismiss(id), kind === 'bad' ? 12000 : 4500);
}

export function fail(error: unknown): void {
  const e = error as { message?: string };
  toast(e && e.message ? e.message : String(error), 'bad');
}

function dismiss(id: number) {
  toasts.set({ items: toasts.get().items.filter((t) => t.id !== id) });
}

export function ToastHost() {
  const { items } = useStore(toasts);
  return (
    <div id="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} class={'toast' + (t.kind ? ' ' + t.kind : '')} onClick={() => dismiss(t.id)}>
          {t.message}
        </div>
      ))}
    </div>
  );
}
