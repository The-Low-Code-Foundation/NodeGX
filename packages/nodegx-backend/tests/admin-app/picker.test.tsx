/**
 * BMG-001 AC6 — `Picker`: search-as-you-type, keyboard, no-match, never an id.
 */
import { mount, unmount, typeInto, press, settle, q, qa, text, mouseDown, click } from './dom';

import { Picker } from '../../src/admin/app/composers/Picker';

interface User {
  objectId: string;
  username: string;
  email: string;
}

const USERS: User[] = [
  { objectId: '3ed82d64-a69e-43de-86f3-7bdbb7061cc5', username: 'ann', email: 'ann@example.com' },
  { objectId: '88ce6da8-588b-4b91-a9eb-112ad6dfc6c9', username: 'bob', email: 'bob@example.com' },
  { objectId: 'c0ffee00-0000-4000-8000-000000000000', username: 'anna-maria', email: 'am@example.com' }
];

function fetcher(calls: string[]) {
  return async (query: string) => {
    calls.push(query);
    const needle = query.toLowerCase();
    return USERS.filter((u) => (u.username + ' ' + u.email).toLowerCase().includes(needle));
  };
}

describe('Picker (BMG-001 §3.5.1)', () => {
  it('searches as you type, renders labels, and never shows an id', async () => {
    const calls: string[] = [];
    const picked: Array<User | null> = [];
    const root = mount(
      <Picker<User> fetch={fetcher(calls)} label={(u) => u.username} detail={(u) => u.email} keyOf={(u) => u.objectId} value={null} onPick={(u) => picked.push(u)} />
    );
    const input = q<HTMLInputElement>(root, 'input');
    typeInto(input, 'ann');
    await settle(220);
    const rows = qa(root, '.picker-row');
    expect(rows.map((r) => text(r.querySelector('.picker-label')))).toEqual(['ann', 'anna-maria']);
    expect(calls).toContain('ann');
    // The reading is real: three ids exist, and not one reaches the DOM.
    for (const u of USERS) expect(root.textContent).not.toContain(u.objectId);
    expect(root.textContent).not.toContain('3ed82d64');
    unmount(root);
  });

  it('walks the list with the keyboard and picks with Enter', async () => {
    const picked: Array<User | null> = [];
    const root = mount(<Picker<User> fetch={fetcher([])} label={(u) => u.username} keyOf={(u) => u.objectId} value={null} onPick={(u) => picked.push(u)} />);
    const input = q<HTMLInputElement>(root, 'input');
    typeInto(input, 'a');
    await settle(220);
    // ann, anna-maria (both contain 'a'); bob does too via 'bob@example.com'.
    expect(qa(root, '.picker-row').length).toBe(3);
    expect(q(root, '.picker-row.active').textContent).toContain('ann');
    press(input, 'ArrowDown');
    expect(q(root, '.picker-row.active').textContent).toContain('bob');
    press(input, 'ArrowUp');
    press(input, 'ArrowUp');
    expect(q(root, '.picker-row.active').textContent).toContain('anna-maria');
    press(input, 'Enter');
    expect(picked.map((u) => u && u.username)).toEqual(['anna-maria']);
    unmount(root);
  });

  it('says "no match", and offers to create when asked to', async () => {
    const created: string[] = [];
    const root = mount(
      <Picker<User> fetch={fetcher([])} label={(u) => u.username} keyOf={(u) => u.objectId} value={null} onPick={() => undefined} onCreate={(q) => created.push(q)} />
    );
    const input = q<HTMLInputElement>(root, 'input');
    typeInto(input, 'zelda');
    await settle(220);
    expect(qa(root, '.picker-row').length).toBe(1);
    expect(text(q(root, '.picker-create'))).toBe('Create "zelda"…');
    mouseDown(q(root, '.picker-create'));
    expect(created).toEqual(['zelda']);
    unmount(root);

    const bare = mount(<Picker<User> fetch={fetcher([])} label={(u) => u.username} keyOf={(u) => u.objectId} value={null} onPick={() => undefined} />);
    typeInto(q<HTMLInputElement>(bare, 'input'), 'zelda');
    await settle(220);
    expect(text(q(bare, '.picker-empty'))).toBe('No match.');
    expect(qa(bare, '.picker-row').length).toBe(0);
    unmount(bare);
  });

  // BMG-005 AC1 measured it: a person types "bo" and presses Enter inside the
  // 150ms pause. Enter used to pick the first row of the PREVIOUS answer (the
  // empty query's list, where ann is first) — the wrong person, added silently.
  it('Enter pressed before the answer to what was typed waits for that answer', async () => {
    const picked: Array<User | null> = [];
    const root = mount(<Picker<User> fetch={fetcher([])} label={(u) => u.username} keyOf={(u) => u.objectId} value={null} onPick={(u) => picked.push(u)} />);
    const input = q<HTMLInputElement>(root, 'input');
    input.dispatchEvent(new window.FocusEvent('focus'));
    await settle(220);
    expect(qa(root, '.picker-row').length).toBe(3);
    typeInto(input, 'bo');
    press(input, 'Enter');
    expect(picked).toEqual([]);
    await settle(220);
    expect(picked.map((u) => u && u.username)).toEqual(['bob']);
    unmount(root);
  });

  it('openOnFocus={false}: focus alone opens nothing; typing does', async () => {
    const calls: string[] = [];
    const root = mount(<Picker<User> fetch={fetcher(calls)} label={(u) => u.username} keyOf={(u) => u.objectId} value={null} onPick={() => undefined} openOnFocus={false} />);
    const input = q<HTMLInputElement>(root, 'input');
    input.dispatchEvent(new window.FocusEvent('focus'));
    await settle(220);
    expect(qa(root, '.picker-list').length).toBe(0);
    expect(calls).toEqual([]);
    typeInto(input, 'bo');
    await settle(220);
    expect(qa(root, '.picker-row').map((r) => text(r.querySelector('.picker-label')))).toEqual(['bob']);
    unmount(root);
  });

  it('createWhen: the create row appears only for a query it accepts', async () => {
    const created: string[] = [];
    const isEmail = (q: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(q);
    const root = mount(
      <Picker<User> fetch={fetcher([])} label={(u) => u.username} keyOf={(u) => u.objectId} value={null} onPick={() => undefined} onCreate={(q) => created.push(q)} createWhen={isEmail} />
    );
    const input = q<HTMLInputElement>(root, 'input');
    typeInto(input, 'zel');
    await settle(220);
    expect(qa(root, '.picker-create').length).toBe(0);
    expect(text(q(root, '.picker-empty'))).toBe('No match.');
    press(input, 'Enter');
    await settle(220);
    expect(created).toEqual([]);
    typeInto(input, 'zel@da.org');
    await settle(220);
    expect(qa(root, '.picker-create').length).toBe(1);
    unmount(root);
  });

  it('shows the picked value as its label, with a clear control', () => {
    const picked: Array<User | null> = [];
    const root = mount(<Picker<User> fetch={fetcher([])} label={(u) => u.username} keyOf={(u) => u.objectId} value={USERS[0]} onPick={(u) => picked.push(u)} />);
    expect(text(q(root, '.picker-value'))).toBe('ann');
    expect(root.textContent).not.toContain(USERS[0].objectId);
    click(q(root, '.picker-clear'));
    expect(picked).toEqual([null]);
    unmount(root);
  });
});
