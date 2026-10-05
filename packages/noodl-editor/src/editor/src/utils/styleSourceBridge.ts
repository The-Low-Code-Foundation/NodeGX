/**
 * P109 ISL-008 — the property panel's line to the canvas, for "which of these values does the author's CSS decide?".
 *
 * The question can only be answered where the DOM is: the canvas's webview (`NoodlEditorHighlightAPI.explainStyle`).
 * The panel does not hold the canvas, and the canvas does not know the panel, so the canvas registers how to ask and
 * says when its answers have gone stale (the app reloads on every save), and the panel asks.
 *
 * No canvas, or a canvas that has not loaded, answers `[]`: the panel then shows no note, which is what it showed
 * before this existed.
 */
import type { StyleSourceFinding } from './portStyleSource';

type Provider = (path: readonly string[]) => Promise<StyleSourceFinding[]>;

let provider: Provider | undefined;
const staleListeners = new Set<() => void>();

/** The canvas: how to ask it. `undefined` when it goes away. */
export function setStyleSourceProvider(next: Provider | undefined): void {
  provider = next;
}

/** The canvas: everything it said before may be wrong now (it reloaded). */
export function notifyStyleSourcesStale(): void {
  staleListeners.forEach((listener) => {
    try {
      listener();
    } catch {
      // A panel that has gone away must not stop the others hearing it.
    }
  });
}

/** The panel: hear about staleness. Returns the unsubscribe. */
export function onStyleSourcesStale(listener: () => void): () => void {
  staleListeners.add(listener);
  return () => staleListeners.delete(listener);
}

/** The panel: ask about one node (an id, or a selection path). Never rejects. */
export async function requestStyleSources(path: readonly string[]): Promise<StyleSourceFinding[]> {
  if (!provider || path.length === 0) return [];
  try {
    const answer = await provider(path);
    return Array.isArray(answer) ? answer : [];
  } catch {
    return [];
  }
}
