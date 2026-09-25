/**
 * `FilterRows` — a filter said in rows (BMG-002 §3.1):
 * `[and/or] [field ▾] [operator ▾] [value]`, *+ Add condition*, *+ Add group*.
 * The operator list depends on the field's type and the value slot on the
 * operator. The model, `toWhere` and `fromWhere` are `filters.ts`; this only
 * draws it.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode } from '../api';
import { Cond, FilterField, Group, OPS, WINDOWS, blankCond, opDef, withOp } from '../filters';
import { PointerItem, pointerItem, searchRecords } from '../fields';
import { Chips } from './Chips';
import { Picker } from './Picker';

export interface FilterRowsProps {
  group: Group;
  onChange: (group: Group) => void;
  fields: FilterField[];
  /** Nesting depth; a group inside a group is as deep as it goes. */
  depth?: number;
}

export function FilterRows({ group, onChange, fields, depth = 0 }: FilterRowsProps) {
  if (!fields.length) return null;
  const set = (i: number, next: Cond | Group) => onChange({ ...group, items: group.items.map((x, j) => (j === i ? next : x)) });
  const remove = (i: number) => onChange({ ...group, items: group.items.filter((_, j) => j !== i) });
  const add = (item: Cond | Group) => onChange({ ...group, items: [...group.items, item] });
  return (
    <div class={'filter-group' + (depth ? ' nested' : '')}>
      {group.items.map((item, i) => (
        <div class="filter-line" key={i}>
          <span class="filter-conj">
            {i === 0 ? (
              depth ? '' : 'Where'
            ) : i === 1 ? (
              <select aria-label="And or or" value={group.conj} onChange={(e) => onChange({ ...group, conj: (e.currentTarget as HTMLSelectElement).value as 'and' | 'or' })}>
                <option value="and">and</option>
                <option value="or">or</option>
              </select>
            ) : (
              group.conj
            )}
          </span>
          {item.kind === 'cond' ? (
            <CondRow cond={item} fields={fields} onChange={(c) => set(i, c)} />
          ) : (
            <FilterRows group={item} fields={fields} depth={depth + 1} onChange={(g) => (g.items.length ? set(i, g) : remove(i))} />
          )}
          <button type="button" class="btn tiny list-x" aria-label="Remove this condition" title="Remove" onClick={() => remove(i)}>
            ✕
          </button>
        </div>
      ))}
      <div class="filter-adds">
        <button type="button" class="btn tiny" onClick={() => add(blankCond(fields[0]))}>
          + Add condition
        </button>
        {depth < 1 ? (
          <button type="button" class="btn tiny" onClick={() => add({ kind: 'group', conj: group.conj === 'and' ? 'or' : 'and', items: [blankCond(fields[0])] })}>
            + Add group
          </button>
        ) : null}
      </div>
    </div>
  );
}

function CondRow({ cond, fields, onChange }: { cond: Cond; fields: FilterField[]; onChange: (c: Cond) => void }) {
  const field = fields.find((f) => f.name === cond.field) || fields[0];
  const def = opDef(field.kind, cond.op) || OPS[field.kind][0];
  const text = (key: 'value' | 'value2' | 'lat' | 'lng', label: string, type = 'text', placeholder?: string) => (
    <input
      type={type}
      step={type === 'number' ? 'any' : undefined}
      class="filter-value"
      aria-label={label}
      placeholder={placeholder}
      value={cond[key] || ''}
      onInput={(e) => onChange({ ...cond, [key]: (e.currentTarget as HTMLInputElement).value })}
    />
  );
  const inputType = field.kind === 'number' ? 'number' : field.kind === 'date' ? 'date' : 'text';
  return (
    <span class="filter-cond">
      <select
        aria-label="Field"
        value={field.name}
        onChange={(e) => {
          const next = fields.find((f) => f.name === (e.currentTarget as HTMLSelectElement).value)!;
          onChange(next.kind === field.kind ? { ...cond, field: next.name, value: next.kind === 'link' ? '' : cond.value } : blankCond(next));
        }}
      >
        {fields.map((f) => (
          <option key={f.name} value={f.name}>
            {f.name}
          </option>
        ))}
      </select>
      <select aria-label="Operator" value={def.id} onChange={(e) => onChange(withOp(cond, field.kind, (e.currentTarget as HTMLSelectElement).value))}>
        {OPS[field.kind].map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      {def.arity === 'one' && field.kind === 'link' ? <LinkValue field={field} id={cond.value || ''} onPick={(id) => onChange({ ...cond, value: id })} /> : null}
      {def.arity === 'one' && field.kind !== 'link' ? text('value', field.name + ' value', inputType, field.kind === 'list' ? 'an item' : undefined) : null}
      {def.arity === 'two' ? (
        <>
          {text('value', field.name + ' from', inputType)}
          <span class="hint">and</span>
          {text('value2', field.name + ' to', inputType)}
        </>
      ) : null}
      {def.arity === 'many' ? <Chips items={cond.values || []} onChange={(values) => onChange({ ...cond, values })} placeholder="Type a value, Enter" addLabel="Add" /> : null}
      {def.arity === 'window' ? (
        <select aria-label={field.name + ' window'} value={cond.value || 'today'} onChange={(e) => onChange({ ...cond, value: (e.currentTarget as HTMLSelectElement).value })}>
          {WINDOWS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label}
            </option>
          ))}
        </select>
      ) : null}
      {def.arity === 'near' ? (
        <>
          {text('value', field.name + ' distance in km', 'number')}
          <span class="hint">km of</span>
          {text('lat', field.name + ' latitude', 'number', 'latitude')}
          {text('lng', field.name + ' longitude', 'number', 'longitude')}
        </>
      ) : null}
    </span>
  );
}

/** A link's value: a record picked by what it says. */
function LinkValue({ field, id, onPick }: { field: FilterField; id: string; onPick: (id: string) => void }) {
  const [current, setCurrent] = useState<PointerItem | null>(null);
  useEffect(() => {
    if (!id || !field.targetClass) return setCurrent(null);
    if (current && current.objectId === id) return;
    api<Record<string, unknown>>('GET', '/api/' + encode(field.targetClass) + '/' + encode(id))
      .then((r) => setCurrent(pointerItem(r)))
      .catch(() => setCurrent({ objectId: id, label: 'a record that no longer exists', detail: '' }));
  }, [id, field.targetClass]);
  return (
    <Picker<PointerItem>
      fetch={(q) => (field.targetClass ? searchRecords(field.targetClass, q) : Promise.resolve([]))}
      label={(i) => i.label}
      detail={(i) => i.detail}
      keyOf={(i) => i.objectId}
      value={current}
      placeholder={'Pick a ' + (field.targetClass || 'record') + '…'}
      onPick={(item) => {
        setCurrent(item);
        onPick(item ? item.objectId : '');
      }}
    />
  );
}
