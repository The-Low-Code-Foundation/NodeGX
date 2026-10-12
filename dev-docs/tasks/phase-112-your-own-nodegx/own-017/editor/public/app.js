'use strict';

/* ---------- tiny helpers ---------- */

function $(sel, root = document) {
  return root.querySelector(sel);
}

function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key.startsWith('on') && typeof value === 'function') node.addEventListener(key.slice(2), value);
    else if (value !== null && value !== undefined) node.setAttribute(key, value);
  }
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child === null || child === undefined) continue;
    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return node;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request to ${path} failed (${res.status})`);
  }
  return data;
}

function showBanner(message, isError) {
  const banner = $('#banner');
  banner.textContent = message;
  banner.className = 'banner ' + (isError ? 'err' : 'ok');
  banner.hidden = false;
  if (!isError) {
    setTimeout(() => {
      if (banner.textContent === message) banner.hidden = true;
    }, 3500);
  }
}

/* ---------- state ---------- */

const state = {
  lessons: null,
  voice: null,
  registry: null,
  selectedComponentKey: null,
  componentView: null,
  colorTokens: [],
  loadedTabs: new Set()
};

/* ---------- tabs ---------- */

function initTabs() {
  $('#tabs').addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    activateTab(btn.dataset.tab);
  });
}

function activateTab(tab) {
  document.querySelectorAll('.tab-btn').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === `tab-${tab}`));
  if (!state.loadedTabs.has(tab)) {
    state.loadedTabs.add(tab);
    if (tab === 'voice') loadVoice();
    if (tab === 'browse') loadRegistry();
  }
}

/* ================= Lessons & Phrases ================= */

async function loadLessons() {
  try {
    const data = await api('/api/lessons');
    state.lessons = data.lessons;
    renderLessons();
  } catch (err) {
    $('#lessons-root').innerHTML = '';
    showBanner(err.message, true);
  }
}

function renderLessons() {
  const root = $('#lessons-root');
  root.innerHTML = '';
  state.lessons.forEach((lesson, lessonIndex) => {
    root.appendChild(renderLessonCard(lesson, lessonIndex));
  });
}

function renderLessonCard(lesson, lessonIndex) {
  const titleInput = el('input', {
    type: 'text',
    value: lesson.title,
    oninput: (e) => {
      state.lessons[lessonIndex].title = e.target.value;
    }
  });

  const removeLessonBtn = el('button', {
    class: 'danger',
    text: 'Remove lesson',
    onclick: () => {
      state.lessons.splice(lessonIndex, 1);
      renderLessons();
    }
  });

  const head = el('div', { class: 'lesson-card-head' }, [
    el('label', {}, ['Lesson title', titleInput]),
    removeLessonBtn
  ]);

  const table = el('table', {}, [
    el('thead', {}, el('tr', {}, [el('th', { text: 'French' }), el('th', { text: 'English' }), el('th')])),
    el(
      'tbody',
      {},
      lesson.phrases.map((phrase, phraseIndex) => renderPhraseRow(lesson, lessonIndex, phrase, phraseIndex))
    )
  ]);

  const addPhraseBtn = el('button', {
    class: 'secondary',
    text: '+ Add phrase',
    onclick: () => {
      lesson.phrases.push({ french: '', english: '' });
      renderLessons();
    }
  });

  return el('div', { class: 'lesson-card' }, [head, table, el('div', { class: 'actions-row' }, [addPhraseBtn])]);
}

function renderPhraseRow(lesson, lessonIndex, phrase, phraseIndex) {
  const frenchInput = el('input', {
    type: 'text',
    value: phrase.french,
    oninput: (e) => {
      state.lessons[lessonIndex].phrases[phraseIndex].french = e.target.value;
    }
  });
  const englishInput = el('input', {
    type: 'text',
    value: phrase.english,
    oninput: (e) => {
      state.lessons[lessonIndex].phrases[phraseIndex].english = e.target.value;
    }
  });
  const removeBtn = el('button', {
    class: 'danger',
    text: '✕',
    onclick: () => {
      lesson.phrases.splice(phraseIndex, 1);
      renderLessons();
    }
  });
  return el('tr', {}, [
    el('td', {}, frenchInput),
    el('td', {}, englishInput),
    el('td', { class: 'phrase-row-actions' }, removeBtn)
  ]);
}

function initLessonsTab() {
  $('#add-lesson-btn').addEventListener('click', () => {
    state.lessons.push({ title: 'New lesson', phrases: [{ french: '', english: '' }] });
    renderLessons();
  });
  $('#save-lessons-btn').addEventListener('click', async () => {
    try {
      const data = await api('/api/lessons/save', { method: 'POST', body: { lessons: state.lessons } });
      state.lessons = data.lessons;
      renderLessons();
      showBanner('Lessons saved.', false);
    } catch (err) {
      showBanner(err.message, true);
    }
  });
}

/* ================= Cloud Voice ================= */

async function loadVoice() {
  try {
    const data = await api('/api/voice');
    state.voice = data;
    $('#voice-model').value = data.model;
    $('#voice-name').value = data.voiceName;
    const list = $('#voice-suggestions');
    list.innerHTML = '';
    data.suggestedVoices.forEach((name) => list.appendChild(el('option', { value: name })));
  } catch (err) {
    showBanner(err.message, true);
  }
}

function initVoiceTab() {
  $('#voice-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const model = $('#voice-model').value.trim();
      const voiceName = $('#voice-name').value.trim();
      const data = await api('/api/voice/save', { method: 'POST', body: { model, voiceName } });
      state.voice = data;
      showBanner('Voice settings saved.', false);
    } catch (err) {
      showBanner(err.message, true);
    }
  });
}

/* ================= Browse Components ================= */

async function loadRegistry() {
  try {
    state.registry = await api('/api/registry');
    renderComponentList();
  } catch (err) {
    showBanner(err.message, true);
  }
}

function renderComponentList() {
  const list = $('#component-list');
  list.innerHTML = '';
  state.registry.forEach((comp) => {
    const btn = el('button', {
      class: comp.key === state.selectedComponentKey ? 'active' : '',
      onclick: () => selectComponent(comp.key)
    }, [comp.key, el('span', { class: 'comp-type', text: `${comp.type} · ${comp.nodeCount} nodes` })]);
    list.appendChild(el('li', {}, btn));
  });
}

async function selectComponent(key) {
  state.selectedComponentKey = key;
  renderComponentList();
  const detail = $('#component-detail');
  detail.innerHTML = '';
  detail.appendChild(el('p', { class: 'hint', text: 'Loading…' }));
  try {
    const view = await api(`/api/component?key=${encodeURIComponent(key)}`);
    state.componentView = view;
    renderComponentDetail();
  } catch (err) {
    detail.innerHTML = '';
    showBanner(err.message, true);
  }
}

function renderComponentDetail() {
  const view = state.componentView;
  const detail = $('#component-detail');
  detail.innerHTML = '';

  const table = el('table', {}, [
    el('thead', {}, el('tr', {}, [el('th', { text: 'Node' }), el('th', { text: 'Type' }), el('th', { text: 'Label' })])),
    el('tbody', { id: 'node-tbody' })
  ]);
  detail.appendChild(el('h3', { text: view.key }));
  detail.appendChild(table);

  const tbody = $('#node-tbody', table);
  view.nodes.forEach((node) => {
    const row = el('tr', {
      class: 'node-row',
      onclick: () => toggleNodePanel(node.id)
    }, [
      el('td', { text: node.id }),
      el('td', { text: node.type }),
      el('td', { text: node.label || '—' })
    ]);
    tbody.appendChild(row);

    const panelRow = el('tr', { class: 'node-panel-row', id: `panel-row-${cssId(node.id)}` });
    const panelCell = el('td', { colspan: '3' });
    panelRow.appendChild(panelCell);
    panelRow.hidden = true;
    tbody.appendChild(panelRow);
  });
}

function cssId(id) {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function toggleNodePanel(nodeId) {
  const panelRow = document.getElementById(`panel-row-${cssId(nodeId)}`);
  const alreadyOpen = !panelRow.hidden;
  // Close every panel first (one at a time keeps this simple and avoids stale cross-row state).
  document.querySelectorAll('.node-panel-row').forEach((r) => {
    r.hidden = true;
    r.firstElementChild.innerHTML = '';
  });
  document.querySelectorAll('.node-row').forEach((r) => r.classList.remove('expanded'));
  if (alreadyOpen) return;

  const node = state.componentView.nodes.find((n) => n.id === nodeId);
  panelRow.hidden = false;
  panelRow.firstElementChild.appendChild(buildNodePanel(node));
  panelRow.previousElementSibling.classList.add('expanded');
}

/** Per-field editable control, keyed on a shared panel-state object the Save button reads from. */
function buildField(field, panel) {
  if (field.wired) {
    return el('div', { class: 'field-wired', text: `← wired from ${field.wired}` });
  }

  let input;
  const current = field.value;

  if (field.kind === 'boolean') {
    input = el('input', { type: 'checkbox' });
    input.checked = Boolean(current);
    input.addEventListener('change', () => (panel.values[field.name] = input.checked));
  } else if (field.kind === 'number') {
    input = el('input', { type: 'number', value: current ?? '' });
    input.addEventListener('input', () => (panel.values[field.name] = input.value === '' ? null : Number(input.value)));
  } else if (field.kind === 'enum' && field.enumValues) {
    input = el(
      'select',
      {},
      field.enumValues.map((opt) => el('option', { value: opt, selected: opt === current ? 'selected' : null }, opt))
    );
    input.addEventListener('change', () => (panel.values[field.name] = input.value));
  } else if (field.kind === 'text') {
    input = el('textarea', { rows: '10' });
    input.value = current ?? '';
    input.addEventListener('input', () => (panel.values[field.name] = input.value));
  } else if (field.kind === 'color') {
    return buildColorField(field, panel);
  } else {
    input = el('input', { type: 'text', value: current ?? '' });
    input.addEventListener('input', () => (panel.values[field.name] = input.value));
  }

  panel.values[field.name] = current;
  return input;
}

function buildColorField(field, panel) {
  const text = el('input', { type: 'text', value: field.value ?? '', list: 'color-token-options' });
  const swatch = el('input', { type: 'color' });
  const hexMatch = /^#([0-9a-f]{6})$/i;
  if (hexMatch.test(field.value || '')) swatch.value = field.value;

  text.addEventListener('input', () => {
    panel.values[field.name] = text.value;
    if (hexMatch.test(text.value)) swatch.value = text.value;
  });
  swatch.addEventListener('input', () => {
    text.value = swatch.value;
    panel.values[field.name] = swatch.value;
  });

  panel.values[field.name] = field.value;
  return el('div', { class: 'color-field' }, [swatch, text]);
}

function inputOptionsFor(nodeId) {
  const node = state.componentView.nodes.find((n) => n.id === nodeId);
  return node ? node.inputOptions : [];
}

function nodeOptionSelect(selectedId, onChange) {
  const select = el(
    'select',
    {},
    state.componentView.nodeOptions.map((opt) =>
      el('option', { value: opt.id, selected: opt.id === selectedId ? 'selected' : null }, `${opt.label} (${opt.id})`)
    )
  );
  select.addEventListener('change', () => onChange(select.value));
  return select;
}

function propertyInput(datalistId, value, onChange) {
  const input = el('input', { type: 'text', value: value || '', list: datalistId });
  input.addEventListener('input', () => onChange(input.value));
  return input;
}

function ensureDatalist(id, options) {
  let dl = document.getElementById(id);
  if (!dl) {
    dl = el('datalist', { id });
    document.body.appendChild(dl);
  }
  dl.innerHTML = '';
  options.forEach((o) => dl.appendChild(el('option', { value: o })));
  return dl;
}

function buildWiringSection(node, panel) {
  const container = el('div');
  container.appendChild(el('h4', { text: 'Incoming connections' }));
  if (node.incoming.length === 0) {
    container.appendChild(el('p', { class: 'hint', text: 'Nothing is wired into this node.' }));
  } else {
    const t = el('table', { class: 'wire-table' }, [
      el('thead', {}, el('tr', {}, [el('th', { text: 'From' }), el('th', { text: 'Into' })])),
      el(
        'tbody',
        {},
        node.incoming.map((c) => el('tr', {}, [el('td', { text: `${c.fromLabel}.${c.fromProperty}` }), el('td', { text: c.toProperty })]))
      )
    ]);
    container.appendChild(t);
  }

  container.appendChild(el('h4', { text: 'Outgoing connections — what this triggers' }));
  const outTbody = el('tbody');
  node.outgoing.forEach((c, idx) => {
    const row = { fromProperty: c.fromProperty, originalToId: c.toId, originalToProperty: c.toProperty, toId: c.toId, toProperty: c.toProperty, removed: false };
    panel.outgoingRows.push(row);
    outTbody.appendChild(buildOutgoingRow(row, panel, `existing-${idx}`));
  });
  container.appendChild(
    el('table', { class: 'wire-table' }, [
      el('thead', {}, el('tr', {}, [el('th', { text: 'From port' }), el('th', { text: 'Target node' }), el('th', { text: 'Target port' }), el('th')])),
      outTbody
    ])
  );

  // Add-wire form
  let newFromPort = node.outputOptions[0] || '';
  let newToId = state.componentView.nodeOptions[0]?.id || '';
  let newToProperty = '';
  const datalistId = `dl-${cssId(node.id)}-newtarget`;
  ensureDatalist(datalistId, inputOptionsFor(newToId));

  const fromSelect = el(
    'select',
    {},
    node.outputOptions.map((o) => el('option', { value: o }, o))
  );
  fromSelect.addEventListener('change', () => (newFromPort = fromSelect.value));

  const toSelect = nodeOptionSelect(newToId, (val) => {
    newToId = val;
    ensureDatalist(datalistId, inputOptionsFor(newToId));
  });
  const toPropInput = propertyInput(datalistId, '', (val) => (newToProperty = val));

  const addBtn = el('button', {
    class: 'secondary',
    text: 'Add',
    onclick: () => {
      if (!newFromPort || !newToId || !newToProperty) {
        showBanner('Pick a from-port, target node and target port before adding a connection.', true);
        return;
      }
      panel.newWires.push({ fromProperty: newFromPort, toId: newToId, toProperty: newToProperty });
      rerenderNodePanel(node.id);
    }
  });

  container.appendChild(
    el('div', { class: 'add-wire-row' }, [
      el('label', {}, ['From port', fromSelect]),
      el('label', {}, ['Target node', toSelect]),
      el('label', {}, ['Target port', toPropInput]),
      addBtn
    ])
  );

  if (panel.newWires.length > 0) {
    const pendingList = el(
      'ul',
      {},
      panel.newWires.map((w, i) =>
        el('li', {}, [
          `${w.fromProperty} → ${w.toId}.${w.toProperty} `,
          el('span', { class: 'pending-badge', text: 'pending' }),
          ' ',
          el('button', {
            class: 'wire-remove-btn',
            text: 'remove',
            onclick: () => {
              panel.newWires.splice(i, 1);
              rerenderNodePanel(node.id);
            }
          })
        ])
      )
    );
    container.appendChild(pendingList);
  }

  return container;
}

function buildOutgoingRow(row, panel, rowKey) {
  const datalistId = `dl-${rowKey.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
  ensureDatalist(datalistId, inputOptionsFor(row.toId));

  const toSelect = nodeOptionSelect(row.toId, (val) => {
    row.toId = val;
    ensureDatalist(datalistId, inputOptionsFor(val));
  });
  const toPropInput = propertyInput(datalistId, row.toProperty, (val) => (row.toProperty = val));

  const removeBtn = el('button', {
    class: 'wire-remove-btn',
    text: row.removed ? 'undo' : 'remove',
    onclick: () => {
      row.removed = !row.removed;
      rerenderNodePanel(state.openNodeId);
    }
  });

  const tr = el('tr', { class: row.removed ? 'removed-row' : '' }, [
    el('td', { text: row.fromProperty }),
    el('td', {}, toSelect),
    el('td', {}, toPropInput),
    el('td', {}, removeBtn)
  ]);
  return tr;
}

function rerenderNodePanel(nodeId) {
  const panelRow = document.getElementById(`panel-row-${cssId(nodeId)}`);
  if (!panelRow) return;
  const node = state.componentView.nodes.find((n) => n.id === nodeId);
  const preserved = state.nodePanels.get(nodeId);
  panelRow.firstElementChild.innerHTML = '';
  panelRow.firstElementChild.appendChild(buildNodePanel(node, preserved));
}

function buildNodePanel(node, reuse) {
  state.openNodeId = node.id;
  state.nodePanels = state.nodePanels || new Map();
  const panel = reuse || { values: {}, labelValue: node.label || '', outgoingRows: [], newWires: [] };
  if (!reuse) {
    panel.values = {};
    panel.outgoingRows = [];
  }
  state.nodePanels.set(node.id, panel);

  const root = el('div', { class: 'node-panel' });

  root.appendChild(el('h4', { text: 'Label' }));
  const labelInput = el('input', { type: 'text', value: panel.labelValue });
  labelInput.addEventListener('input', () => (panel.labelValue = labelInput.value));
  root.appendChild(labelInput);

  root.appendChild(el('h4', { text: 'Parameters' }));
  if (node.fields.length === 0) {
    root.appendChild(el('p', { class: 'hint', text: 'This node has no editable parameters.' }));
  } else {
    let lastGroup = null;
    node.fields.forEach((field) => {
      if (field.group !== lastGroup) {
        lastGroup = field.group;
      }
      const control = buildField(field, panel);
      root.appendChild(
        el('div', { class: 'field-row' }, [
          el('div', { class: 'field-label' }, [field.displayName, field.description ? el('small', { text: field.description }) : null]),
          control
        ])
      );
    });
  }

  root.appendChild(buildWiringSection(node, panel));

  const saveBtn = el('button', {
    class: 'primary',
    text: 'Save node',
    onclick: () => saveNodePanel(node, panel)
  });
  const closeBtn = el('button', { class: 'secondary', text: 'Close', onclick: () => toggleNodePanel(node.id) });
  root.appendChild(el('div', { class: 'node-panel-footer' }, [closeBtn, saveBtn]));

  return root;
}

async function saveNodePanel(node, panel) {
  const nodeEdit = { id: node.id };
  if (panel.labelValue !== (node.label || '')) nodeEdit.label = panel.labelValue;

  const setFields = {};
  node.fields.forEach((field) => {
    if (field.wired) return;
    const newValue = panel.values[field.name];
    if (!valuesEqual(newValue, field.value)) setFields[field.name] = newValue;
  });
  if (Object.keys(setFields).length > 0) nodeEdit.setFields = setFields;

  const wireEdits = [];
  panel.outgoingRows.forEach((row) => {
    const changed = row.toId !== row.originalToId || row.toProperty !== row.originalToProperty;
    if (row.removed || changed) {
      wireEdits.push({ action: 'remove', from: { node: node.id, port: row.fromProperty }, to: { node: row.originalToId, port: row.originalToProperty } });
    }
    if (!row.removed && changed) {
      wireEdits.push({ action: 'add', from: { node: node.id, port: row.fromProperty }, to: { node: row.toId, port: row.toProperty } });
    }
  });
  panel.newWires.forEach((w) => {
    wireEdits.push({ action: 'add', from: { node: node.id, port: w.fromProperty }, to: { node: w.toId, port: w.toProperty } });
  });

  const nodeEdits = nodeEdit.label !== undefined || nodeEdit.setFields ? [nodeEdit] : [];

  if (nodeEdits.length === 0 && wireEdits.length === 0) {
    showBanner('Nothing changed on this node.', false);
    return;
  }

  try {
    const view = await api('/api/component/save', {
      method: 'POST',
      body: { key: state.selectedComponentKey, nodeEdits, wireEdits }
    });
    state.componentView = view;
    state.nodePanels.delete(node.id);
    renderComponentDetail();
    toggleNodePanel(node.id);
    showBanner('Node saved.', false);
  } catch (err) {
    showBanner(err.message, true);
  }
}

function valuesEqual(a, b) {
  const an = a === undefined ? null : a;
  const bn = b === undefined ? null : b;
  return JSON.stringify(an) === JSON.stringify(bn);
}

/* ================= boot ================= */

async function loadColorTokens() {
  try {
    state.colorTokens = await api('/api/color-tokens');
    ensureDatalist('color-token-options', state.colorTokens.map((t) => t.name));
  } catch {
    // Colour suggestions are a nicety; a blank list still leaves the field a plain text box.
  }
}

async function loadProjectInfo() {
  try {
    const info = await api('/api/project');
    $('#project-path').textContent = `${info.name || 'NodeGX project'} — ${info.projectDir}`;
  } catch (err) {
    $('#project-path').textContent = 'Could not open the project: ' + err.message;
  }
}

initTabs();
initLessonsTab();
initVoiceTab();
loadProjectInfo();
loadColorTokens();
loadLessons();
