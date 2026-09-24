/**
 * BMG-001 AC6 — `Chips`, `ListEditor`, `KeyValueEditor`, `EmptyState`.
 */
import { mount, unmount, typeInto, press, click, change, q, qa, text } from './dom';

import { useState } from 'preact/hooks';

import { Chips } from '../../src/admin/app/composers/Chips';
import { ListEditor } from '../../src/admin/app/composers/ListEditor';
import { KeyValueEditor, KvRow, objectFromRows, rowsFromObject } from '../../src/admin/app/composers/KeyValueEditor';
import { EmptyState } from '../../src/admin/app/composers/EmptyState';

function ChipsHarness({ validate, log }: { validate?: (t: string) => string | null; log: string[][] }) {
  const [items, setItems] = useState<string[]>(['https://app.example.com']);
  return (
    <Chips
      items={items}
      onChange={(next) => {
        log.push(next);
        setItems(next);
      }}
      validate={validate}
      placeholder="https://…"
    />
  );
}

describe('Chips (BMG-001 §3.5.2)', () => {
  it('adds on Enter, removes with ✕, and ignores a duplicate', () => {
    const log: string[][] = [];
    const root = mount(<ChipsHarness log={log} />);
    expect(qa(root, '.chips-set .chip').map(text)).toEqual(['https://app.example.com✕']);
    const input = q<HTMLInputElement>(root, 'input');
    typeInto(input, 'https://b.example.com');
    press(input, 'Enter');
    expect(log[log.length - 1]).toEqual(['https://app.example.com', 'https://b.example.com']);
    typeInto(input, 'https://b.example.com');
    press(input, 'Enter');
    expect(log.length).toBe(1); // the duplicate did not emit
    click(qa(root, '.chip-x')[0]);
    expect(log[log.length - 1]).toEqual(['https://b.example.com']);
    unmount(root);
  });

  it('refuses a value the validator rejects, and says why', () => {
    const log: string[][] = [];
    const root = mount(<ChipsHarness log={log} validate={(t) => (/^https?:\/\//.test(t) ? null : 'An origin starts with http:// or https://.')} />);
    const input = q<HTMLInputElement>(root, 'input');
    typeInto(input, 'example.com');
    press(input, 'Enter');
    expect(log.length).toBe(0);
    expect(text(q(root, '.chips-problem'))).toBe('An origin starts with http:// or https://.');
    unmount(root);
  });
});

function ListHarness({ log }: { log: string[][] }) {
  const [rows, setRows] = useState<string[]>(['a']);
  return (
    <ListEditor<string>
      rows={rows}
      onChange={(next) => {
        log.push(next);
        setRows(next);
      }}
      blank={() => ''}
      min={1}
      renderRow={(row, update) => <input type="text" value={row} onInput={(e) => update((e.currentTarget as HTMLInputElement).value)} />}
    />
  );
}

describe('ListEditor (BMG-001 §3.5.3)', () => {
  it('adds a row, edits it in its slot, removes it, and keeps the minimum', () => {
    const log: string[][] = [];
    const root = mount(<ListHarness log={log} />);
    expect(qa(root, '.list-row').length).toBe(1);
    expect((q<HTMLButtonElement>(root, '.list-x') as HTMLButtonElement).disabled).toBe(true);
    click(q(root, '.list-add'));
    expect(qa(root, '.list-row').length).toBe(2);
    typeInto(qa<HTMLInputElement>(root, '.list-row input')[1], 'b');
    expect(log[log.length - 1]).toEqual(['a', 'b']);
    click(qa(root, '.list-x')[0]);
    expect(log[log.length - 1]).toEqual(['b']);
    expect((q<HTMLButtonElement>(root, '.list-x') as HTMLButtonElement).disabled).toBe(true);
    unmount(root);
  });
});

describe('KeyValueEditor (BMG-001 §3.5.4)', () => {
  it('round-trips an object with each value type', () => {
    const original = { name: 'Milo', age: 7, good: true, born: '2019-03-04T09:30:00.000Z', tags: ['small', 'brown'], nested: { a: 1 } };
    const rows = rowsFromObject(original);
    expect(rows.map((r) => r.type)).toEqual(['text', 'number', 'boolean', 'date', 'json', 'json']);
    const back = objectFromRows(rows);
    expect(back.name).toBe('Milo');
    expect(back.age).toBe(7);
    expect(back.good).toBe(true);
    expect(new Date(back.born as string).getTime()).toBe(new Date(original.born).getTime());
    expect(back.tags).toEqual(['small', 'brown']);
    expect(back.nested).toEqual({ a: 1 });
  });

  it('names the row that is wrong', () => {
    expect(() => objectFromRows([{ key: 'n', type: 'number', raw: 'seven' }])).toThrow('"n" must be a number.');
    expect(() => objectFromRows([{ key: 'j', type: 'json', raw: '{oops' }])).toThrow('"j" is not valid JSON');
    expect(() => objectFromRows([{ key: 'a', type: 'text', raw: '1' }, { key: 'a', type: 'text', raw: '2' }])).toThrow('"a" is listed twice.');
    expect(objectFromRows([{ key: '', type: 'text', raw: '' }])).toEqual({});
  });

  it('edits through the DOM and emits rows', () => {
    const log: KvRow[][] = [];
    function Harness() {
      const [rows, setRows] = useState<KvRow[]>([{ key: 'mode', type: 'text', raw: 'fast' }]);
      return (
        <KeyValueEditor
          rows={rows}
          onChange={(next) => {
            log.push(next);
            setRows(next);
          }}
        />
      );
    }
    const root = mount(<Harness />);
    change(q<HTMLSelectElement>(root, '.kv-type'), 'boolean');
    expect(log[log.length - 1][0]).toEqual({ key: 'mode', type: 'boolean', raw: false });
    change(q<HTMLInputElement>(root, '.kv-value input[type=checkbox]'), true);
    expect(objectFromRows(log[log.length - 1])).toEqual({ mode: true });
    click(q(root, '.list-add'));
    typeInto(qa<HTMLInputElement>(root, '.kv-key')[1], 'count');
    change(qa<HTMLSelectElement>(root, '.kv-type')[1], 'number');
    typeInto(qa<HTMLInputElement>(root, '.kv-value')[1], '3');
    expect(objectFromRows(log[log.length - 1])).toEqual({ mode: true, count: 3 });
    unmount(root);
  });
});

describe('EmptyState (BMG-001 §3.5.7)', () => {
  it('says one sentence and offers one CTA that acts', () => {
    let pressed = 0;
    const root = mount(
      <EmptyState icon="▦" action={{ label: 'New role', onClick: () => pressed++ }}>
        No roles yet.
      </EmptyState>
    );
    expect(text(q(root, '.empty-text'))).toBe('No roles yet.');
    const buttons = qa<HTMLButtonElement>(root, 'button');
    expect(buttons.map(text)).toEqual(['New role']);
    click(buttons[0]);
    expect(pressed).toBe(1);
    unmount(root);
  });
});
