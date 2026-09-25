/**
 * BMG-003 under jsdom — the field-type picker (AC1's table), the per-kind
 * options (AC5, AC8), the Choice control (AC2), the card's danger zone (AC6),
 * and the pure model behind them (`fieldKinds.ts`).
 */
import { mount, unmount, change, click, press, q, qa, text, typeInto } from './dom';

import { ModalHost } from '../../src/admin/app/ui/modal';
import { FieldControl } from '../../src/admin/app/fields';
import { RESERVED_WORDS, isReservedWord, validCollectionName, validName } from '../../src/admin/app/format';
import type { Column } from '../../src/admin/app/format';
import {
  KINDS,
  blankDraft,
  defaultRule,
  defaultWords,
  draftProblem,
  kindOf,
  mergeRules,
  rulesWithout,
  searchKinds,
  toColumn,
  toRules,
  withRules,
  type FieldDraft,
  type RuleStatus
} from '../../src/admin/app/fieldKinds';
import { AddFieldDrawer, FieldOptions, KindPicker, TableCard, readLine } from '../../src/admin/app/views/schema';

const ctx = { taken: ['name'], collections: ['Pet', 'Owner', 'Tag'], records: 0 };

describe('the eleven kinds (§3.1)', () => {
  it('AC1: every tile maps to the storage type the table says, in the table’s order', () => {
    expect(KINDS.map((k) => [k.label, k.storage])).toEqual([
      ['Text', 'String'],
      ['Number', 'Number'],
      ['Yes / No', 'Boolean'],
      ['Date & time', 'Date'],
      ['Choice', 'String'],
      ['Link', 'Pointer'],
      ['Links', 'Relation'],
      ['Picture or file', 'File'],
      ['Location', 'GeoPoint'],
      ['List', 'Array'],
      ['Anything', 'Object']
    ]);
    // Every tile has one line under it; none says "String" as its name.
    expect(KINDS.every((k) => k.line.length > 0 && k.label !== k.storage || k.label === 'Number')).toBe(true);
  });

  it('a draft of each kind becomes a column of that storage type, and a Choice becomes a rule too', () => {
    for (const k of KINDS) {
      const d: FieldDraft = { ...blankDraft(k.id), name: 'f', target: 'Owner', values: ['a', 'b'] };
      const col = toColumn(d);
      expect([k.id, col.type]).toEqual([k.id, k.storage]);
      if (k.id === 'link' || k.id === 'links') expect(col.targetClass).toBe('Owner');
      const rules = toRules(d);
      if (k.id === 'choice') expect(rules).toEqual([{ field: 'f', oneOf: ['a', 'b'] }]);
      else expect(rules).toEqual([]);
    }
  });

  it('reads a stored column back as its kind: a String with a one-of rule is a Choice', () => {
    const checks: RuleStatus[] = [{ name: 'chk', rule: { field: 'status', oneOf: ['open', 'closed'] }, description: 'status is one of open, closed', built: true, declared: true }];
    expect(kindOf({ name: 'status', type: 'String' }, checks).id).toBe('choice');
    expect(kindOf({ name: 'title', type: 'String' }, checks).id).toBe('text');
    expect(kindOf({ name: 'owner', type: 'Pointer' }).id).toBe('link');
    expect(kindOf({ name: 'tags', type: 'Relation' }).id).toBe('links');
  });

  it('the search finds a tile by its name, its line or its storage name', () => {
    expect(searchKinds('pic').map((k) => k.id)).toEqual(['file']);
    expect(searchKinds('String').map((k) => k.id)).toEqual(['text', 'choice']);
    expect(searchKinds('map').map((k) => k.id)).toEqual(['location']);
    expect(searchKinds('')).toHaveLength(11);
  });
});

describe('KindPicker (the drawer’s first step)', () => {
  it('shows eleven tiles with a name, a line and the storage badge, and picking one reports it', () => {
    let picked = '';
    const root = mount(<KindPicker onPick={(k) => (picked = k)} />);
    const tiles = qa(root, '.tile');
    expect(tiles).toHaveLength(11);
    expect(text(q(tiles[4], 'b'))).toBe('Choice');
    expect(text(q(tiles[4], '.sub'))).toBe('one of a list you define');
    expect(text(q(tiles[4], '.chip.type'))).toBe('String');
    click(q(tiles[5], 'input'));
    change(q<HTMLInputElement>(tiles[5], 'input'), true);
    expect(picked).toBe('link');
    unmount(root);
  });

  it('narrows to the query, and Enter on a single match picks it', () => {
    let picked = '';
    const root = mount(<KindPicker onPick={(k) => (picked = k)} />);
    typeInto(q<HTMLInputElement>(root, '.kind-search'), 'picture');
    expect(qa(root, '.tile')).toHaveLength(1);
    press(q(root, '.kind-search'), 'Enter');
    expect(picked).toBe('file');
    unmount(root);
  });
});

/** Mount a controlled FieldOptions whose latest draft the test can read. */
function mountOptions(start: FieldDraft, records = 0) {
  const state = { draft: start };
  let root: HTMLElement;
  const render = () => mount(<FieldOptions draft={state.draft} update={update} names={ctx.collections} taken={ctx.taken} records={records} />);
  const update = (next: FieldDraft) => {
    state.draft = next;
    unmount(root);
    root = render();
  };
  root = render();
  return { state, get root() { return root; }, done: () => unmount(root) };
}

describe('FieldOptions (the drawer’s second step)', () => {
  it('shows only the choices its kind has', () => {
    const t = mountOptions(blankDraft('text'));
    expect(qa(t.root, '#kind-options input, #kind-options select').map((e) => e.getAttribute('aria-label'))).toEqual(['Default', 'Max length', 'Must look like']);
    t.done();
    const n = mountOptions(blankDraft('number'));
    expect(qa(n.root, '#kind-options input, #kind-options select').map((e) => e.getAttribute('aria-label'))).toEqual(['Default', 'At least', 'At most', 'Whole numbers only']);
    n.done();
    const d = mountOptions(blankDraft('date'));
    expect(qa(d.root, '#kind-options input, #kind-options select')).toHaveLength(0);
    expect(text(q(d.root, '#kind-options'))).toContain('No options');
    d.done();
    const l = mountOptions(blankDraft('link'));
    expect(qa(l.root, '#kind-options select').map((e) => e.getAttribute('aria-label'))).toEqual(['Points at']);
    l.done();
  });

  it('AC5: Required disables Default with the reason visible; over records it asks for one instead', () => {
    const t = mountOptions({ ...blankDraft('text'), required: true });
    const dflt = q<HTMLInputElement>(t.root, '#kind-options input[aria-label="Default"]');
    expect(dflt.disabled).toBe(true);
    expect(text(t.root)).toContain('A required field has no default: every record must say it.');
    t.done();
    const over = mountOptions({ ...blankDraft('text'), required: true }, 3);
    expect(q<HTMLInputElement>(over.root, '#kind-options input[aria-label="Default"]').disabled).toBe(false);
    expect(text(over.root)).toContain('The 3 records already here get this value');
    over.done();
    expect(defaultRule({ ...blankDraft('number'), required: true }, 0)).toEqual({ disabled: true, why: 'A required field has no default: every record must say it.' });
    expect(defaultRule({ ...blankDraft('number'), required: false }, 0)).toEqual({ disabled: false, why: '' });
  });

  it('AC8: a Yes / No default is two switches, never a typed word', () => {
    const y = mountOptions({ ...blankDraft('yesno'), boolDefaultSet: true, boolDefault: true });
    expect(qa(y.root, '#kind-options input').map((e) => e.getAttribute('type'))).toEqual(['checkbox', 'checkbox']);
    expect(qa(y.root, '#kind-options input, #kind-options select, #kind-options textarea').some((e) => /true|false/i.test((e as HTMLInputElement).value))).toBe(false);
    expect(text(q(y.root, '#kind-options'))).toContain('Default: Yes');
    expect(toColumn(y.state.draft).defaultValue).toBe(true);
    y.done();
    expect(defaultWords({ name: 'b', type: 'Boolean', defaultValue: false })).toBe('No');
    expect(defaultWords({ name: 'b', type: 'Boolean', defaultValue: true })).toBe('Yes');
    // New collection's rows: the Boolean default is a select of Yes / No, read as a boolean.
    expect(readLine({ name: 'ok', type: 'Boolean', target: '', required: false, dflt: 'yes' }, []).defaultValue).toBe(true);
    expect(readLine({ name: 'ok', type: 'Boolean', target: '', required: false, dflt: 'no' }, []).defaultValue).toBe(false);
    // And a required line carries no default at all (AC5).
    expect(readLine({ name: 'ok', type: 'String', target: '', required: true, dflt: 'x' }, []).defaultValue).toBeUndefined();
  });

  it('a Choice edits its values as chips and offers them as the default', () => {
    const c = mountOptions({ ...blankDraft('choice'), values: ['open', 'closed'] });
    expect(qa(c.root, '#choice-values .chip').map((e) => text(e).replace('✕', '').trim())).toEqual(['open', 'closed']);
    expect(qa(c.root, '#kind-options select[aria-label="Default"] option').map((o) => text(o))).toEqual(['no default', 'open', 'closed']);
    c.done();
  });
});

describe('the draft’s refusals, in words', () => {
  it('name, target, values, bounds, default within bounds', () => {
    expect(draftProblem({ ...blankDraft('text'), name: '' }, ctx)).toBe('The field needs a name.');
    expect(draftProblem({ ...blankDraft('text'), name: 'name' }, ctx)).toBe('There is already a field called "name".');
    expect(draftProblem({ ...blankDraft('text'), name: 'select' }, ctx)).toMatch(/keeps for itself/);
    expect(draftProblem({ ...blankDraft('link'), name: 'owner' }, ctx)).toBe('Choose the collection it points at.');
    expect(draftProblem({ ...blankDraft('links'), name: 'tags', target: 'Nope' }, ctx)).toBe('There is no collection called Nope.');
    expect(draftProblem({ ...blankDraft('choice'), name: 'status' }, ctx)).toBe('A choice needs at least one value.');
    expect(draftProblem({ ...blankDraft('choice'), name: 'status', values: ['a'], dflt: 'b' }, ctx)).toBe('The default must be one of the choices.');
    expect(draftProblem({ ...blankDraft('number'), name: 'n', min: '5', max: '1' }, ctx)).toBe('The minimum is above the maximum.');
    expect(draftProblem({ ...blankDraft('number'), name: 'n', min: '0', dflt: '-1' }, ctx)).toBe('The default is below the minimum.');
    expect(draftProblem({ ...blankDraft('number'), name: 'n', whole: true, dflt: '1.5' }, ctx)).toBe('The default must be a whole number.');
    expect(draftProblem({ ...blankDraft('text'), name: 't', maxLength: '0' }, ctx)).toBe('The max length is a whole number of at least 1.');
    expect(draftProblem({ ...blankDraft('text'), name: 't', maxLength: '2', dflt: 'abc' }, ctx)).toBe('The default is longer than the max length.');
    expect(draftProblem({ ...blankDraft('text'), name: 't', required: true }, ctx)).toBeNull();
    expect(draftProblem({ ...blankDraft('text'), name: 't', required: true }, { ...ctx, records: 2 })).toMatch(/needs a default here, so the 2 records already in the collection get a value/);
    expect(draftProblem({ ...blankDraft('date'), name: 't', required: true }, { ...ctx, records: 2 })).toMatch(/only be added while the collection is empty/);
    expect(draftProblem({ ...blankDraft('text'), name: 't', required: true, dflt: 'x' }, { ...ctx, records: 2 })).toBeNull();
  });

  it('the rules a draft declares, and how they merge into the collection’s', () => {
    const d: FieldDraft = { ...blankDraft('number'), name: 'qty', min: '0', max: '10', whole: true };
    expect(toRules(d)).toEqual([{ field: 'qty', min: 0, max: 10 }, { field: 'qty', whole: true }]);
    const t: FieldDraft = { ...blankDraft('text'), name: 'mail', maxLength: '80', looksLike: 'email' };
    expect(toRules(t)).toEqual([{ field: 'mail', maxLength: 80 }, { field: 'mail', looksLike: 'email' }]);
    const existing: RuleStatus[] = [
      { name: 'a', rule: { field: 'qty', min: 1 }, description: '', built: true, declared: true },
      { name: 'b', rule: { exactlyOne: ['qty', 'other'] }, description: '', built: true, declared: true },
      { name: 'c', rule: { field: 'other', max: 3 }, description: '', built: true, declared: true },
      { name: 'd', rule: { field: 'drift', max: 3 }, description: '', built: true, declared: false }
    ];
    expect(mergeRules(existing, 'qty', toRules(d))).toEqual([{ exactlyOne: ['qty', 'other'] }, { field: 'other', max: 3 }, { field: 'qty', min: 0, max: 10 }, { field: 'qty', whole: true }]);
    expect(rulesWithout(existing, 'qty')).toEqual([{ field: 'other', max: 3 }]);
  });

  it('§5: the reserved words are the editor’s list, refused for collections and fields, case-insensitively', () => {
    expect(RESERVED_WORDS.length).toBeGreaterThan(100);
    expect(isReservedWord('order')).toBe(true);
    expect(validCollectionName('Order', [])).toMatch(/"Order" is a word the database keeps for itself\. Try Orders or MyOrder\./);
    expect(validCollectionName('Orders', [])).toBeNull();
    expect(validCollectionName('Orders', ['Orders'])).toBe('There is already a collection called Orders.');
    expect(validName('group', null, 'The field')).toMatch(/keeps for itself/);
    expect(validName('groupName', null, 'The field')).toBeNull();
  });
});

describe('AC2: a Choice on the record control is a select of its values', () => {
  it('withRules folds the rule into the column, and FieldControl renders the two values', () => {
    const checks: RuleStatus[] = [
      { name: 'chk', rule: { field: 'status', oneOf: ['open', 'closed'] }, description: 'status is one of open, closed', built: true, declared: true },
      { name: 'rng', rule: { field: 'qty', min: 1, max: 9 }, description: '', built: true, declared: true },
      { name: 'whl', rule: { field: 'qty', whole: true }, description: '', built: true, declared: true }
    ];
    const cols = withRules([{ name: 'status', type: 'String' }, { name: 'qty', type: 'Number' }, { name: 'title', type: 'String' }], checks);
    expect(cols[0].allowed).toEqual(['open', 'closed']);
    expect(cols[1]).toMatchObject({ min: 1, max: 9, whole: true });
    expect(cols[2].allowed).toBeUndefined();

    let value = '';
    const root = mount(<FieldControl col={cols[0]} raw="open" onChange={(v) => (value = String(v))} />);
    const select = q<HTMLSelectElement>(root, 'select');
    expect(qa(select, 'option').map((o) => text(o))).toEqual(['— none —', 'open', 'closed']);
    change(select, 'closed');
    expect(value).toBe('closed');
    unmount(root);

    // A stored value outside the list is shown, and said to be outside it — never silently swapped.
    const stray = mount(<FieldControl col={cols[0]} raw="weird" onChange={() => undefined} />);
    expect(qa(stray, 'option').map((o) => text(o))).toContain('weird (not one of the choices)');
    unmount(stray);

    const n = mount(<FieldControl col={cols[1]} raw="3" onChange={() => undefined} />);
    const input = q<HTMLInputElement>(n, 'input');
    expect([input.getAttribute('min'), input.getAttribute('max'), input.getAttribute('step')]).toEqual(['1', '9', '1']);
    unmount(n);
  });
});

describe('the card (AC6) and the drawer (AC7)', () => {
  const pet = {
    name: 'Pet',
    columns: [{ name: 'name', type: 'String' }, { name: 'status', type: 'String' }] as Column[],
    indexes: [],
    checks: [{ name: 'chk', rule: { field: 'status', oneOf: ['open', 'closed'] }, description: 'status is one of open, closed', built: true, declared: true }] as RuleStatus[]
  };

  it('AC6: the header has no red control; Delete and Empty live in the danger zone; the rules are listed in words', () => {
    const root = mount(<TableCard t={pet} names={['Pet']} readonly={false} accountColumns={undefined} hit={false} reload={() => undefined} />);
    const header = qa(root, '.row')[0];
    expect(qa(header, 'button').map((b) => text(b).trim())).toEqual(['Open records', 'Add field', 'Indexes']);
    expect(qa(header, 'button.danger')).toHaveLength(0);
    const zone = q(root, '.danger-zone');
    expect(qa(zone, 'button.danger').map((b) => text(b).trim())).toEqual(['Empty collection', 'Delete collection']);
    expect(qa(root, '.rule').map((r) => text(q(r, 'span')))).toEqual(['status is one of open, closed']);
    // The Choice column shows its kind, and its kind cannot be changed while the rule reads it.
    const kindCell = qa(qa(root, 'tbody tr')[4], 'td')[1];
    expect(text(q(kindCell, '.kind-icon'))).toBe('☰');
    expect(text(kindCell)).toContain('Choice');
    expect(text(q(kindCell, '.chip.type'))).toBe('String');
    expect(qa(root, 'tbody tr select')).toHaveLength(1);
    // A ✕ per own field, none on the backend's three.
    expect(qa(root, 'tbody tr button[aria-label^="Drop the field"]').map((b) => b.getAttribute('aria-label'))).toEqual(['Drop the field name', 'Drop the field status']);
    unmount(root);
  });

  it('AC6: the accounts table and a read-only admin get no danger zone', () => {
    const users = mount(<TableCard t={{ name: '_User', columns: [] }} names={[]} readonly={false} accountColumns={{}} hit={false} reload={() => undefined} />);
    expect(qa(users, '.danger-zone')).toHaveLength(0);
    unmount(users);
    const ro = mount(<TableCard t={pet} names={['Pet']} readonly={true} accountColumns={undefined} hit={false} reload={() => undefined} />);
    expect(qa(ro, '.danger-zone')).toHaveLength(0);
    expect(qa(ro, 'tbody tr button[aria-label^="Drop the field"]')).toHaveLength(0);
    unmount(ro);
  });

  it('AC6: Delete collection refuses until the exact name is typed', () => {
    const root = mount(
      <>
        <ModalHost />
        <TableCard t={pet} names={['Pet']} readonly={false} accountColumns={undefined} hit={false} reload={() => undefined} />
      </>
    );
    click(qa(q(root, '.danger-zone'), 'button.danger')[1]);
    const modal = q(root, '.modal');
    const go = qa<HTMLButtonElement>(modal, 'button').find((b) => text(b).trim() === 'Delete collection')!;
    expect(go.disabled).toBe(true);
    typeInto(q<HTMLInputElement>(modal, 'input'), 'Pe');
    expect(go.disabled).toBe(true);
    typeInto(q<HTMLInputElement>(modal, 'input'), 'Pet');
    expect(go.disabled).toBe(false);
    unmount(root);
  });

  it('AC7: the drawer opens on the picker, and a picked kind opens its options with a Change kind way back', () => {
    const root = mount(<AddFieldDrawer t={pet} names={['Pet', 'Owner']} onClose={() => undefined} onAdded={() => undefined} />);
    expect(q(root, '.drawer')).toBeTruthy();
    expect(qa(root, '.tile')).toHaveLength(11);
    expect(text(q(root, '.drawer-head'))).toContain('What kind of thing does it hold?');
    change(q<HTMLInputElement>(root, '.tile input[value="number"]'), true);
    expect(qa(root, '.tile')).toHaveLength(0);
    expect(text(q(root, '.drawer-head'))).toContain('Number — amounts, counts, prices');
    expect(qa(root, '#kind-options input').map((e) => e.getAttribute('aria-label'))).toEqual(['Default', 'At least', 'At most', 'Whole numbers only']);
    click(qa<HTMLButtonElement>(root, '.drawer-foot button').find((b) => text(b).trim() === 'Change kind')!);
    expect(qa(root, '.tile')).toHaveLength(11);
    unmount(root);
  });
});
