// The page: draws the server's table and sends each thing the person does as one action.
// No value is interpreted here; the server reads what was typed (src/cells.mjs) and says no in a sentence.

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const state = { project: null, component: null, table: null, allPorts: false, columnFilter: '', componentFilter: '' };

async function api(method, path, body) {
  const res = await fetch(path, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const data = await res.json().catch(() => ({ error: `The editor answered ${res.status}.` }));
  if (!res.ok || data.error) throw Object.assign(new Error(data.error ?? `The editor answered ${res.status}.`), { status: res.status });
  return data;
}

function status(text, kind = '') {
  const el = $('status');
  el.textContent = text;
  el.className = 'status ' + kind;
}

// ------------------------------------------------------------------ project and components

async function loadProject() {
  state.project = await api('GET', '/api/project');
  const p = state.project;
  if (!p.open) {
    status('Type the folder of a NodeGX app at the top and press Open.');
    return;
  }
  $('dir').value = p.dir;
  $('app-name').textContent = `${p.name ?? ''} · format ${p.formatVersion ?? '?'}`;
  drawComponents();
  updateSave();
  if (!state.component || !p.components.some((c) => c.key === state.component)) {
    const first = p.components.find((c) => c.key === 'App') ?? p.components[0];
    if (first) await showComponent(first.key);
  }
  if (!p.vocabulary.runtime) readRuntimeVocabulary();
}

function drawComponents() {
  const f = state.componentFilter.toLowerCase();
  $('component-list').innerHTML = state.project.components
    .filter((c) => !f || c.key.toLowerCase().includes(f))
    .map((c) => `<li><button data-key="${esc(c.key)}" aria-current="${c.key === state.component}">${esc(c.key)}${c.dirty ? '<span class="dot" title="Unsaved changes">●</span>' : ''}</button></li>`)
    .join('');
}

function updateSave() {
  const dirty = state.project?.components?.filter((c) => c.dirty).length ?? 0;
  $('save').disabled = dirty === 0;
  $('save').textContent = dirty ? `Save (${dirty} changed)` : 'Save';
  $('revert').disabled = !state.table?.dirty;
}

async function refreshProject() {
  state.project = await api('GET', '/api/project');
  drawComponents();
  updateSave();
}

async function showComponent(key) {
  state.component = key;
  closeEditor();
  await reloadTable();
  drawComponents();
}

async function reloadTable() {
  const wrap = $('table-wrap');
  const scroll = [wrap.scrollLeft, wrap.scrollTop];
  state.table = await api('GET', `/api/table?component=${encodeURIComponent(state.component)}${state.allPorts ? '&all=1' : ''}`);
  drawTable();
  [wrap.scrollLeft, wrap.scrollTop] = scroll;
  updateSave();
}

// ------------------------------------------------------------------ the table

const FIXED = [
  { key: 'id', title: 'id', ro: true },
  { key: 'type', title: 'type', ro: true },
  { key: 'label', title: 'label' },
  { key: 'parent', title: 'parent', hint: 'id #place' },
  { key: 'position', title: 'position', hint: 'x, y' }
];

function visibleColumns() {
  const f = state.columnFilter.toLowerCase();
  return state.table.columns.filter((c) => !f || c.name.toLowerCase().includes(f));
}

function drawTable() {
  const t = state.table;
  $('component-title').textContent = t.component;
  $('add-node').disabled = false;
  $('hidden-note').textContent = t.hiddenColumns ? `${t.hiddenColumns} more ports have nothing set; "Show every port" lists them.` : '';
  const banner = $('banner');
  banner.hidden = !t.cloud;
  banner.textContent = t.cloud ? 'This is a cloud function. The app hears a change to it only once it is deployed: save here, then ask your agent to run deploy_cloud_functions. This editor has no deploy.' : '';
  const cols = visibleColumns();
  const head = ['<th class="sticky rm" aria-label="Remove"></th>',
    ...FIXED.map((c) => `<th class="${c.key}">${esc(c.title)}${c.hint ? `<small>${esc(c.hint)}</small>` : ''}</th>`),
    ...cols.map((c) => `<th class="${c.plug === 'output' ? 'out' : ''}" title="${esc(c.description ?? '')}">${c.plug === 'output' ? esc(c.name) + ' →' : '→ ' + esc(c.name)}<small>${esc(c.types.join(' | ') || 'not declared')}</small></th>`)];
  const body = t.rows.map((r) => {
    const has = new Set(r.ports);
    const fixed = FIXED.map((c) => {
      const text = r[c.key];
      const inner = c.key === 'id' ? `<span class="indent" style="width:${r.depth * 12}px"></span>${esc(text)}` : esc(text);
      const title = c.key === 'type' && !r.described ? 'The vocabulary does not describe this type' : text;
      return `<td class="${c.key} ${c.ro ? 'ro' : 'cell'}" ${c.ro ? '' : 'tabindex="0"'} data-node="${esc(r.id)}" data-col="${c.key}" title="${esc(title)}">${inner}</td>`;
    });
    const ports = cols.map((c) => {
      const cell = r.cells[c.key];
      const parts = [];
      if (cell?.text !== undefined) parts.push(esc(cell.text.length > 60 ? cell.text.slice(0, 60) + '…' : cell.text));
      for (const w of cell?.wires ?? []) {
        const cls = w.missing ? 'wire-missing' : c.plug === 'input' ? 'wire-in' : 'wire-out';
        parts.push(`<span class="${cls}">${c.plug === 'input' ? '←' : '→'} ${esc(w.name)}.${esc(w.port)}</span>`);
      }
      const cls = ['cell', has.has(c.key) ? '' : 'na', cell?.unknown ? 'unknown' : ''].join(' ');
      const title = cell?.unknown ? `${r.type} does not declare "${c.name}"` : cell?.text ?? '';
      return `<td class="${cls}" tabindex="0" data-node="${esc(r.id)}" data-col="${esc(c.key)}" title="${esc(title)}">${parts.join(' ')}</td>`;
    });
    return `<tr><td class="sticky rm"><button data-remove="${esc(r.id)}" title="Remove this node" aria-label="Remove ${esc(r.id)}">✕</button></td>${fixed.join('')}${ports.join('')}</tr>`;
  });
  $('table').innerHTML = `<thead><tr>${head.join('')}</tr></thead><tbody>${body.join('')}</tbody>`;
}

// ------------------------------------------------------------------ one action

async function act(action) {
  try {
    const out = await api('POST', '/api/action', { component: state.component, ...action });
    await reloadTable();
    await refreshProject();
    status('Changed. Nothing is written until you press Save.');
    return out;
  } catch (err) {
    status(err.message, 'bad');
    throw err;
  }
}

// ------------------------------------------------------------------ the cell editor

function rowOf(id) {
  return state.table.rows.find((r) => r.id === id);
}

function closeEditor() {
  const ed = $('editor');
  ed.hidden = true;
  ed.innerHTML = '';
  if (state.returnFocus) state.returnFocus.focus?.();
  state.returnFocus = null;
}

function place(ed, td) {
  const r = td.getBoundingClientRect();
  ed.hidden = false;
  const w = ed.offsetWidth, h = ed.offsetHeight;
  ed.style.left = Math.max(8, Math.min(r.left, innerWidth - w - 8)) + 'px';
  ed.style.top = (r.bottom + h + 8 < innerHeight ? r.bottom + 2 : Math.max(8, r.top - h - 2)) + 'px';
}

function portOptions(plug) {
  // Every node's ports of one plug, as "node.port" suggestions for a new wire.
  return state.table.rows.flatMap((r) => r.ports.filter((k) => k.startsWith(plug === 'output' ? 'out:' : 'in:')).map((k) => ({ node: r.id, port: k.slice(k.indexOf(':') + 1) })));
}

async function openEditor(td) {
  const node = td.dataset.node, col = td.dataset.col;
  const row = rowOf(node);
  if (!row) return;
  const ed = $('editor');
  state.returnFocus = td;
  const column = state.table.columns.find((c) => c.key === col);
  const fixed = FIXED.find((c) => c.key === col);
  let html = `<h2>${esc(row.label || row.id)} · ${esc(fixed ? fixed.title : column?.name ?? col)}</h2>`;
  if (fixed) {
    const hint = col === 'parent' ? 'The parent node\'s id; add "#2" to make it the second child.' : col === 'position' ? 'x and y, as "120, 40".' : '';
    html += `<p class="desc">${esc(hint)}</p><form id="ed-form"><input id="ed-text" style="width:100%" value="${esc(row[col])}" spellcheck="false" autocomplete="off">
      <div class="row"><button class="primary">Set</button><button type="button" data-close>Cancel</button></div><p class="error" id="ed-error"></p></form>`;
  } else {
    const plug = col.startsWith('out:') ? 'output' : 'input';
    const name = col.slice(col.indexOf(':') + 1);
    const cell = row.cells[col];
    const declared = row.ports.includes(col);
    html += `<p class="desc">${esc(plug)} · ${esc(column?.types?.join(' | ') || 'type not known')}${column?.description ? ' · ' + esc(column.description) : ''}</p>`;
    if (!declared) html += `<p class="error">${esc(row.type)} does not declare "${esc(name)}". The file can hold it, but the node may never read it.</p>`;
    if (plug === 'input' && !column?.types?.includes('signal')) {
      const { text } = await api('GET', `/api/cell?component=${encodeURIComponent(state.component)}&node=${encodeURIComponent(node)}&column=${encodeURIComponent(col)}`);
      html += `<form id="ed-form"><textarea id="ed-text" spellcheck="false" aria-label="Value">${esc(text)}</textarea>
        <p class="hint">Enter sets it, Shift+Enter is a new line, Esc cancels. Start with = to type JSON.</p>
        <div class="row"><button class="primary">Set</button><button type="button" id="ed-clear" ${cell?.text === undefined ? 'disabled' : ''}>Clear value</button><button type="button" data-close>Cancel</button></div>
        <p class="error" id="ed-error"></p></form>`;
    }
    const wires = cell?.wires ?? [];
    html += `<h3>${plug === 'input' ? 'Wires coming in' : 'Wires going out'}</h3><ul>${wires.map((w, i) =>
      `<li><span class="${plug === 'input' ? 'wire-in' : 'wire-out'}">${plug === 'input' ? '←' : '→'} ${esc(w.name)}.${esc(w.port)}</span><button type="button" data-unwire="${i}" aria-label="Remove this wire">✕</button></li>`).join('') || '<li class="hint">None</li>'}</ul>`;
    const options = portOptions(plug === 'input' ? 'output' : 'input').filter((o) => o.node !== node);
    html += `<form id="wire-form" class="row"><input id="wire-end" list="wire-list" placeholder="${plug === 'input' ? 'from node.port' : 'to node.port'}" spellcheck="false" autocomplete="off" aria-label="Other end of a new wire">
      <datalist id="wire-list">${options.slice(0, 2000).map((o) => `<option value="${esc(o.node)}.${esc(o.port)}">`).join('')}</datalist><button>Add wire</button></form>`;
    if (!fixed && plug === 'input' && column?.types?.includes('signal')) html += '<p class="hint">A signal has no value; wire something to it.</p>';
    html += '<p class="error" id="wire-error"></p><div class="row"><button type="button" data-close>Close</button></div>';
    ed.dataset.plug = plug;
  }
  ed.innerHTML = html;
  ed.dataset.node = node;
  ed.dataset.col = col;
  place(ed, td);
  const input = $('ed-text') ?? $('wire-end');
  input?.focus();
  input?.select?.();
}

async function submitValue() {
  const ed = $('editor');
  const { node, col } = ed.dataset;
  const text = $('ed-text').value;
  try {
    await act({ action: 'setCell', node, column: col, text });
    closeEditor();
  } catch (err) {
    $('ed-error') && ($('ed-error').textContent = err.message);
  }
}

function splitEnd(text) {
  // "node.port": node ids may hold dots, so the port is what follows the last dot that leaves a real node id.
  const rows = state.table.rows.map((r) => r.id).sort((a, b) => b.length - a.length);
  const id = rows.find((r) => text.startsWith(r + '.'));
  if (id) return { node: id, port: text.slice(id.length + 1) };
  const i = text.indexOf('.');
  return i > 0 ? { node: text.slice(0, i), port: text.slice(i + 1) } : null;
}

// ------------------------------------------------------------------ adding and removing rows

function openAddDialog() {
  const d = $('add-dialog');
  $('add-form').reset();
  $('add-error').textContent = '';
  $('type-list').innerHTML = state.table.types.map((t) => `<option value="${esc(t)}">`).join('');
  d.querySelector('[name=parent]').innerHTML = '<option value="">(none)</option>' +
    state.table.rows.map((r) => `<option value="${esc(r.id)}">${esc(r.id)}${r.label ? ' · ' + esc(r.label) : ''}</option>`).join('');
  d.showModal();
}

async function submitAdd() {
  const f = new FormData($('add-form'));
  const num = (k) => (String(f.get(k) ?? '').trim() === '' ? undefined : Number(f.get(k)));
  const place = num('place');
  const action = { action: 'addNode', type: String(f.get('type')).trim(), label: String(f.get('label') ?? ''), parent: String(f.get('parent') ?? '') || undefined,
    index: place !== undefined ? place - 1 : undefined, x: num('x'), y: num('y') };
  if (action.label === '') delete action.label;
  try {
    const { id } = await act(action);
    $('add-dialog').close();
    status(`Added ${id}. Nothing is written until you press Save.`);
  } catch (err) {
    $('add-error').textContent = err.message;
  }
}

async function removeRow(id) {
  const { nodes, wires } = await api('GET', `/api/removal?component=${encodeURIComponent(state.component)}&node=${encodeURIComponent(id)}`);
  const what = `${nodes === 1 ? 'this node' : `this node and the ${nodes - 1} under it`}${wires ? ` and ${wires} wire${wires === 1 ? '' : 's'}` : ''}`;
  if (!confirm(`Remove ${what}?`)) return;
  await act({ action: 'removeNode', node: id }).catch(() => {});
}

// ------------------------------------------------------------------ saving and opening

async function save() {
  try {
    const out = await api('POST', '/api/save');
    await refreshProject();
    if (state.component) await reloadTable();
    const parts = [];
    if (out.written.length) parts.push(`Saved ${out.written.join(', ')}.`);
    if (out.unchanged.length) parts.push(`${out.unchanged.join(', ')} ended up unchanged, so nothing was written.`);
    if (out.refused.length) status([...parts, ...out.refused.map((r) => r.sentence)].join(' '), 'bad');
    else status(parts.join(' ') || 'Nothing to save.', 'good');
  } catch (err) {
    status(err.message, 'bad');
  }
}

async function openFolder(dir, discard = false) {
  try {
    await api('POST', '/api/open', { dir, discard });
    state.component = null;
    await loadProject();
    status(`Opened ${dir}. Nothing is written until you press Save.`);
  } catch (err) {
    if (err.status === 409 && confirm(`${err.message}\n\nDrop them and open the other folder?`)) return openFolder(dir, true);
    status(err.message, 'bad');
  }
}

// ------------------------------------------------------------------ the runtime's node list (visual nodes' ports)

async function readRuntimeVocabulary() {
  // The runtime's node library is what lists every node type's ports, visual ones included. The kit hands it out from
  // @nodegx/preview mounted in a page; it is mounted here, out of sight, on an empty one-group app, read once, and gone.
  status('Reading the runtime\'s list of nodes and ports (once)…');
  try {
    await new Promise((ok, fail) => {
      if (window.NodegxPreview) return ok();
      const s = document.createElement('script');
      s.src = '/kit/preview/noodl-preview-in-page.js';
      s.onload = ok;
      s.onerror = () => fail(new Error('the preview bundle did not load'));
      document.head.appendChild(s);
    });
    const preview = await window.NodegxPreview.mountPreview($('vocab-host'), { runtimeBase: '/runtime/' });
    const out = await preview.update(emptyApp());
    const nodeLibrary = preview.nodeLibrary;
    preview.dispose();
    if (!nodeLibrary) throw new Error(out?.message ?? 'the runtime gave no node library');
    const saved = await api('POST', '/api/node-library', { nodeLibrary });
    await refreshProject();
    if (state.component) await reloadTable();
    status(`The runtime described ${saved.types} node types.`, 'good');
  } catch (err) {
    status(`Could not read the runtime's node list (${err.message}). Ports come from node-spec and the app's own files only.`, 'bad');
  }
}

function emptyApp() {
  const t = '2026-01-01T00:00:00.000Z';
  const id = '00000000-0000-4000-8000-000000000001';
  return {
    'nodegx.project.json': JSON.stringify({ name: 'vocabulary', version: '5', rootNodeId: 'root', structure: { componentsDir: 'components' } }),
    'components/_registry.json': JSON.stringify({ version: 1, lastUpdated: t, components: { App: { path: 'App', type: 'visual', nodeCount: 1, connectionCount: 0, modified: t, created: t } }, stats: { totalComponents: 1, totalNodes: 1, totalConnections: 0 } }),
    'components/App/component.json': JSON.stringify({ id, name: 'App', path: '/App', type: 'visual', created: t, modified: t }),
    'components/App/nodes.json': JSON.stringify({ componentId: id, version: 1, nodes: [{ id: 'root', type: 'Group' }], visualRoots: ['root'] }),
    'components/App/connections.json': JSON.stringify({ componentId: id, version: 1, connections: [] })
  };
}

// ------------------------------------------------------------------ wiring up

$('open-form').addEventListener('submit', (e) => {
  e.preventDefault();
  openFolder($('dir').value.trim());
});
$('save').addEventListener('click', save);
$('component-filter').addEventListener('input', (e) => {
  state.componentFilter = e.target.value;
  drawComponents();
});
$('component-list').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-key]');
  if (b) showComponent(b.dataset.key).catch((err) => status(err.message, 'bad'));
});
$('all-ports').addEventListener('change', (e) => {
  state.allPorts = e.target.checked;
  reloadTable();
});
$('column-filter').addEventListener('input', (e) => {
  state.columnFilter = e.target.value;
  drawTable();
});
$('add-node').addEventListener('click', openAddDialog);
$('add-form').addEventListener('submit', (e) => {
  if (e.submitter?.value !== 'add') return;
  e.preventDefault();
  submitAdd();
});
$('revert').addEventListener('click', async () => {
  if (!confirm(`Drop your unsaved changes to ${state.component}?`)) return;
  await act({ action: 'revert' }).catch(() => {});
  status(`Back to what ${state.component} holds on disk.`);
});

$('table').addEventListener('click', (e) => {
  const rm = e.target.closest('button[data-remove]');
  if (rm) return void removeRow(rm.dataset.remove);
  const td = e.target.closest('td.cell');
  if (td) openEditor(td).catch((err) => status(err.message, 'bad'));
});
$('table').addEventListener('keydown', (e) => {
  const td = e.target.closest?.('td.cell');
  if (!td) return;
  if (e.key === 'Enter') {
    e.preventDefault();
    openEditor(td).catch((err) => status(err.message, 'bad'));
  } else if ((e.key === 'Delete' || e.key === 'Backspace') && td.dataset.col.startsWith('in:') && rowOf(td.dataset.node)?.cells[td.dataset.col]?.text !== undefined) {
    e.preventDefault();
    act({ action: 'clearCell', node: td.dataset.node, column: td.dataset.col }).catch(() => {});
  } else if (e.key.startsWith('Arrow')) {
    const tr = td.parentElement;
    const i = [...tr.children].indexOf(td);
    const next = e.key === 'ArrowLeft' ? td.previousElementSibling : e.key === 'ArrowRight' ? td.nextElementSibling
      : (e.key === 'ArrowUp' ? tr.previousElementSibling : tr.nextElementSibling)?.children[i];
    if (next?.classList.contains('cell')) {
      e.preventDefault();
      next.focus();
    }
  }
});

$('editor').addEventListener('submit', async (e) => {
  e.preventDefault();
  const ed = $('editor');
  if (e.target.id === 'ed-form') return submitValue();
  if (e.target.id === 'wire-form') {
    const end = splitEnd($('wire-end').value.trim());
    if (!end) return void ($('wire-error').textContent = 'Type the other end as node.port.');
    const here = { node: ed.dataset.node, port: ed.dataset.col.slice(ed.dataset.col.indexOf(':') + 1) };
    const [from, to] = ed.dataset.plug === 'input' ? [end, here] : [here, end];
    try {
      await act({ action: 'connect', from, to });
      const td = document.querySelector(`td[data-node="${CSS.escape(ed.dataset.node)}"][data-col="${CSS.escape(ed.dataset.col)}"]`);
      if (td) await openEditor(td);
    } catch (err) {
      $('wire-error').textContent = err.message;
    }
  }
});
$('editor').addEventListener('click', async (e) => {
  const ed = $('editor');
  if (e.target.closest('[data-close]')) return closeEditor();
  if (e.target.id === 'ed-clear') {
    try {
      await act({ action: 'clearCell', node: ed.dataset.node, column: ed.dataset.col });
      closeEditor();
    } catch (err) {
      $('ed-error').textContent = err.message;
    }
    return;
  }
  const un = e.target.closest('[data-unwire]');
  if (un) {
    const row = rowOf(ed.dataset.node);
    const w = row.cells[ed.dataset.col].wires[Number(un.dataset.unwire)];
    const here = { node: ed.dataset.node, port: ed.dataset.col.slice(ed.dataset.col.indexOf(':') + 1) };
    const other = { node: w.node, port: w.port };
    const [from, to] = ed.dataset.plug === 'input' ? [other, here] : [here, other];
    try {
      await act({ action: 'disconnect', from, to });
      const td = document.querySelector(`td[data-node="${CSS.escape(ed.dataset.node)}"][data-col="${CSS.escape(ed.dataset.col)}"]`);
      if (td) await openEditor(td);
      else closeEditor();
    } catch (err) {
      $('wire-error').textContent = err.message;
    }
  }
});
$('editor').addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return closeEditor();
  if (e.key === 'Enter' && !e.shiftKey && e.target.id === 'ed-text') {
    e.preventDefault();
    submitValue();
  }
});
document.addEventListener('mousedown', (e) => {
  const ed = $('editor');
  if (!ed.hidden && !ed.contains(e.target) && !e.target.closest('td.cell')) closeEditor();
});
window.addEventListener('beforeunload', (e) => {
  if (state.project?.components?.some((c) => c.dirty)) e.preventDefault();
});

loadProject().catch((err) => status(err.message, 'bad'));
