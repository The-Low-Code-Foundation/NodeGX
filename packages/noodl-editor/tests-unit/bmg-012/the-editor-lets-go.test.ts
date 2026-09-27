/**
 * BMG-012 — the editor lets go.
 *
 * Six (then eight) backend panels lived in the editor over the backend's admin
 * routes. They are gone; the backend manager in the browser is the one surface
 * for everything inside a backend. This spec pins the three things a later
 * change could quietly undo:
 *
 *   AC1  no editor source reaches for a backend surface any more;
 *   AC6  every `backend:*` IPC handler the main process registers has a caller
 *        in the renderer, and every renderer invoke has a handler — a proxy
 *        left behind by a deleted panel, or a panel reaching for a deleted
 *        proxy, is a red row here rather than a runtime `No handler registered`;
 *   §3.1 the two doors send the manager's own routes.
 *
 * Read from the source tree, not from a bundle: the bundle is a build product
 * this runner does not make.
 */
import * as fs from 'fs';
import * as path from 'path';
import React from 'react';

import { render, walk } from '../support/renderElements';

import { managerRoutes } from '../../src/editor/src/models/BackendServices/openBackendManager';
import { SchemaAddFieldButton } from '../../src/editor/src/views/panels/propertyeditor/components/SchemaAddFieldButton';

// The button's two runtime edges, mocked so the element tree can be walked here: the IPC bridge
// (there is no Electron in this runner) and the toast layer (react-hot-toast wants a DOM).
const invoked: unknown[][] = [];
jest.mock('@noodl-utils/ipc', () => ({
  ipcInvoke: jest.fn(async (...args: unknown[]) => {
    invoked.push(args);
    return undefined;
  })
}));
jest.mock('../../src/editor/src/views/ToastLayer/ToastLayer', () => ({ ToastLayer: { showError: jest.fn() } }));

const ROOT = path.join(__dirname, '../../src');
const RENDERER = path.join(ROOT, 'editor/src');
const MAIN = path.join(ROOT, 'main/src/local-backend/BackendManager.js');

function walkFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(p, out);
    else if (/\.(ts|tsx|js)$/.test(entry.name) && !/\.bundle\.js$/.test(entry.name)) out.push(p);
  }
  return out;
}

const rendererFiles = walkFiles(RENDERER);
const rendererSource = new Map(rendererFiles.map((f) => [f, fs.readFileSync(f, 'utf8')]));

describe('BMG-012 AC1 — no backend surface is reachable from the editor', () => {
  it('no renderer source names the surface registry or opens a surface', () => {
    const offenders = rendererFiles.filter((f) => /openSurface\(|openBackendSurface|backendSurfaces|installBackendSurfacePanels/.test(rendererSource.get(f)!));
    expect(offenders.map((f) => path.relative(RENDERER, f))).toEqual([]);
  });

  it('the eight panel directories are gone', () => {
    const panels = path.join(RENDERER, 'views/panels');
    for (const dir of ['databrowser', 'schemamanager', 'permissions', 'triggers', 'email', 'auth', 'search', 'secrets']) {
      expect({ dir, exists: fs.existsSync(path.join(panels, dir)) }).toEqual({ dir, exists: false });
    }
  });
});

describe('BMG-012 AC6 — every IPC handler has a caller, every caller a handler', () => {
  const main = fs.readFileSync(MAIN, 'utf8');
  const handlers = new Set<string>();
  for (const m of main.matchAll(/ipcMain\.(?:handle|on)\(\s*'(backend:[A-Za-z-]+)'/g)) handlers.add(m[1]);

  // What the renderer INVOKES (or sends): `ipcInvoke('backend:x'`, `invokeIPC('backend:x'`, `invoke('backend:x'`,
  // `.send('backend:x'`. Event names the renderer only LISTENS for (`backend:statusChanged`,
  // `backend:collectionChanged`, `backend:triggersChanged`) are not calls and are not counted.
  const invoked = new Map<string, string[]>();
  for (const [f, src] of rendererSource) {
    for (const m of src.matchAll(/(?:ipcInvoke|invokeIPC|invoke|send)(?:<[^>]*>)?\(\s*'(backend:[A-Za-z-]+)'/g)) {
      const list = invoked.get(m[1]) || [];
      list.push(path.relative(RENDERER, f));
      invoked.set(m[1], list);
    }
  }

  it('registers the handlers the editor still needs, and no more', () => {
    expect([...handlers].sort()).toEqual(
      [
        'backend:list', 'backend:create', 'backend:rename', 'backend:delete', 'backend:start', 'backend:stop', 'backend:status',
        'backend:open-dashboard', 'backend:export-schema',
        'backend:getSchema', 'backend:getTableSchema', 'backend:createTable', 'backend:addColumn', 'backend:changeColumnType',
        'backend:queryRecords',
        'backend:update-workflow', 'backend:workflow-status', 'backend:list-workflow-defs', 'backend:run-workflow-def',
        'backend:cancel-workflow-run', 'backend:workflow-step-kinds', 'backend:get-workflow-def', 'backend:save-workflow-def',
        'backend:delete-workflow-def', 'backend:list-workflow-proposals', 'backend:get-workflow-proposal',
        'backend:discard-workflow-proposal', 'backend:validate-workflow-def',
        'backend:listTriggers', 'backend:setTriggerEnabled', 'backend:deleteTrigger'
      ].sort()
    );
  });

  it('🔴 no handler is unreachable — each is invoked from at least one renderer file', () => {
    const unreachable = [...handlers].filter((h) => !invoked.has(h)).sort();
    expect(unreachable).toEqual([]);
  });

  it('🔴 no renderer invoke names a channel the main process no longer handles', () => {
    const orphans = [...invoked.entries()].filter(([ch]) => !handlers.has(ch)).map(([ch, files]) => `${ch} ← ${files.join(', ')}`);
    expect(orphans).toEqual([]);
  });
});

describe('BMG-012 §3.1 — the two doors send the manager\'s own routes', () => {
  it('Add a field lands on that collection with the picker open (DEF-036, kept as a deep link)', () => {
    expect(managerRoutes.newField('Pet')).toBe('/schema/Pet/new-field');
    expect(managerRoutes.newField('Log Entries')).toBe('/schema/Log%20Entries/new-field');
  });

  it('the canvas lands on the new-trigger drawer, or on one trigger', () => {
    expect(managerRoutes.newTrigger()).toBe('/triggers/new');
    expect(managerRoutes.trigger('trg_1')).toBe('/triggers/trg_1');
  });

  it('AC2 (the editor half): pressing Add a field invokes open-dashboard with that table\'s new-field route', () => {
    invoked.length = 0;
    const tree = render(React.createElement(SchemaAddFieldButton, { backendId: 'backend_abc', backendName: 'App backend', table: 'Pet' }));
    const button = walk(tree).find((n) => n.type === 'button');
    expect(button).toBeDefined();
    expect(button!.props['data-test']).toBe('schema-add-field-Pet');
    (button!.props.onClick as () => void)();
    expect(invoked).toEqual([['backend:open-dashboard', 'backend_abc', '/schema/Pet/new-field']]);
  });

  it('the property panel button and the canvas call the door, not a panel', () => {
    const button = fs.readFileSync(path.join(RENDERER, 'views/panels/propertyeditor/components/SchemaAddFieldButton.tsx'), 'utf8');
    expect(button).toContain('managerRoutes.newField(table)');
    expect(button).toContain('openBackendManager(');
    const doc = fs.readFileSync(path.join(RENDERER, 'models/workflow/WorkflowDocument.ts'), 'utf8');
    expect(doc).toContain('openTriggerInManager()');
    expect(doc).toContain('openTriggerInManager(triggerId)');
    expect(doc).not.toContain('OPEN_TRIGGERS_SURFACE');
  });
});
