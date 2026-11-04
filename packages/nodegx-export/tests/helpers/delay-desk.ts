/**
 * "Delay Desk" (P134 session 11): the Delay node's (`Timer`) three verbs and four outcomes, in countdowns short enough
 * to finish between two readings (both arms let a few zero timers run after each press), or long enough never to.
 * `html-a-delay-counts-down.test.ts` reads it in the HTML export and the React export.
 *
 * - **Quick** (`Timer`, start delay 0, duration 0): its Start's Done says "began", its Started "started", its Finished
 *   "finished".
 * - **Long** (start delay 0, duration 100 s): Start, Stop and Restart, each from its own button; its Done says "done"
 *   and its Unchanged "unchanged" (a Start while one runs, a Stop when none does).
 * - **Reset** puts every Text back to "no".
 */

import { placeAll, writeDeskProject, type Desk, type RawNode, type RawWire } from './root-desk';

const VARS = ['began', 'started', 'finished', 'longDone', 'longUnchanged'];

export const delayDesk = (): Desk => {
  const buttons = ['Quick', 'Long', 'Stop long', 'Restart long', 'Reset'];
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Delay Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: [...VARS.map((v) => `${v}Text`), ...buttons.map((_, i) => `b${i}`)], parameters: {} },
    ...VARS.map((v): RawNode => ({ id: `${v}Text`, type: 'Text', label: v, parent: 'shell', parameters: {} })),
    ...buttons.map((label, i): RawNode => ({ id: `b${i}`, type: 'net.noodl.controls.button', label, parent: 'shell', parameters: { label } })),
    ...VARS.map((v): RawNode => ({ id: `${v}Var`, type: 'Variable2', label: v, parameters: { name: v, value: 'no' } })),
    ...VARS.map((v): RawNode => ({ id: `${v}Reset`, type: 'Set Variable', label: `Reset ${v}`, parameters: { name: v, value: 'no' } })),
    { id: 'quick', type: 'Timer', label: 'Quick', parameters: { startDelay: 0, duration: 0 } },
    { id: 'long', type: 'Timer', label: 'Long', parameters: { startDelay: 0, duration: 100000 } },
    { id: 'sayBegan', type: 'Set Variable', label: 'Say began', parameters: { name: 'began', value: 'began' } },
    { id: 'sayStarted', type: 'Set Variable', label: 'Say started', parameters: { name: 'started', value: 'started' } },
    { id: 'sayFinished', type: 'Set Variable', label: 'Say finished', parameters: { name: 'finished', value: 'finished' } },
    { id: 'sayDone', type: 'Set Variable', label: 'Say done', parameters: { name: 'longDone', value: 'done' } },
    { id: 'sayUnchanged', type: 'Set Variable', label: 'Say unchanged', parameters: { name: 'longUnchanged', value: 'unchanged' } }
  ];
  const connections: RawWire[] = [
    ...VARS.map((v): RawWire => ({ fromId: `${v}Var`, fromProperty: 'value', toId: `${v}Text`, toProperty: 'text' })),
    ...VARS.map((v): RawWire => ({ fromId: 'b4', fromProperty: 'onClick', toId: `${v}Reset`, toProperty: 'do' })),
    { fromId: 'b0', fromProperty: 'onClick', toId: 'quick', toProperty: 'start' },
    { fromId: 'quick', fromProperty: 'done', toId: 'sayBegan', toProperty: 'do' },
    { fromId: 'quick', fromProperty: 'timerStarted', toId: 'sayStarted', toProperty: 'do' },
    { fromId: 'quick', fromProperty: 'timerFinished', toId: 'sayFinished', toProperty: 'do' },
    { fromId: 'b1', fromProperty: 'onClick', toId: 'long', toProperty: 'start' },
    { fromId: 'b2', fromProperty: 'onClick', toId: 'long', toProperty: 'stop' },
    { fromId: 'b3', fromProperty: 'onClick', toId: 'long', toProperty: 'restart' },
    { fromId: 'long', fromProperty: 'done', toId: 'sayDone', toProperty: 'do' },
    { fromId: 'long', fromProperty: 'unchanged', toId: 'sayUnchanged', toProperty: 'do' }
  ];
  return { components: { 'Pages/Home': { nodes: placeAll(nodes), connections } } };
};

export const writeDelayDesk = (dir?: string): string =>
  writeDeskProject(delayDesk(), { name: 'Delay Desk', idBase: 'b8d20e00-0000-4000-8000-0000000013', prefix: 'delay-desk-' }, dir);
