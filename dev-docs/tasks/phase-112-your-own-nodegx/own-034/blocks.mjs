// OWN-034 §5 — the building blocks the harness script owns. The model never writes a node: it answers closed questions
// (prompts.mjs), and `build(card)` turns the answers into these fixed NodeGX graph pieces, picked by name. What each
// block is and which answer switches it on is in BLOCKS below, and `harness.mjs --questions` writes it into
// questions.md, so the write-up can state plainly what the script supplied and what the model chose.
//
// The data: one Global Store, Persist on, `{ items: [{ id, name }], ticks: { [itemId]: ["YYYY-MM-DD", …] } }`. Every
// reader subscribes to the one key it needs; every writer is a Function that builds the new value and a Set Global
// Store that writes it. The date logic is blocks/days.js, copied into the app as scripts/days.js (Scripts.days).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const DAYS_JS = fs.readFileSync(path.join(HERE, 'blocks/days.js'), 'utf8');

// P112-OWN034-SUBSCRIBEFIRST: a Subscribe's first value down a wire is the whole (default) store, not its key, so every
// Function that reads a store key takes it only when it has the key's shape (an array, a plain object).
export const STORE = { storeName: 'tracker', persist: true, storageKey: 'nodegx.tracker', initialState: { items: [], ticks: {} } };

export const BLOCKS = [
  'B-store: the Global Store (net.noodl.GlobalStore, Persist on, storage key nodegx.tracker) holding { items, ticks }. Always built: it is where everything is kept.',
  'B-add: the add row: a Text Input and a Button, wearing the kit vocabulary\'s textField and primaryButton compositions; Enter or the button runs one Function that refuses an empty name and appends { id, name }, then a Set Global Store writes items and the field clears. Built when the actions include "add".',
  'B-list: a For Each over the items, drawing one Item Row component per item (Component Inputs name, ticks; Component Outputs Tick, Delete). Always built: the request is a list of items.',
  'B-tick: on each row, a button that ticks the item for today (a Function over Scripts.days.toggle, then Set Global Store ticks), labelled for done / not done. Built when the actions include "tick for today"; a second press unticks only when they include "untick" (always, under tuning T1).',
  'B-delete: on each row, a Delete button; a Function removes the item and its ticks (two Set Global Stores, batched). Asks with the browser\'s confirm first when the answer to "ask first?" is yes. Built when the actions include "delete".',
  'B-days: on each row, the last N days (N from the answer), oldest first, a For Each of Day Cell components (a weekday letter and a dot, filled when done, ringed on today). Built when the views include "the last days per item".',
  'B-number: one Function per derived number on each row, each a one-line call into Scripts.days (streak, bestStreak, doneThisWeek), shown through a String Format with the model\'s label. Built per number chosen.',
  'B-summary: a Summary component on the page that declares the same store by name and subscribes to items and ticks itself (no wire runs from the list to it), showing "<done> of <total> <label>" once there is an item. Built when the numbers include "done today out of all" or the views include "a summary at the top".',
  'B-empty: a line shown while there are no items, in the model\'s words. Always built.',
  'B-look: the look answer picks a style preset: clean → modern, bold → playful, warm → soft. Every colour, space and size in the blocks is a design token, so the preset restyles all of them.',
  'B-classes: the blocks put a fixed cssClassName on the row (item-row), its name (item-name), tick (item-tick), delete (item-delete), day cell (day-cell), day dot (day-dot) and each number (item-<number>), so one locator fits every harness app. They change nothing a person sees.',
  'Not a block yet, recorded when chosen and not built: "rename" (an action), a number per day instead of done / not done.'
];

const pct = (v) => ({ value: v, unit: '%' });
const px = (v) => ({ value: v, unit: 'px' });
const pad = (t) => ({ paddingTop: t, paddingBottom: t, paddingLeft: t, paddingRight: t });
const fn = (id, label, script, extra = {}) => ({ id, type: 'JavaScriptFunction', label, parameters: { functionScript: script, ...extra } });
const usesDays = { uses: 'days.js' };
const quiet = (...inputs) => Object.fromEntries(inputs.map((n) => [`runOnChange-in-${n}`, false]));
const c = (fromId, fromProperty, toId, toProperty) => ({ fromId, fromProperty, toId, toProperty });
const lit = (s) => JSON.stringify(String(s ?? ''));
// A String Format's {tags} are its inputs: braces in the model's words would mint ports.
const plain = (s) => String(s ?? '').replace(/[{}]/g, '').trim();

const NUMBERS = {
  streak: { id: 'streak', call: 'Scripts.days.streak(ticks, Scripts.days.today())', label: 'day streak' },
  'best streak': { id: 'best', call: 'Scripts.days.bestStreak(ticks)', label: 'best' },
  'done this week': { id: 'week', call: 'Scripts.days.doneThisWeek(ticks, Scripts.days.today())', label: 'this week' }
};

// `tuning`: the tuning rules in force (prompts.mjs TUNINGS), e.g. { T1: true }.
export function wants(card, tuning = {}) {
  const a = new Set(card.actions || []), v = new Set(card.views || []), n = new Set(card.numbers || []);
  return {
    add: a.has('add'), tick: a.has('tick for today'), untick: a.has('untick') || !!tuning.T1, del: a.has('delete'), rename: a.has('rename'),
    ask: card.askBeforeDelete === 'yes', days: v.has('the last days per item') ? Number(card.dayCount || 7) : 0,
    summary: n.has('done today out of all') || v.has('a summary at the top'),
    numbers: Object.keys(NUMBERS).filter((k) => n.has(k))
  };
}

// ─── Day Cell ─────────────────────────────────────────────────────────────────────────────────────────────────────
function dayCell() {
  return {
    path: 'Components/Day Cell', intent: 'One day in an item\'s last days: its weekday letter and a dot, filled when done.',
    inputs: [{ name: 'letter', type: 'string' }, { name: 'done', type: 'boolean' }, { name: 'isToday', type: 'boolean' }],
    nodes: [
      { id: 'in', type: 'Component Inputs', label: 'One day', ports: ['letter', 'done', 'isToday'].map((name) => ({ name, plug: 'output', type: '*' })) },
      { id: 'cell', type: 'Group', label: 'A day', parameters: { sizeMode: 'contentSize', flexDirection: 'column', alignItems: 'center', rowGap: 'var(--space-1)', cssClassName: 'day-cell' } },
      { id: 'letter', type: 'Text', label: 'Weekday letter', parent: 'cell', parameters: { sizeMode: 'contentSize', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--muted-foreground)', textAlignX: 'center' } },
      { id: 'dot', type: 'Group', label: 'Done or not', parent: 'cell', parameters: { sizeMode: 'explicit', width: px(24), height: px(24), borderRadius: 'var(--radius-full)', borderStyle: 'solid', borderWidth: 'var(--border-2)', borderColor: 'transparent', backgroundColor: 'var(--muted)', cssClassName: 'day-dot' } },
      { id: 'fill', type: 'Expression', label: 'Done is filled', parameters: { expression: "done ? 'var(--primary)' : 'var(--muted)'" } },
      { id: 'ring', type: 'Expression', label: 'Today is ringed', parameters: { expression: "isToday ? 'var(--foreground)' : 'transparent'" } }
    ],
    connections: [c('in', 'letter', 'letter', 'text'), c('in', 'done', 'fill', 'done'), c('in', 'isToday', 'ring', 'isToday'), c('fill', 'result', 'dot', 'backgroundColor'), c('ring', 'result', 'dot', 'borderColor')],
    visual_roots: ['cell']
  };
}

// ─── Item Row ─────────────────────────────────────────────────────────────────────────────────────────────────────
function itemRow(card, w) {
  const W = card.words?.row || {};
  const nodes = [
    { id: 'in', type: 'Component Inputs', label: 'One item', ports: ['name', 'ticks'].map((name) => ({ name, plug: 'output', type: '*' })) },
    { id: 'out', type: 'Component Outputs', label: 'What the row reports upward', ports: [...(w.tick ? ['Tick'] : []), ...(w.del ? ['Delete'] : [])].map((name) => ({ name, plug: 'input', type: 'signal' })) },
    { id: 'row', type: 'Group', label: 'One item', parameters: { width: pct(100), flexDirection: 'column', rowGap: 'var(--space-3)', backgroundColor: 'var(--surface)', borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--border)', borderRadius: 'var(--radius-lg)', ...pad('var(--space-4)'), cssClassName: 'item-row' } },
    { id: 'top', type: 'Group', label: 'Name and delete', parent: 'row', parameters: { width: pct(100), flexDirection: 'row', alignItems: 'center', columnGap: 'var(--space-2)' } },
    { id: 'name', type: 'Text', label: 'The item\'s name', parent: 'top', parameters: { width: pct(100), fontSize: 'var(--text-base)', fontWeight: 'var(--font-semibold)', lineHeight: 'var(--leading-snug)', color: 'var(--foreground)', cssClassName: 'item-name' } }
  ];
  const conns = [c('in', 'name', 'name', 'text')];
  if (!nodes[1].ports.length) nodes.splice(1, 1);
  if (w.del) {
    nodes.push({ id: 'delete', type: 'net.noodl.controls.button', label: 'Delete this item', parent: 'top', parameters: { useLabel: true, label: W.delete || 'Delete', sizeMode: 'contentSize', color: 'var(--muted-foreground)', backgroundColor: 'transparent', borderStyle: 'none', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', ...pad('var(--space-2)'), cssClassName: 'item-delete' } });
    conns.push(c('delete', 'onClick', 'out', 'Delete'));
  }
  if (w.numbers.length) {
    nodes.push({ id: 'stats', type: 'Group', label: 'The numbers', parent: 'row', parameters: { width: pct(100), flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 'var(--space-2)', rowGap: 'var(--space-2)' } });
    for (const k of w.numbers) {
      const N = NUMBERS[k];
      nodes.push(
        { id: `${N.id}-pill`, type: 'Group', label: k, parent: 'stats', parameters: { sizeMode: 'contentSize', flexDirection: 'row', alignItems: 'center', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius-full)', paddingLeft: 'var(--space-3)', paddingRight: 'var(--space-3)', paddingTop: 'var(--space-1)', paddingBottom: 'var(--space-1)' } },
        { id: `${N.id}-text`, type: 'Text', label: `${k}, in words`, parent: `${N.id}-pill`, parameters: { sizeMode: 'contentSize', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-medium)', color: 'var(--foreground)', cssClassName: `item-${N.id}` } },
        fn(`${N.id}-fn`, k, `// B-number: ${k}, from the one date file.\nconst ticks = Inputs.ticks || [];\nOutputs.value = ${N.call};\n`, usesDays),
        { id: `${N.id}-format`, type: 'String Format', label: `How ${k} reads`, parameters: { format: `{n} ${plain(W[N.id]) || N.label}` } }
      );
      conns.push(c('in', 'ticks', `${N.id}-fn`, 'in-ticks'), c(`${N.id}-fn`, 'out-value', `${N.id}-format`, 'n'), c(`${N.id}-format`, 'formatted', `${N.id}-text`, 'text'));
    }
  }
  if (w.days) {
    nodes.push(
      { id: 'days-row', type: 'Group', label: `The last ${w.days} days`, parent: 'row', parameters: { width: pct(100), flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 'var(--space-2)', rowGap: 'var(--space-2)' } },
      { id: 'days', type: 'For Each', label: 'One cell per day, oldest first', parent: 'days-row', parameters: { template: '/Components/Day Cell' } },
      fn('days-fn', `The last ${w.days} days`, `// B-days: the last ${w.days} days, oldest first, each with a stable id.\nOutputs.cells = Scripts.days.lastDays(Inputs.ticks || [], Scripts.days.today(), ${w.days});\n`, usesDays)
    );
    conns.push(c('in', 'ticks', 'days-fn', 'in-ticks'), c('days-fn', 'out-cells', 'days', 'items'));
  }
  if (w.tick) {
    nodes.push(
      { id: 'tick', type: 'net.noodl.controls.button', label: 'Tick it off for today', parent: 'row', parameters: { useLabel: true, label: W.tick || 'Mark done today', sizeMode: 'contentHeight', width: pct(100), borderStyle: 'solid', borderWidth: 'var(--border-1)', borderColor: 'var(--primary)', borderRadius: 'var(--radius-md)', fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', paddingTop: 'var(--space-3)', paddingBottom: 'var(--space-3)', backgroundColor: 'var(--surface)', color: 'var(--primary)', cssClassName: 'item-tick' } },
      fn('today-fn', 'Is it done today', '// B-tick: done today or not, from the one date file.\nOutputs.doneToday = (Inputs.ticks || []).indexOf(Scripts.days.today()) !== -1;\n', usesDays),
      { id: 'tick-label', type: 'Expression', label: 'The tick\'s words', parameters: { expression: `doneToday ? ${lit(W.ticked || 'Done today')} : ${lit(W.tick || 'Mark done today')}` } },
      { id: 'tick-fill', type: 'Expression', label: 'Done is filled', parameters: { expression: "doneToday ? 'var(--primary)' : 'var(--surface)'" } },
      { id: 'tick-ink', type: 'Expression', label: 'Done reads on the fill', parameters: { expression: "doneToday ? 'var(--primary-foreground)' : 'var(--primary)'" } }
    );
    conns.push(c('in', 'ticks', 'today-fn', 'in-ticks'), c('today-fn', 'out-doneToday', 'tick-label', 'doneToday'), c('today-fn', 'out-doneToday', 'tick-fill', 'doneToday'), c('today-fn', 'out-doneToday', 'tick-ink', 'doneToday'),
      c('tick-label', 'result', 'tick', 'label'), c('tick-fill', 'result', 'tick', 'backgroundColor'), c('tick-ink', 'result', 'tick', 'color'), c('tick', 'onClick', 'out', 'Tick'));
  }
  return {
    path: 'Components/Item Row', intent: 'One item in the list: its name, its numbers, its last days, and its tick and delete.',
    inputs: [{ name: 'name', type: 'string' }, { name: 'ticks', type: 'array of day strings' }],
    outputs: [...(w.tick ? [{ name: 'Tick', type: 'signal' }] : []), ...(w.del ? [{ name: 'Delete', type: 'signal' }] : [])],
    instantiates: w.days ? ['Components/Day Cell'] : undefined,
    nodes, connections: conns, visual_roots: ['row']
  };
}

// ─── Summary ──────────────────────────────────────────────────────────────────────────────────────────────────────
function summary(card) {
  const W = card.words?.summary || {};
  return {
    path: 'Components/Summary', intent: 'How many items are done today out of all, read from the store itself.',
    nodes: [
      { id: 'band', type: 'Group', label: 'Today so far', parameters: { mounted: false, width: pct(100), flexDirection: 'row', alignItems: 'center', backgroundColor: 'var(--muted)', borderRadius: 'var(--radius-lg)', ...pad('var(--space-3)'), cssClassName: 'summary' } },
      { id: 'text', type: 'Text', label: 'Done today out of all', parent: 'band', parameters: { width: pct(100), fontSize: 'var(--text-sm)', fontWeight: 'var(--font-medium)', color: 'var(--foreground)', cssClassName: 'summary-text' } },
      { id: 'store', type: 'net.noodl.GlobalStore', label: 'The same store, by name', parameters: { ...STORE } },
      { id: 'items', type: 'net.noodl.GlobalStore.Subscribe', label: 'Watch the items', parameters: { storeName: STORE.storeName, keys: 'items' } },
      { id: 'ticks', type: 'net.noodl.GlobalStore.Subscribe', label: 'Watch the ticks', parameters: { storeName: STORE.storeName, keys: 'ticks' } },
      fn('count', 'Done today out of all', '// B-summary: from the one date file.\nconst items = (Array.isArray(Inputs.items) ? Inputs.items : []);\nOutputs.done = Scripts.days.doneToday(items, (Inputs.ticks && typeof Inputs.ticks === "object" && !Array.isArray(Inputs.ticks) ? Inputs.ticks : {}), Scripts.days.today());\nOutputs.total = items.length;\n', usesDays),
      { id: 'format', type: 'String Format', label: 'How the summary reads', parameters: { format: `{done} of {total} ${plain(W.label) || 'done today'}` } },
      { id: 'any', type: 'Expression', label: 'Only once there is an item', parameters: { expression: 'total > 0' } }
    ],
    connections: [c('items', 'value', 'count', 'in-items'), c('ticks', 'value', 'count', 'in-ticks'), c('count', 'out-done', 'format', 'done'), c('count', 'out-total', 'format', 'total'),
      c('count', 'out-total', 'any', 'total'), c('any', 'result', 'band', 'mounted'), c('format', 'formatted', 'text', 'text')],
    visual_roots: ['band']
  };
}

// ─── Home ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function home(card, w, pageId, look) {
  const H = card.words?.header || {}, A = card.words?.add || {}, E = card.words?.empty || {};
  const nodes = [
    { id: pageId, type: 'Page', label: 'Home', parameters: { title: H.title || 'Tracker', urlPath: 'home' } },
    { id: 'canvas', type: 'Group', label: 'Page canvas', parent: pageId, parameters: { width: pct(100), sizeMode: 'contentHeight', backgroundColor: 'var(--background)', flexDirection: 'column', alignItems: 'center', paddingTop: 'var(--space-10)', paddingBottom: 'var(--space-16)', paddingLeft: 'var(--space-4)', paddingRight: 'var(--space-4)' } },
    { id: 'shell', type: 'Group', label: 'One column', parent: 'canvas', parameters: { width: pct(100), maxWidth: px(560), sizeMode: 'contentHeight', flexDirection: 'column', rowGap: 'var(--space-5)' } },
    { id: 'head', type: 'Group', label: 'Heading', parent: 'shell', parameters: { width: pct(100), flexDirection: 'column', rowGap: 'var(--space-1)' } },
    { id: 'title', type: 'Text', label: 'Title', parent: 'head', parameters: { text: H.title || 'Tracker', as: 'h1', fontSize: 'var(--text-3xl)', fontWeight: 'var(--font-bold)', lineHeight: 'var(--leading-tight)', color: 'var(--foreground)' } },
    ...(H.subtitle ? [{ id: 'subtitle', type: 'Text', label: 'One line under the title', parent: 'head', parameters: { text: H.subtitle, fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)' } }] : []),
    ...(w.summary ? [{ id: 'summary', type: '/Components/Summary', label: 'Done today out of all', parent: 'shell' }] : []),
    { id: 'store', type: 'net.noodl.GlobalStore', label: 'Everything kept on this device', parameters: { ...STORE } },
    { id: 'items', type: 'net.noodl.GlobalStore.Subscribe', label: 'Watch the items', parameters: { storeName: STORE.storeName, keys: 'items' } },
    { id: 'ticks', type: 'net.noodl.GlobalStore.Subscribe', label: 'Watch the ticks', parameters: { storeName: STORE.storeName, keys: 'ticks' } }
  ];
  const conns = [];
  if (w.add) {
    nodes.push(
      { id: 'add-row', type: 'Group', label: 'Add one', parent: 'shell', parameters: { width: pct(100), flexDirection: 'row', alignItems: 'center', columnGap: 'var(--space-2)' } },
      { id: 'add-input', type: 'net.noodl.controls.textinput', label: 'Its name', parent: 'add-row', parameters: { ...look.textField, placeholder: A.placeholder || 'Name', enterKeyHint: 'done', cssClassName: 'add-input' } },
      { id: 'add-button', type: 'net.noodl.controls.button', label: 'Add it', parent: 'add-row', parameters: { ...look.primaryButton, useLabel: true, label: A.button || 'Add', cssClassName: 'add-button' } },
      fn('add-fn', 'Add an item', "// B-add: an empty name adds nothing.\nconst name = String(Inputs.name || '').trim();\nif (!name) { Outputs.refused(); return; }\nconst items = ((Array.isArray(Inputs.items) ? Inputs.items : [])).slice();\nitems.push({ id: 'i' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: name });\nOutputs.items = items;\nOutputs.added();\n", quiet('name', 'items')),
      { id: 'set-items-add', type: 'net.noodl.GlobalStore.Set', label: 'Write the items', parameters: { storeName: STORE.storeName, key: 'items' } }
    );
    conns.push(c('add-input', 'onTextChanged', 'add-fn', 'in-name'), c('items', 'value', 'add-fn', 'in-items'), c('add-button', 'onClick', 'add-fn', 'run'), c('add-input', 'onEnter', 'add-fn', 'run'),
      c('add-fn', 'out-items', 'set-items-add', 'value'), c('add-fn', 'out-added', 'set-items-add', 'set'), c('add-fn', 'out-added', 'add-input', 'clear'));
  }
  nodes.push(
    { id: 'list-box', type: 'Group', label: 'The list', parent: 'shell', parameters: { width: pct(100), flexDirection: 'column', rowGap: 'var(--space-3)' } },
    { id: 'list', type: 'For Each', label: 'One row per item', parent: 'list-box', parameters: { template: '/Components/Item Row' } },
    fn('rows-fn', 'The rows', '// B-list: one row per item, with its own ticks; ids stay stable so rows keep their place.\nconst items = (Array.isArray(Inputs.items) ? Inputs.items : []);\nconst ticks = (Inputs.ticks && typeof Inputs.ticks === "object" && !Array.isArray(Inputs.ticks) ? Inputs.ticks : {});\nOutputs.rows = items.map(function (item) { return { id: item.id, name: item.name, ticks: ticks[item.id] || [] }; });\nOutputs.empty = items.length === 0;\n'),
    { id: 'empty', type: 'Text', label: 'Nothing here yet', parent: 'shell', parameters: { mounted: false, text: E.text || 'Nothing here yet.', fontSize: 'var(--text-sm)', color: 'var(--muted-foreground)', cssClassName: 'empty-line' } }
  );
  conns.push(c('items', 'value', 'rows-fn', 'in-items'), c('ticks', 'value', 'rows-fn', 'in-ticks'), c('rows-fn', 'out-rows', 'list', 'items'), c('rows-fn', 'out-empty', 'empty', 'mounted'));
  if (w.tick) {
    nodes.push(
      fn('tick-fn', 'Tick or untick for today', `// B-tick: from the one date file; a second press ${w.untick ? 'unticks' : 'keeps the tick (untick was not chosen)'}.\nif (!Inputs.id) return;\nOutputs.ticks = Scripts.days.toggle((Inputs.ticks && typeof Inputs.ticks === "object" && !Array.isArray(Inputs.ticks) ? Inputs.ticks : {}), Inputs.id, Scripts.days.today(), ${w.untick});\nOutputs.changed();\n`, { ...usesDays, ...quiet('id', 'ticks') }),
      { id: 'set-ticks', type: 'net.noodl.GlobalStore.Set', label: 'Write the ticks', parameters: { storeName: STORE.storeName, key: 'ticks' } }
    );
    conns.push(c('list', 'itemOutputSignal-Tick', 'tick-fn', 'run'), c('list', 'itemActionItemId', 'tick-fn', 'in-id'), c('ticks', 'value', 'tick-fn', 'in-ticks'),
      c('tick-fn', 'out-ticks', 'set-ticks', 'value'), c('tick-fn', 'out-changed', 'set-ticks', 'set'));
  }
  if (w.del) {
    nodes.push(
      fn('delete-fn', 'Delete an item and its ticks', `// B-delete${w.ask ? ', asking first' : ''}.\nconst items = (Array.isArray(Inputs.items) ? Inputs.items : []);\nlet hit = null;\nfor (let i = 0; i < items.length; i++) if (items[i].id === Inputs.id) hit = items[i];\nif (!hit) return;\n${w.ask ? `if (!window.confirm(${lit(card.words?.row?.confirm || 'Delete this?')}.replace('%s', hit.name))) return;\n` : ''}Outputs.items = items.filter(function (item) { return item.id !== hit.id; });\nconst ticks = {};\nconst old = (Inputs.ticks && typeof Inputs.ticks === "object" && !Array.isArray(Inputs.ticks) ? Inputs.ticks : {});\nfor (const k in old) if (k !== hit.id) ticks[k] = old[k];\nOutputs.ticks = ticks;\nOutputs.removed();\n`, quiet('id', 'items', 'ticks')),
      { id: 'set-items-del', type: 'net.noodl.GlobalStore.Set', label: 'Write the items', parameters: { storeName: STORE.storeName, key: 'items', transaction: true } },
      { id: 'set-ticks-del', type: 'net.noodl.GlobalStore.Set', label: 'Write the ticks', parameters: { storeName: STORE.storeName, key: 'ticks', transaction: true } }
    );
    conns.push(c('list', 'itemOutputSignal-Delete', 'delete-fn', 'run'), c('list', 'itemActionItemId', 'delete-fn', 'in-id'), c('items', 'value', 'delete-fn', 'in-items'), c('ticks', 'value', 'delete-fn', 'in-ticks'),
      c('delete-fn', 'out-items', 'set-items-del', 'value'), c('delete-fn', 'out-ticks', 'set-ticks-del', 'value'), c('delete-fn', 'out-removed', 'set-items-del', 'set'), c('delete-fn', 'out-removed', 'set-ticks-del', 'set'));
  }
  return {
    path: 'Pages/Home', intent: 'The tracker: the heading, the add row, the list of items and the summary.',
    instantiates: ['Components/Item Row', ...(w.summary ? ['Components/Summary'] : [])],
    nodes, connections: conns, visual_roots: [pageId]
  };
}

// The whole app, in plan order: a component before anything that places it.
// `look`: the kit vocabulary's compositions by id (get_style_vocabulary), so the add row wears the kit's own textField
// and primaryButton rather than parameters copied into this file.
export function build(card, pageId, look = {}, tuning = {}) {
  const w = wants(card, tuning);
  const notBuilt = [...(w.rename ? ['rename (an action): no block yet'] : [])];
  return { w, notBuilt,
    components: [...(w.days ? [dayCell()] : []), itemRow(card, w), ...(w.summary ? [summary(card)] : []), home(card, w, pageId, look)] };
}
