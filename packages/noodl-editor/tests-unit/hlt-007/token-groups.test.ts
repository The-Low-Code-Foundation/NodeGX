/**
 * P99 HLT-007 (b) — every design token category reaches a group in the Styles panel.
 *
 * The defect: `TokensSection.getGroupForToken` was a SECOND COPY of the
 * `TOKEN_CATEGORIES` mapping, and it failed closed. A category it had not heard of
 * returned `null`, the token was dropped from `grouped`, and the panel rendered as
 * though the token did not exist — while `get_style_vocabulary` reported it to the
 * authoring model perfectly happily. VIB-002 hit exactly that with `gradient`.
 *
 * 🔴 **This gate enumerates the CONTRACT, not the table.** That distinction is the
 * whole point. A spec written over `Object.keys(TOKEN_CATEGORIES)` is circular: it
 * asks the table whether the table is complete, and it stays green through precisely
 * the failure that has already happened once — a category added to
 * `@nodegx/project-contract` that nobody added to the editor's table.
 *
 * So the contract's `TokenCategory` union is read out of its source text. A TS union
 * has no runtime form, and reading the source is the only way to enumerate it from
 * outside ([[a-static-gate-cannot-see-reachability]] applies to the opposite case —
 * this gate is a static question and a static read is the right instrument).
 *
 * ⚠️ Measured at the time of writing: 14 categories, 14 table entries, 0 mismatches.
 * The defect was LATENT, not live — `gradient` had already been patched into the
 * copy by hand. This gate exists so the next one cannot be silent.
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  TOKEN_CATEGORIES,
  TOKEN_CATEGORY_GROUPS,
  groupForTokenCategory
} from '../../src/editor/src/models/StyleTokensModel/TokenCategories';

const CONTRACT = path.join(__dirname, '../../../nodegx-project-contract/tokens.ts');
const PANEL = path.join(
  __dirname,
  '../../src/editor/src/views/panels/StylesPanel/components/TokensSection/TokensSection.tsx'
);

/** The `TokenCategory` union, read out of the contract's source. */
function contractCategories(): string[] {
  const src = fs.readFileSync(CONTRACT, 'utf8');
  const m = src.match(/export type TokenCategory =([\s\S]*?);/);
  if (!m) throw new Error(`TokenCategory union not found in ${CONTRACT}`);
  return Array.from(m[1].matchAll(/'([^']+)'/g)).map((x) => x[1]);
}

describe('HLT-007 — token categories reach a panel group', () => {
  const categories = contractCategories();

  it('the contract was actually read — the control for every assertion below', () => {
    // An empty or tiny list would make every `for` loop below vacuously green:
    // the classic absence with no known-firing signal beside it.
    expect(categories.length).toBeGreaterThanOrEqual(10);
    expect(categories).toContain('color-semantic');
  });

  it('EVERY category the contract defines has a table entry with a real group', () => {
    const missing = categories.filter((c) => !TOKEN_CATEGORIES[c as never]);
    expect(missing).toEqual([]);

    for (const category of categories) {
      const entry = TOKEN_CATEGORIES[category as never] as { group: string } | undefined;
      expect(entry).toBeDefined();
      // A group the panel does not draw is as invisible as no group at all.
      expect(TOKEN_CATEGORY_GROUPS).toContain(entry!.group);
    }
  });

  it('gradient → Effects, by name — the one category this has already happened to', () => {
    // VIB-002. Asserted by name because a general rule that happens to cover it is
    // not a regression test for it.
    expect(categories).toContain('gradient');
    expect((TOKEN_CATEGORIES['gradient' as never] as { group: string }).group).toBe('Effects');
  });

  it('🔴 THE MUTANT — a contract category with no table entry is caught here', () => {
    // The failure mode, simulated: the contract gains a category and the editor's
    // table does not. The real mutant is editing the contract; this asserts the
    // CHECK itself fires, so the arm above cannot pass by being vacuous.
    // ⚠️ `toContain`, not `toEqual`: this arm grades the CHECK, not the tree's current
    // state. Written as an equality it also fails whenever the contract legitimately
    // gains a category — reporting the mechanism as broken when the real arm above is
    // the one with something to say. Verified red-on-a-real-mutant on 2026-09-21 by
    // adding `shimmer-intensity` to the contract: the arm above failed and
    // `typecheck:editor` failed with TS2741 on TokenCategories.ts.
    const invented = [...categories, 'shimmer-intensity'];
    const missing = invented.filter((c) => !TOKEN_CATEGORIES[c as never]);
    expect(missing).toContain('shimmer-intensity');
  });

  // ── The panel's own lookup (s15) ─────────────────────────────────────────────
  // Every arm above grades the TABLE. None of them graded the panel: restore the
  // hand-written copy in `TokensSection.tsx`, drop a category from it, and all of
  // them stay green. These do.

  it('the function the panel calls files EVERY contract category under its table group', () => {
    for (const category of categories) {
      expect([category, groupForTokenCategory(category)]).toEqual([
        category,
        (TOKEN_CATEGORIES[category as never] as { group: string }).group
      ]);
    }
  });

  it('an unknown category from disk is null — and so is an inherited name', () => {
    expect(groupForTokenCategory('shimmer-intensity')).toBeNull();
    // A bare `TOKEN_CATEGORIES[c]` answers `Object.prototype.toString` here.
    expect(groupForTokenCategory('toString')).toBeNull();
    expect(groupForTokenCategory('constructor')).toBeNull();
  });

  it('the panel routes through it and keeps no mapping of its own', () => {
    const src = fs.readFileSync(PANEL, 'utf8');
    const body = /function getGroupForToken\([^)]*\)[^{]*\{([\s\S]*?)\n\}/.exec(src);
    expect(body).not.toBeNull();
    expect(body![1]).toContain('groupForTokenCategory(');
    // The old copy's shape: a group written as a string literal inside the function.
    for (const group of TOKEN_CATEGORY_GROUPS) {
      expect([group, body![1].includes(`'${group}'`)]).toEqual([group, false]);
    }
  });

  it('the table adds nothing the contract does not declare', () => {
    // Drift in the other direction: a table entry for a category no longer in the
    // contract is dead configuration that reads as support.
    const extra = Object.keys(TOKEN_CATEGORIES).filter((c) => !categories.includes(c));
    expect(extra).toEqual([]);
  });
});
