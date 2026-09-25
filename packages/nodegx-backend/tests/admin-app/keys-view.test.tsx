/**
 * BMG-007 — the scope boxes (AC4, AC7) and the secret card (AC5) under jsdom.
 */
import * as fs from 'fs';
import * as path from 'path';

import { mount, unmount, change, click, settle, q, qa, text } from './dom';

import { ScopePicker, SecretCard } from '../../src/admin/app/views/keys';
import type { ScopeChoice } from '../../src/admin/app/scopes';
import { NOTHING } from '../../src/admin/app/scopes';

function boxes(root: HTMLElement): HTMLInputElement[] {
  return qa<HTMLInputElement>(root, 'input[type=checkbox]');
}

function labelOf(input: HTMLInputElement): string {
  return text(input.closest('label')).trim();
}

/** Mount a controlled picker whose latest value the test can read. */
function mountPicker(functions: string[] | null, start: ScopeChoice = NOTHING) {
  const state = { choice: start };
  let root: HTMLElement;
  const rerender = () => {
    unmount(root);
    root = mount(<ScopePicker choice={state.choice} onChange={onChange} functions={functions} />);
  };
  const onChange = (next: ScopeChoice) => {
    state.choice = next;
    rerender();
  };
  root = mount(<ScopePicker choice={state.choice} onChange={onChange} functions={functions} />);
  return { state, get root() { return root; }, done: () => unmount(root) };
}

describe('ScopePicker (BMG-007 §3.2)', () => {
  it('AC4: lists exactly the function names it is given, one box each, and the Data pair', () => {
    const p = mountPicker(['cleanup', 'order', 'sendInvoice']);
    const labels = boxes(p.root).map(labelOf);
    expect(labels).toEqual(['Data', 'Read records', 'Write records', 'Functions call any function', 'cleanup', 'order', 'sendInvoice']);
    p.done();
  });

  it('AC4: with no functions it says so, and "any" still works', () => {
    const p = mountPicker([]);
    expect(p.root.textContent).toContain('No functions yet');
    const any = boxes(p.root).find((b) => b.getAttribute('aria-label') === 'Call any function')!;
    change(any, true);
    expect(p.state.choice.anyFunction).toBe(true);
    p.done();
  });

  it('select-all per group: "Data" ticks both; "any" greys and ticks the named list', () => {
    const p = mountPicker(['cleanup', 'order']);
    change(boxes(p.root).find((b) => b.getAttribute('aria-label') === 'All data')!, true);
    expect(p.state.choice).toMatchObject({ read: true, write: true });
    change(boxes(p.root).find((b) => labelOf(b) === 'Write records')!, false);
    expect(p.state.choice).toMatchObject({ read: true, write: false });
    // Half-ticked: the select-all reads indeterminate, not checked.
    const all = boxes(p.root).find((b) => b.getAttribute('aria-label') === 'All data')!;
    expect(all.checked).toBe(false);
    expect(all.indeterminate).toBe(true);

    change(boxes(p.root).find((b) => labelOf(b) === 'cleanup')!, true);
    expect(p.state.choice.functions).toEqual(['cleanup']);
    change(boxes(p.root).find((b) => b.getAttribute('aria-label') === 'Call any function')!, true);
    const named = boxes(p.root).filter((b) => ['cleanup', 'order'].includes(labelOf(b)));
    expect(named.map((b) => b.disabled)).toEqual([true, true]);
    expect(named.map((b) => b.checked)).toEqual([true, true]);
    expect(q(p.root, '.scope-list.greyed')).toBeTruthy();
    p.done();
  });

  it('keeps a name the backend no longer serves ticked, and says so', () => {
    const p = mountPicker(['cleanup'], { read: false, write: false, anyFunction: false, functions: ['retired'] });
    const retired = boxes(p.root).find((b) => labelOf(b).startsWith('retired'))!;
    expect(retired.checked).toBe(true);
    expect(labelOf(retired)).toContain('not deployed any more');
    p.done();
  });

  it('AC7: no text field anywhere in the boxes, and the view source spells no scope string', () => {
    const p = mountPicker(['cleanup']);
    expect(qa(p.root, 'input[type=text], textarea, input:not([type])').length).toBe(0);
    p.done();
    const source = fs.readFileSync(path.join(__dirname, '../../src/admin/app/views/keys.tsx'), 'utf-8');
    // A scope STRING is a quoted literal; `functions:` as a property name is not one.
    for (const literal of ["'classes:", '"classes:', "'functions:", '"functions:', "split(','", 'comma separated']) expect(source).not.toContain(literal);
  });
});

describe('SecretCard (BMG-007 §3.4)', () => {
  it('AC5: Copy puts the secret on the clipboard and says Copied; the example command carries the header', async () => {
    const written: string[] = [];
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      configurable: true,
      value: { writeText: async (t: string) => void written.push(t) }
    });
    (globalThis as { fetch?: unknown }).fetch = async () => ({ status: 200, json: async () => ({ tables: [{ name: '_User' }, { name: 'Pet' }] }) });
    const root = mount(<SecretCard secret="ngxk_test-secret-value" />);
    await settle(10);
    expect(text(q(root, '[data-secret]'))).toBe('ngxk_test-secret-value');
    const copy = qa<HTMLButtonElement>(root, 'button').find((b) => b.textContent!.includes('Copy secret'))!;
    click(copy);
    await settle(10);
    expect(written).toEqual(['ngxk_test-secret-value']);
    expect(copy.textContent).toContain('Copied');
    expect(root.textContent).toContain('curl -H "X-NodeGX-Api-Key: ngxk_test-secret-value"');
    expect(root.textContent).toContain('/api/Pet');
    unmount(root);
  });
});
