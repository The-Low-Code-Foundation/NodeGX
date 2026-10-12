/**
 * P107-C101 (P109 ISL-048) — on a touch screen nothing inside a Drag could be tapped.
 *
 * `react-draggable` listens for `touchstart` on the element it moves and cancels every one
 * (`preventDefault`) unless the press is on something its `cancel` selector names. A browser that
 * sees a cancelled `touchstart` sends no mouse events and no `click` for that touch, and runs no
 * focusing steps — so a button inside a Drag never clicked and a field never took the keyboard,
 * on a phone or a tablet only. The Site Builder's section rows hold both.
 *
 * The rows mount the REAL Drag (and so the real library) in jsdom and fire a `touchstart` the way
 * a finger does. 🔴 The background row is the control that keeps the fix honest: a touch on the
 * row itself must still be taken by the drag (cancelled), or the fix only stopped dragging.
 *
 * @module noodl-viewer-react/tests/isl048-c101-a-tap-inside-a-drag
 */

/* eslint-env jest */

import React from 'react';

/* eslint-disable @typescript-eslint/no-var-requires */
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!doctype html><html><body></body></html>');
const g = globalThis as never as Record<string, unknown>;
g.window = dom.window;
g.document = dom.window.document;
g.navigator = dom.window.navigator;
g.HTMLElement = dom.window.HTMLElement;
g.Element = dom.window.Element;
g.Node = dom.window.Node;
g.requestAnimationFrame = (cb: () => void) => setTimeout(cb, 0);
g.IS_REACT_ACT_ENVIRONMENT = true;

const { createRoot } = require('react-dom/client');
const { act } = require('react');
const { Drag } = require('../src/components/visual/Drag/Drag');
/* eslint-enable @typescript-eslint/no-var-requires */

/** The row a Site Builder section draws: a background, a button, a field, a link and an editable heading. */
function Row(): React.ReactElement {
  return (
    <div id="row">
      <span id="background">Section 1</span>
      <button id="save">Save</button>
      <input id="heading" />
      <textarea id="body" />
      <select id="kind">
        <option>a</option>
      </select>
      <a id="link" href="#x">
        <span id="link-text">Link</span>
      </a>
      <div id="editable" contentEditable suppressContentEditableWarning>
        Heading
      </div>
    </div>
  );
}

let container: HTMLElement;
let root: { render(el: React.ReactElement): void; unmount(): void };

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  // The Drag's element is its child node's root, found through the node at read time.
  const noodlNode = { children: [{ getDOMElement: () => document.getElementById('row') }] };
  await act(async () => {
    root.render(
      React.createElement(Drag as unknown as React.ComponentType<Record<string, unknown>>, { noodlNode, axis: 'y', enabled: true }, <Row />)
    );
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

/** A finger down on `id`: was it cancelled (so the browser sends no click and no focus)? */
function touchCancelled(id: string): boolean {
  const target = document.getElementById(id)!;
  const event = new dom.window.Event('touchstart', { bubbles: true, cancelable: true });
  // react-draggable reads the finger from the event's touch lists
  Object.assign(event, { targetTouches: [{ identifier: 1, clientX: 5, clientY: 5 }], changedTouches: [{ identifier: 1, clientX: 5, clientY: 5 }] });
  target.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('P107-C101 — a tap inside a Drag reaches what it lands on', () => {
  it.each(['save', 'heading', 'body', 'kind', 'link', 'link-text', 'editable'])('a touch on %s is left alone, so it clicks or takes the keyboard', (id) => {
    expect(touchCancelled(id)).toBe(false);
  });

  it('the control: a touch on the row itself still starts the drag (cancelled, as before)', () => {
    expect(touchCancelled('background')).toBe(true);
    expect(touchCancelled('row')).toBe(true);
  });
});
