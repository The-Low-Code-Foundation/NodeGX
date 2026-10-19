import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

import { Catalog, loadCatalog } from '../src/catalog';
import { emitApp } from '../src/emit/emitApp';
import { parseProject } from '../src/parse/parseProject';
import { typecheckEmittedApp } from './helpers/typecheckApp';

/**
 * P18-S122-TPLBUILD, the gate first (P18 session 124, EXP-011 §91.7). The exported app's `build` is `tsc -b && vite build`,
 * so one type error stops it, and the shipped templates' exports were never typechecked: `typecheck-emitted` grades the
 * fixtures only. This emits every template the repository tracks and typechecks it as that build does
 * (`helpers/typecheckApp`, the scaffold's strict options), and holds each template's error count to the ledger below.
 *
 * 🔴 **A ratchet, both ways.** A count that rises is a new type error in that template's export: fix it. A count that
 * falls is a fix: lower the row in the same commit, or a later rise back to the old number would pass unseen. A template
 * edit (a template lane's work) moves its row too; the failure names the template and both counts.
 *
 * Tracked templates only (`git ls-files`): an untracked one in a working tree (nightbook) is not the repository's. The two
 * `*.content.json` templates (the Site Builder, landing-pages' older form) need the editor's own writer to become a
 * project and are not read here; `s124-deadrow/tplbuild.ts` measures them beside these.
 */

const REPO = path.join(__dirname, '..', '..', '..');

/**
 * Errors per template. Session 124: 311 in 11 of 16 at first; 189 in 9 of 16 once a lifted output's callback took
 * `T | undefined` (the 122 TS2345 rows of `onXChanged?.(x)`). Session 125 (EXP-011 §92), class by class: an Expression
 * with no inputs called with none (TS2554, 42), a lifted push of an untyped value cast to the port's type (TS2345, 35),
 * a removed root returning null (TS2786, 39), a render local after the hook it reads (TS2448/TS2454, 44), a Function's
 * wrapper in its own file (TS7006/TS7053, 7, Richard's ruling), a "key" input bound as keyProp (TS17001, 12), a kit
 * import aliased off its component's name (TS2440, 4, and the 4 TS2322 behind it), an object kit prop that takes an
 * array and an animation option cast to a number (TS2322, 3): **0 in 0 of 16.** Every row is 0: a rise is a new error.
 */
const LEDGER: Record<string, number> = {
  'bot-garden': 0,
  'digital-bricks-training': 0,
  'digital-bricks-training-demo': 0,
  gram: 0,
  'landing-pages': 0,
  'learn-with-simple-rick': 0,
  marketplace: 0,
  'members-area': 0,
  'pixel-game': 0,
  planning: 0,
  'planning-demo': 0,
  'rocket-school': 0,
  'star-class': 0,
  'story-engine': 0,
  'todo-list': 0,
  'todo-list-demo': 0
};

const trackedTemplates = (): string[] => {
  let listed: string[];
  try {
    listed = execFileSync('git', ['ls-files', 'templates/*/nodegx.project.json'], { cwd: REPO, encoding: 'utf8' })
      .split('\n')
      .filter(Boolean)
      .map((f) => f.split('/')[1]);
  } catch {
    listed = fs.readdirSync(path.join(REPO, 'templates')).filter((d) => fs.existsSync(path.join(REPO, 'templates', d, 'nodegx.project.json')));
  }
  return [...new Set(listed)].sort();
};

const catalog: Catalog = loadCatalog();

describe('the templates the repository ships export apps whose own build typechecks, by count', () => {
  const templates = trackedTemplates();
  const measured: Record<string, { errors: number; first: string[] }> = {};
  // Measured in a hook, not the describe body: a throw there would read "0 total", like a broken compile.
  beforeAll(() => {
    for (const name of templates) {
      const diags = typecheckEmittedApp(emitApp(parseProject(path.join(REPO, 'templates', name), catalog), catalog));
      measured[name] = { errors: diags.length, first: diags.slice(0, 3) };
    }
  });

  it('reads every tracked template, and the ledger names exactly those', () => {
    expect(templates.length).toBeGreaterThan(10);
    expect(templates).toEqual(Object.keys(LEDGER).sort());
  });

  it('no template export has more type errors than its row, and none has fewer unsaid', () => {
    const moved = templates
      .filter((name) => measured[name].errors !== LEDGER[name])
      .map((name) =>
        LEDGER[name] === undefined
          ? `${name}: ${measured[name].errors} errors, and no row in the ledger — add one`
          : measured[name].errors > LEDGER[name]
          ? `${name}: ${measured[name].errors} errors, the ledger says ${LEDGER[name]} — a new type error in its export: ${measured[name].first.join(' | ')}`
          : `${name}: ${measured[name].errors} errors, the ledger says ${LEDGER[name]} — fewer: lower its row to ${measured[name].errors}`
      );
    expect(moved).toEqual([]);
  });

  it('control: an error put into one emitted page of a clean template is counted', () => {
    const app = emitApp(parseProject(path.join(REPO, 'templates', 'members-area'), catalog), catalog);
    const page = Object.keys(app.files).find((f) => f.startsWith('src/pages/') && f.endsWith('.tsx'))!;
    const broken = { files: { ...app.files, [page]: `${app.files[page]}\nconst notANumber: number = 'a';\n` } };
    expect(typecheckEmittedApp(app)).toEqual([]);
    expect(typecheckEmittedApp(broken).length).toBe(1);
  });
});
