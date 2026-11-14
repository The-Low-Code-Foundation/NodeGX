/**
 * P103-CMG002-COLOURDELETE — a colour token somebody added can be deleted, like every other one.
 *
 * CMG-002 §3.2 gave the Type / Spacing / Borders / Effects / Motion rows a delete for a token you
 * added; the colour tokens under *Colours › Design tokens* never got it. Both lists now call one
 * handler, `StylesPanel/deleteToken.ts`, graded here:
 *  - the rule: only a token somebody ADDED is deletable, never a shipped default (that is a reset);
 *  - nothing wears it → deleted at once, as one undo step, with the toast;
 *  - something wears it → asked first, the sentence names what, and nothing is deleted until yes;
 *  - both sections are wired to it, and the colour menu offers Delete only behind `isAddedToken`.
 *
 * That the item appears in the real menu and removes the row is the drive (see the bug file).
 */
import * as fs from 'fs';
import * as path from 'path';

import { buildDefaultTokenMap } from '../../src/editor/src/models/StyleTokensModel/DefaultTokens';
import { deleteTokenAsking, isAddedToken } from '../../src/editor/src/views/panels/StylesPanel/deleteToken';

/** A project of named components whose `forEachNode` stops on a truthy return, like the real one. */
function project(nodes: unknown[]) {
  return {
    getComponents: () => [
      {
        name: '/Pages/Home',
        graph: {
          forEachNode: (cb: (n: unknown) => unknown) => {
            for (const n of nodes) if (cb(n)) return;
          }
        }
      }
    ],
    getAllVariants: () => []
  } as never;
}

function harness(nodes: unknown[] = [], tokens = [{ name: '--brand-orange', value: '#c2410c' }]) {
  const deleted: Array<{ name: string; args?: { undo?: boolean; label?: string } }> = [];
  const confirms: Array<{ title: string; message: string; confirmLabel: string; onConfirm: () => void }> = [];
  const toasts: string[] = [];
  const deps = {
    project: project(nodes),
    tokens,
    model: { deleteCustomToken: (name: string, args?: { undo?: boolean; label?: string }) => deleted.push({ name, args }) },
    confirm: (a: (typeof confirms)[number]) => confirms.push(a),
    toast: (m: string) => toasts.push(m)
  };
  return { deps, deleted, confirms, toasts };
}

const ADDED = { name: '--brand-orange', value: '#c2410c', isCustom: true };

describe('P103-CMG002-COLOURDELETE — which tokens are deletable', () => {
  const aDefault = [...buildDefaultTokenMap().keys()].find((n) => n === '--primary') as string;

  it('a token somebody added is', () => {
    expect(isAddedToken(ADDED)).toBe(true);
  });

  it('🔴 a shipped default is not — even when it is stored (changed) — it is reset, never deleted', () => {
    expect(aDefault).toBe('--primary');
    expect(isAddedToken({ name: aDefault, isCustom: true })).toBe(false);
    expect(isAddedToken({ name: aDefault, isCustom: false })).toBe(false);
  });

  it('and the handler refuses one, writing nothing', () => {
    const h = harness();
    expect(deleteTokenAsking({ name: aDefault, isCustom: true }, h.deps)).toBe(false);
    expect(h.deleted).toEqual([]);
    expect(h.confirms).toEqual([]);
  });
});

describe('P103-CMG002-COLOURDELETE — deleting', () => {
  it('nothing wears it: deleted at once, one undo step, and the toast says ⌘Z brings it back', () => {
    const h = harness([{ id: 'plain', typename: 'Group', parameters: { backgroundColor: '#fff' } }]);
    expect(deleteTokenAsking(ADDED, h.deps)).toBe(true);
    expect(h.confirms).toEqual([]);
    expect(h.deleted).toEqual([{ name: '--brand-orange', args: { undo: true, label: 'Delete --brand-orange' } }]);
    expect(h.toasts).toEqual(['Deleted --brand-orange — ⌘Z brings it back']);
  });

  it('🔴 a node wears it: asked first, the sentence says what, and nothing goes until yes', () => {
    const h = harness([{ id: 'hero', label: 'Hero', typename: 'Group', parameters: { backgroundColor: 'var(--brand-orange)' } }]);
    deleteTokenAsking(ADDED, h.deps);
    expect(h.deleted).toEqual([]);
    expect(h.confirms).toHaveLength(1);
    expect(h.confirms[0].message).toContain('Delete <strong>--brand-orange</strong>?');
    expect(h.confirms[0].message).toContain('Used by 1 node');
    h.confirms[0].onConfirm();
    expect(h.deleted.map((d) => d.name)).toEqual(['--brand-orange']);
  });

  it('another token built from it counts as a wearer too', () => {
    const h = harness([], [
      { name: '--brand-orange', value: '#c2410c' },
      { name: '--ring', value: 'var(--brand-orange)' }
    ]);
    deleteTokenAsking(ADDED, h.deps);
    expect(h.deleted).toEqual([]);
    expect(h.confirms[0].message).toContain('1 other token');
  });
});

describe('P103-CMG002-COLOURDELETE — both lists use it', () => {
  const dir = path.join(__dirname, '../../src/editor/src/views/panels/StylesPanel/components');
  const read = (rel: string) => fs.readFileSync(path.join(dir, rel), 'utf8');

  it('the colour token menu offers Delete behind isAddedToken and calls the shared handler', () => {
    const src = read('ColoursSection/ColoursSection.tsx');
    expect(src).toMatch(/import \{ deleteTokenAsking, isAddedToken \} from '\.\.\/\.\.\/deleteToken'/);
    expect(src).toMatch(/\.\.\.\(isAddedToken\(token\)\s*\?\s*\[\s*\{\s*label: 'Delete'[\s\S]*?onClick: \(\) => onDeleteToken\(token\)/);
    expect(src).toMatch(/function onDeleteToken[\s\S]*?deleteTokenAsking\(token,/);
  });

  it('the other token sections call the same handler, not a copy of it', () => {
    const src = read('TokensSection/TokensSection.tsx');
    expect(src).toContain("from '../../deleteToken'");
    expect(src).toMatch(/deleteTokenAsking\(token, \{/);
    expect(src).not.toContain('showConfirmModal({');
  });
});
