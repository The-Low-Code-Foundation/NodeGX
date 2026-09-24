/**
 * A DOM for the composer specs (BMG-001 AC6).
 *
 * This package's jest runs in the node environment (there is no
 * jest-environment-jsdom in the tree), so each spec imports this module FIRST
 * and it installs a jsdom window as the globals Preact renders into. Preact
 * reads `document` at render time, not at import time, so the order only has
 * to hold within the spec file.
 */
import { JSDOM } from 'jsdom';

import { render } from 'preact';
import { act } from 'preact/test-utils';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://127.0.0.1/_admin', pretendToBeVisual: true });
const w = dom.window as unknown as Record<string, unknown>;
const g = globalThis as unknown as Record<string, unknown>;
for (const key of [
  'window',
  'document',
  'HTMLElement',
  'HTMLInputElement',
  'HTMLSelectElement',
  'HTMLTextAreaElement',
  'HTMLButtonElement',
  'Element',
  'Node',
  'Event',
  'InputEvent',
  'KeyboardEvent',
  'MouseEvent',
  'FocusEvent',
  'CustomEvent',
  'HashChangeEvent',
  'getComputedStyle',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'localStorage',
  'sessionStorage',
  'matchMedia',
  'location',
  'history'
]) {
  if (key === 'window' || key === 'document' || g[key] === undefined) g[key] = w[key];
}
if (!('navigator' in g) || !(g.navigator as { clipboard?: unknown }).clipboard) {
  try {
    Object.defineProperty(g, 'navigator', { value: w.navigator, configurable: true });
  } catch {
    /* node 21+ defines navigator; fine either way */
  }
}

export const window = dom.window;
export const document = dom.window.document;

/** Mount a vnode into a fresh container and return it. */
export function mount(vnode: import('preact').VNode): HTMLElement {
  const root = document.createElement('div');
  document.body.appendChild(root);
  act(() => {
    render(vnode, root);
  });
  return root;
}

export function unmount(root: HTMLElement): void {
  act(() => {
    render(null, root);
  });
  root.remove();
}

export function typeInto(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  act(() => {
    input.value = value;
    input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
}

export function press(target: Element | Window, key: string, init: KeyboardEventInit = {}): void {
  act(() => {
    target.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
  });
}

export function click(el: Element): void {
  act(() => {
    el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, cancelable: true }));
  });
}

export function mouseDown(el: Element): void {
  act(() => {
    el.dispatchEvent(new dom.window.MouseEvent('mousedown', { bubbles: true, cancelable: true }));
  });
}

export function change(el: HTMLInputElement | HTMLSelectElement, value?: string | boolean): void {
  act(() => {
    if (typeof value === 'boolean') (el as HTMLInputElement).checked = value;
    else if (value !== undefined) el.value = value;
    el.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Flush Preact's queued renders after async work. */
export async function settle(ms = 0): Promise<void> {
  await sleep(ms);
  await act(async () => {
    await Promise.resolve();
  });
}

export const text = (el: Element | null): string => (el ? el.textContent || '' : '');
export const q = <T extends Element = HTMLElement>(root: Element, selector: string): T => {
  const found = root.querySelector<T>(selector);
  if (!found) throw new Error('nothing matches ' + selector);
  return found;
};
export const qa = <T extends Element = HTMLElement>(root: Element, selector: string): T[] => Array.from(root.querySelectorAll<T>(selector));
