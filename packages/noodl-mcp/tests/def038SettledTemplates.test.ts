/**
 * DEF-038 — **every shipped template artefact means the same thing on disk as it
 * does once the editor has loaded it**, and the population is DERIVED.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * ## Why this file exists rather than another `it` beside one generator
 *
 * DEF-007 §3.2 settled the site builder and gated it in `sb007Template.test.ts`
 * — a gate that regenerates *that* generator and compares bytes. TPL-001 is a
 * second artefact that gate never looks at, and it disagreed in **57 stored
 * parameters** for the whole time the row read green (measured 2026-09-03 at
 * HEAD, before the fix; the control read 0 with 97 family nodes beside it).
 *
 * 🔴 **That is the decaying-hand-list shape DEF-007 AC4 exists to prevent** — a
 * fix applied to the generator somebody was looking at, and a gate scoped to it.
 * So this gate does not name its artefacts. It **finds** them, and refuses to
 * pass on an empty population: a sweep that reached nothing reports the answer
 * you wanted.
 *
 * ## What "settled" means here
 *
 * `applyPatches` runs NDA-017's migration on every editor open. On a graph
 * authored *after* NDA-017 §2 — which every generated template is — an absent
 * `runOnChange-*` key already means *ticked*, and the migration reads that same
 * absence as evidence of a pre-§2 author and writes `false`. Loading such an
 * artefact therefore rewrites parameters nobody wrote and silences deliberate
 * load-time fetches. The argument, and why the pin writes `true` rather than the
 * migration's `false`, is in `pinRunOnValueChangeDefaults` and is not restated.
 *
 * A settled artefact makes that load-time pass a **no-op**, which is what these
 * assertions read: *the migration would write nothing*.
 *
 * ## Bounds, stated so this is not over-read
 *
 * ⚠️ **`hello-world.template.ts` is out of the population by construction** — it
 * is a `.ts` module, not a discoverable artefact, and it contains none of the
 * fifteen families (measured: zero occurrences of any family type). A third
 * template written as a `.ts` module would escape this sweep the same way, and
 * that is the known hole rather than a claimed absence.
 *
 * ⚠️ This grades the artefacts **as committed**. It is not a check on the
 * generators; `tpl001Template.test.ts` and `sb007Template.test.ts` own that, by
 * regenerating and comparing bytes. Both halves are needed: this one fails if a
 * committed artefact drifts, those fail if a generator stops producing it.
 *
 * @module noodl-mcp/tests/def038SettledTemplates.test
 */
import * as fs from 'fs';
import * as path from 'path';

import {
  planRunOnValueChangeMigration,
  RUN_ON_CHANGE_FAMILIES
} from '../../noodl-editor/src/editor/src/models/ProjectPatches/runOnValueChangeMigration';

import { readAsLegacyProject } from './templateArtefact';

const REPO = path.resolve(__dirname, '../../..');

/** Where a shipped artefact can live, and what shape it takes there. */
const TEMPLATE_DIRECTORIES = path.join(REPO, 'templates');
const EMBEDDED_CONTENT = path.join(
  REPO,
  'packages/noodl-editor/src/editor/src/models/template/templates'
);

/**
 * `familyTypesInFiles` is the presence control's second, independent reading: how many times a
 * family's type name appears as a `"type"` in the artefact's own files, by text. P119 s2: a new
 * template that is still the App + Home skeleton holds none of the fifteen families, the same
 * as `hello-world` (below), and the planner's zero is then the truth, not a broken instrument.
 * A zero from the planner beside a non-zero here is still the broken instrument, and fails.
 */
type Artefact = { name: string; project: { components?: unknown[] }; familyTypesInFiles: number };

const FAMILY_TYPE_RE = new RegExp(`"type"\\s*:\\s*"(${Object.keys(RUN_ON_CHANGE_FAMILIES).join('|')})"`, 'g');
const familyTypesIn = (text: string) => (text.match(FAMILY_TYPE_RE) ?? []).length;
function jsonTextUnder(dir: string): string {
  let out = '';
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const at = path.join(dir, entry.name);
    if (entry.isDirectory()) out += jsonTextUnder(at);
    else if (entry.name.endsWith('.json')) out += fs.readFileSync(at, 'utf-8');
  }
  return out;
}

/**
 * Find every shipped template artefact. **Derived, never listed** — see the
 * header. Two shapes, because the two generators ship differently: a v2 project
 * directory (TPL-001) and an embedded legacy `content.json` (the site builder).
 */
function shippedArtefacts(): Artefact[] {
  const found: Artefact[] = [];

  if (fs.existsSync(TEMPLATE_DIRECTORIES)) {
    for (const entry of fs.readdirSync(TEMPLATE_DIRECTORIES, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(TEMPLATE_DIRECTORIES, entry.name);
      if (!fs.existsSync(path.join(dir, 'nodegx.project.json'))) continue;
      const components = path.join(dir, 'components');
      found.push({
        name: `templates/${entry.name}`,
        project: readAsLegacyProject(dir) as never,
        familyTypesInFiles: fs.existsSync(components) ? familyTypesIn(jsonTextUnder(components)) : 0
      });
    }
  }

  if (fs.existsSync(EMBEDDED_CONTENT)) {
    for (const file of fs.readdirSync(EMBEDDED_CONTENT)) {
      if (!file.endsWith('.content.json')) continue;
      const text = fs.readFileSync(path.join(EMBEDDED_CONTENT, file), 'utf-8');
      found.push({ name: file, project: JSON.parse(text), familyTypesInFiles: familyTypesIn(text) });
    }
  }

  return found.sort((a, b) => a.name.localeCompare(b.name));
}

describe('DEF-038 — every shipped template artefact is settled against NDA-017', () => {
  const artefacts = shippedArtefacts();

  it('🔴 control: the sweep found the artefacts that exist, and both shapes are in it', () => {
    // An empty population would make every assertion below pass by reaching
    // nothing. The floor is 2 and the two shapes are named, so a generator whose
    // output stops being discoverable reddens here rather than going quiet.
    expect(artefacts.length).toBeGreaterThanOrEqual(2);
    expect(artefacts.map((a) => a.name)).toEqual(
      expect.arrayContaining(['site-builder.content.json', 'templates/members-area', 'templates/landing-pages'])
    );
    // P119 s2: the second reading is live on both shapes, so an honest zero cannot hide a regex that reads nothing.
    for (const name of ['site-builder.content.json', 'templates/members-area', 'templates/landing-pages']) {
      expect([name, artefacts.find((a) => a.name === name)!.familyTypesInFiles > 0]).toEqual([name, true]);
    }
  });

  it.each(artefacts.map((a) => [a.name, a] as const))(
    '%s — an editor load would rewrite nothing',
    (_name, artefact) => {
      const plan = planRunOnValueChangeMigration(artefact.project as never);

      // 🔴 The presence control, on the SAME reading. A zero `writes` beside a
      // zero `familyNodes` is a broken instrument, not a settled artefact —
      // exactly how the site-builder figure would have been misread. Unless the
      // files themselves hold no family node (P119 s2): then zero is the answer.
      if (artefact.familyTypesInFiles === 0) expect(plan.familyNodes).toBe(0);
      else expect(plan.familyNodes).toBeGreaterThan(0);
      expect(plan.writes).toEqual([]);
    }
  );

  it.each(artefacts.map((a) => [a.name, a] as const))(
    '%s — control: the check is live, and unsettling one parameter reddens it',
    (_name, artefact) => {
      // Mutate a copy: take back the answer on exactly one governed checkbox
      // and the planner must see work to do again. Without this, a spec that
      // asserted `[]` would pass just as well against a planner that had stopped
      // finding anything at all.
      //
      // ⚠️ ANY value, not only a pinned `true`. The planner treats an authored
      // `false` exactly as it treats a pinned `true` — `hasOwnProperty` is the
      // whole of its idempotency — so an artefact whose author answered every
      // checkbox (TPL-003 sets `false` on all of them, so typing cannot open
      // the mail app) has nothing pinned and was failing this control for a
      // reason that is not about settling. Deleting an authored answer makes
      // the planner want to write just the same, which is what "live" means.
      //
      // 🔴 P109 s7 (P109-S6-DEF038): **a key the planner GOVERNS, not the first one in the walk.**
      // The planner only reads a node whose control signal is wired; an answer left on a Function
      // with nothing wired to `Run` (TPL-007's `picknextquesFn`, the DBT template's `sfs_fn`) is
      // outside its reach, so deleting it rightly writes nothing — and this arm read that as a dead
      // check on two committed artefacts carrying 133 and 36 live keys beside it (measured s7). So: try each answered key
      // in walk order and pass on the first whose deletion the planner sees. A planner that stopped
      // finding anything still reddens here — every candidate then reads 0.
      // An artefact with no family node in its files has nothing to settle, so nothing to unsettle.
      if (artefact.familyTypesInFiles === 0) {
        expect(planRunOnValueChangeMigration(artefact.project as never).familyNodes).toBe(0);
        return;
      }
      type Raw = { components?: { name?: string; graph?: { roots?: unknown[] } }[] };
      const answered: { component: number; path: number[]; key: string }[] = [];
      const collect = (component: number, nodes: unknown[], at: number[]): void => {
        nodes.forEach((raw, i) => {
          const node = raw as { parameters?: Record<string, unknown>; children?: unknown[] };
          for (const key of Object.keys(node.parameters ?? {})) {
            if (key.startsWith('runOnChange-')) answered.push({ component, path: [...at, i], key });
          }
          if (Array.isArray(node.children)) collect(component, node.children, [...at, i]);
        });
      };
      ((artefact.project as Raw).components ?? []).forEach((component, c) => {
        if (Array.isArray(component?.graph?.roots)) collect(c, component.graph.roots, []);
      });

      // Every settled artefact carries at least one answered checkbox, or there
      // was nothing to settle and the arm above proved nothing about this artefact.
      expect(answered.length).toBeGreaterThan(0);

      const unsettled = answered.find(({ component, path: at, key }) => {
        const copy = JSON.parse(JSON.stringify(artefact.project)) as Raw;
        let node = { children: copy.components?.[component]?.graph?.roots } as {
          parameters?: Record<string, unknown>;
          children?: unknown[];
        };
        for (const i of at) node = node.children?.[i] as typeof node;
        delete node.parameters?.[key];
        return planRunOnValueChangeMigration(copy as never).writes.length > 0;
      });
      expect(unsettled).toBeDefined();
    }
  );
});
