/**
 * P112 OWN-026 FIX-03 B — the viewer half of the press guard: a Button's Click and a Text Input's
 * On Enter go through `guardedPressHandler`, which asks the runtime's `pressguard.ts` before it
 * fires. The runtime half (which update is a press's cause, which writes hold it) is graded in
 * `noodl-runtime/test/nodes/own026-fix03-add-to-and-press-guard.test.ts`.
 */

/* eslint-env jest */

// `node-shared-port-definitions` reads the viewer's `Noodl` global at import time.
(globalThis as unknown as Record<string, unknown>).Noodl = { deployed: false };

import {
  beginPressUpdate,
  endPressUpdate,
  holdForWrite,
  resetPressGuard
} from '@noodl/runtime/src/pressguard';

import ButtonModule from '../src/nodes/controls/button';
import TextInputModule from '../src/nodes/controls/text-input';
import { guardedPressHandler } from '../src/react-component-node';

type Def = { inputs: Record<string, { type?: string; default?: unknown }>; outputProps?: Record<string, { takenOnceWhileSaving?: boolean }> };
const def = (module: unknown) => (module as { node: Def }).node;

/** A control whose press is wired to `target`, recording what it sends. */
function control(target: object, repeatWhileSaving = false) {
  const sent: string[] = [];
  let updates = 0;
  const node = {
    _internal: { repeatWhileSaving } as Record<string, unknown>,
    context: { scheduleUpdate: () => void updates++ },
    sendSignalOnOutput: (name: string) => void sent.push(name),
    hasOutput: () => true,
    getOutput: () => ({ connections: [{ node: target }] })
  };
  return { node, sent, updates: () => updates };
}

/** One runtime update in which the press's graph starts a backend write; returns its release. */
function updateThatSaves(): () => void {
  beginPressUpdate();
  const release = holdForWrite()!;
  endPressUpdate();
  return release;
}

beforeEach(() => resetPressGuard());

describe('FIX-03 B: the controls', () => {
  test('Button Click and Text Input On Enter are the guarded signals, each with the opt-out port, default off', () => {
    const button = def(ButtonModule);
    const field = def(TextInputModule);
    expect(button.inputs.repeatWhileSaving).toMatchObject({ type: 'boolean', default: false });
    expect(field.inputs.repeatWhileSaving).toMatchObject({ type: 'boolean', default: false });
  });

  test('a second click while the save the first started waits is ignored; after the answer and the double-click time, it fires', () => {
    const target = {};
    const { node, sent, updates } = control(target);
    const press = guardedPressHandler(node as never, 'onClick');

    press();
    expect(sent).toEqual(['onClick']);
    expect(updates()).toBe(1);
    const release = updateThatSaves();

    press();
    expect(sent).toEqual(['onClick']);

    release();
    // still inside the double-click time of the first press
    press();
    expect(sent).toEqual(['onClick']);
  });

  test('a press that starts no save holds nothing once its update has run', () => {
    const { node, sent } = control({});
    const press = guardedPressHandler(node as never, 'onClick');
    press();
    beginPressUpdate();
    endPressUpdate();
    press();
    expect(sent).toEqual(['onClick', 'onClick']);
  });

  // Both fire: a same-frame double press reaches an Update Record's Do twice in one pass, which is one request.
  test('two presses before the update both fire', () => {
    const { node, sent } = control({});
    const press = guardedPressHandler(node as never, 'onEnter');
    press();
    press();
    expect(sent).toEqual(['onEnter', 'onEnter']);
  });

  test('a field wired to the same node as the button shares its guard', () => {
    const target = {};
    const button = control(target);
    const field = control(target);
    guardedPressHandler(button.node as never, 'onClick')();
    updateThatSaves();
    guardedPressHandler(field.node as never, 'onEnter')();
    expect(field.sent).toEqual([]);
  });

  test('Repeat While Saving on: every press fires', () => {
    const { node, sent } = control({}, true);
    const press = guardedPressHandler(node as never, 'onClick');
    press();
    updateThatSaves();
    press();
    expect(sent).toEqual(['onClick', 'onClick']);
  });
});
