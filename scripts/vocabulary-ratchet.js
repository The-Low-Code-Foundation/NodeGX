/**
 * Vocabulary ratchet (TVW-009).
 *
 * TVW-009 §2.1 fixes five words — **Component**, **Instance**, **Page**, **Layers**,
 * **Workbench** — and retires the ones they replace. A word retired in one session and
 * re-typed in the next is not retired; it is a word the team happens not to have used
 * lately. This holds the retired ones at **0** on user-visible strings.
 *
 * ## Why this is a gate at 0 and not a falling baseline
 *
 * `hex-color-ratchet.js` is a *ratchet* because its debt is thousands of literals spread
 * across a legacy tail, and a pass/fail gate would have had to be all-or-nothing on day
 * one. This debt is **twenty strings**. TVW-009 sweeps them in the same change that adds
 * this file, so there is no tail to burn down and nothing a baseline would buy except a
 * place for the count to hide. It is named a ratchet because §2.1 asked for one "on the
 * model of the hex ratchet"; the model it borrows is the *printed exemption list*, not the
 * moving number.
 *
 * ## The whole difficulty is "user-visible", and it is not a grep
 *
 * `grep -c sandbox` over these two roots returns **1192**. Almost every one is Electron's
 * `sandbox:` BrowserWindow option, an import of `@noodl/runtime/src/sandbox/types`, or a
 * `data-test="sandbox-auth-toggle"`. Not one is a word a person reads. A regex gate here
 * would have been red on day one against 1192 strings nobody can fix, and would have been
 * switched off — the failure `icon-font-gate.js` and the hex ratchet's own SCSS
 * line-comment strip were both built to avoid.
 *
 * So this walks the **TypeScript AST** and asks what each string *is*. That option was not
 * open to the hex ratchet — its own header says CSS has no equivalent parser readily
 * available — but TypeScript ships one, and it is what makes the difference between 1192
 * hits and 20. Comments are not AST nodes, so the gate cannot redden on prose explaining
 * why a word moved. Import specifiers, object keys, `case` labels and type literals are
 * each a node kind, not a spelling to be guessed at.
 *
 * ## The exemption list is the reviewable part (AC2)
 *
 * Every string this gate declines to count is printed with the **rule that excused it**
 * and the file it lives in. AC2 is not only "the count is 0" — it is that a reviewer can
 * read the exemptions and find nothing user-visible among them. A rule that cannot be
 * stated in a line has no business excusing a string, so each one is a line below.
 *
 * ## 🔴 `bench` names THREE surfaces and this task retires exactly one of them
 *
 * | surface | where | retired here? |
 * |---|---|---|
 * | the **Workbench** | `views/VisualCanvas/` (`benchWords.ts`) | ✅ already swept by TVW-001 |
 * | the Blockly **logic run bench** | `views/BlocklyEditor/` | ❌ **NO** — see below |
 * | the community's **Bench** | `components/community/`, `/api/v1/bench/threads`, FB-002 | ❌ a different product |
 *
 * 🔴 **The Blockly bench must NOT be called the Workbench.** Richard ruled 2026-09-17:
 * *swap the jargon, do not merge the names.* VFN-011's acceptance criterion 3 is that the
 * cost of running inside the editor is **stated**, and "Workbench" would claim it mounts
 * the real app on sample values — the opposite of what it does. That ruling is why
 * `SANDBOX_NOTE` became `TEST_VALUES_NOTE` there rather than gaining the new word.
 * Whether the logic bench gets a name of its own is **still an open question for Richard**,
 * and a sweep is not the place to answer it.
 *
 * ⚠️ This is the trap a word-shaped acceptance criterion sets: it hands you one list and
 * implies one answer. Both exceptions are narrow, by path, and printed with their reason,
 * so the next reader can disagree in one place instead of discovering it in five.
 *
 *   node scripts/vocabulary-ratchet.js             # the gate, plus the grouped exemptions
 *   node scripts/vocabulary-ratchet.js --verbose   # every exemption, with file and line
 */
const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');

/** Scanned roots. §2.1 names exactly these two. */
const TARGETS = ['packages/noodl-editor/src', 'packages/noodl-core-ui/src'];

/** Never descended into, anywhere under the roots. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'out', 'coverage', '.git', '.cache', 'storybook-static']);

/**
 * The retired words, and what §2.1 says instead.
 *
 * Each pattern is whole-word and case-insensitive. The leading `\b` is what stops "bench"
 * matching inside **Workbench** — there is no word boundary between `k` and `b` — so the
 * word that replaces it cannot trip the gate that retired it. Without that anchor the
 * sweep would be unfinishable: every string fixed by writing "Workbench" would redden the
 * gate that asked for it. Nothing else does this job; a `(?<!work)` lookbehind stood here
 * briefly and was pure decoration, which a mutant proved by surviving its removal.
 */
const RETIRED = [
  { word: 'sandbox', re: /\bsandbox(es|ed|ing)?\b/i, instead: 'Workbench' },
  { word: 'bench', re: /\bbench(es)?\b/i, instead: 'Workbench' },
  { word: 'in isolation', re: /\bin isolation\b/i, instead: 'on the Workbench' },
  { word: 'isolated component', re: /\bisolated components?\b/i, instead: 'Workbench' },
  { word: 'page component', re: /\bpage components?\b/i, instead: 'Page' },
  { word: 'component node', re: /\bcomponent nodes?\b/i, instead: 'Instance' }
];

/**
 * Props whose string value a person reads. A string here is counted **even when it is a
 * single word**, which is the only reason the launcher's `Bench` tab was ever visible to
 * this gate: the identifier heuristic below would otherwise have excused it for having no
 * space in it.
 */
const VISIBLE_PROPS = new Set([
  'label', 'title', 'tooltip', 'placeholder', 'text', 'message', 'description', 'caption',
  'hint', 'header', 'subtitle', 'heading', 'suggestion', 'why', 'confirmLabel', 'cancelLabel',
  'endSlot', 'promptLabel', 'promptPlaceholder', 'emptyText', 'summary', 'body', 'alt',
  'ariaLabel', 'aria-label', 'helperText', 'errorMessage', 'notes'
]);

/** Props whose string value is machinery: a hook, a selector, a key, never a sentence. */
const NON_VISIBLE_PROPS = new Set([
  'testId', 'className', 'id', 'key', 'style', 'ref', 'name', 'type', 'icon', 'href', 'src',
  'to', 'path', 'value', 'partition', 'target', 'htmlFor', 'kind', 'mode', 'variant', 'slot'
]);

/**
 * Where "Bench" is the community's Bench — a different surface, not the Workbench.
 * Narrow on purpose: a `bench` that means the Workbench must not be able to hide by
 * being written in one of these files.
 */
/**
 * Where "bench" is the Blockly logic run bench — a surface Richard has ruled must NOT take
 * the name Workbench, and whose own name is an open question. Not a permanent exemption:
 * it expires the day that question is answered.
 */
const BLOCKLY_BENCH_PATHS = ['packages/noodl-editor/src/editor/src/views/BlocklyEditor/'];

const COMMUNITY_BENCH_PATHS = [
  'packages/noodl-core-ui/src/components/community/',
  'packages/noodl-core-ui/src/preview/launcher/Launcher/views/Community.tsx',
  'packages/noodl-core-ui/src/preview/launcher/Launcher/views/communityTabs.ts',
  'packages/noodl-editor/src/editor/src/models/community/',
  'packages/noodl-editor/src/editor/src/hooks/useCommunityThread.ts'
];

// -- discovery ---------------------------------------------------------------

function findSourceFiles(roots) {
  const files = [];
  function walk(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return; // a root missing from this checkout is not an error
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) walk(full);
      } else if (entry.isFile() && /\.tsx?$/.test(entry.name)) {
        files.push(path.relative(ROOT, full).split(path.sep).join('/'));
      }
    }
  }
  for (const root of roots) walk(path.join(ROOT, root));
  return files.sort();
}

// -- classification ----------------------------------------------------------

/** The nearest enclosing `console.*` call, if this string is an argument to one. */
function insideConsoleCall(node) {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isCallExpression(p)) {
      const callee = p.expression.getText();
      return /^console\./.test(callee);
    }
    // Only climb through things a log argument is built out of.
    if (!ts.isTemplateExpression(p) && !ts.isTemplateSpan(p) && !ts.isBinaryExpression(p)) return false;
  }
  return false;
}

/** The prop or JSX attribute this string is the value of, or null. */
function owningProp(node) {
  const p = node.parent;
  if (ts.isJsxAttribute(p)) return p.name.getText();
  if (ts.isJsxExpression(p) && p.parent && ts.isJsxAttribute(p.parent)) return p.parent.name.getText();
  if (ts.isPropertyAssignment(p) && p.name !== node) return p.name.getText().replace(/['"]/g, '');
  return null;
}

/**
 * The two surfaces that wear "bench" and are not the Workbench, or `null`.
 *
 * Only ever excuses the word `bench` itself, and only on its own: a string carrying
 * `sandbox` or `page component` is counted in these files like anywhere else, so neither
 * path can become a place the rest of the vocabulary hides.
 */
function otherBenchRule(file, words) {
  if (words.length !== 1 || words[0] !== 'bench') return null;

  if (BLOCKLY_BENCH_PATHS.some((p) => file.startsWith(p))) {
    return {
      rule: 'blockly-run-bench',
      why: 'The Blockly logic run bench is a different surface; Richard ruled 2026-09-17 to swap its jargon and NOT give it the name Workbench (VFN-011 AC3). Its own name is an open question.'
    };
  }

  if (COMMUNITY_BENCH_PATHS.some((p) => file.startsWith(p))) {
    return {
      rule: 'community-bench',
      why: "The community's Bench is a different product surface; TVW-009 retires 'bench' only as a name for the Workbench."
    };
  }

  return null;
}

/**
 * Why this string is not counted, or `null` when it is.
 *
 * Order is load-bearing: the structural rules run before the visible-prop check so that a
 * `data-test` attribute is machinery whatever it is spelled, and the visible-prop check
 * runs before the identifier heuristic so that a one-word label is still a label.
 */
function exemptionFor({ node, text, file, isJsxText, words }) {
  if (/\.stories\.tsx?$/.test(file)) {
    return { rule: 'storybook-fixture', why: 'Storybook does not start in this repo; no user reads it.' };
  }

  if (!isJsxText) {
    const p = node.parent;
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) {
      return { rule: 'module-path', why: 'A module specifier is a path on disk.' };
    }
    if (ts.isCallExpression(p) && /^(require|import)$/.test(p.expression.getText())) {
      return { rule: 'module-path', why: 'A module specifier is a path on disk.' };
    }
    if (ts.isPropertyAssignment(p) && p.name === node) {
      return { rule: 'object-key', why: 'A key in an object literal is a field name.' };
    }
    if (ts.isLiteralTypeNode(p)) {
      return { rule: 'type-literal', why: 'A string union member is a type, checked by the compiler.' };
    }
    if (ts.isCaseClause(p)) {
      return { rule: 'case-clause', why: 'A switch label is compared, never displayed.' };
    }
    if (insideConsoleCall(node)) {
      return { rule: 'developer-log', why: 'A console line is read in devtools by us, not by a user.' };
    }
    const prop = owningProp(node);
    if (prop && (NON_VISIBLE_PROPS.has(prop) || /^data-/.test(prop))) {
      return { rule: `non-visible-prop:${prop}`, why: 'This prop carries machinery, not a sentence.' };
    }
    const otherBench = otherBenchRule(file, words);
    if (otherBench) return otherBench;
    if (!prop || !VISIBLE_PROPS.has(prop)) {
      if (!/\s/.test(text.trim())) {
        return { rule: 'identifier-or-url', why: 'No whitespace, and in no prop a person reads: an id, a selector or a URL.' };
      }
    }
  } else {
    const otherBench = otherBenchRule(file, words);
    if (otherBench) return otherBench;
  }

  return null;
}

// -- scanning ----------------------------------------------------------------

/**
 * Classify one source's strings. Split out from `scan` so the spec can grade the
 * classifier on text it writes itself: the rules are the thing worth testing, and a
 * scan of the real tree can only ever say "0 today", which a classifier that matches
 * nothing at all also says.
 */
function scanSource(file, source) {
  const counted = [];
  const exempt = [];

  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    /\.tsx$/.test(file) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  );

  const visit = (node) => {
    let text = null;
    let isJsxText = false;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      text = node.text;
    } else if (ts.isJsxText(node)) {
      text = node.text;
      isJsxText = true;
    } else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      // A template's literal spans are text; its `${}` holes are expressions, visited on
      // their own.
      text = node.text;
    }

    if (text && text.trim()) {
      const words = RETIRED.filter((r) => r.re.test(text)).map((r) => r.word);
      if (words.length) {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
        const entry = { file, line: line + 1, words, text: text.trim().replace(/\s+/g, ' ') };
        const exemption = exemptionFor({ node, text, file, isJsxText, words });
        if (exemption) exempt.push({ ...entry, ...exemption });
        else counted.push(entry);
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  // Comments are not AST nodes, which is the point: this gate cannot redden on a
  // comment that explains why a word was retired.
  return { counted, exempt };
}

function scan() {
  const files = findSourceFiles(TARGETS);
  const counted = [];
  const exempt = [];

  for (const file of files) {
    const result = scanSource(file, fs.readFileSync(path.join(ROOT, file), 'utf8'));
    counted.push(...result.counted);
    exempt.push(...result.exempt);
  }

  return { counted, exempt, scanned: files.length };
}

// -- reporting ---------------------------------------------------------------

function printExemptions(exempt, verbose) {
  const byRule = new Map();
  for (const e of exempt) {
    if (!byRule.has(e.rule)) byRule.set(e.rule, { why: e.why, entries: [] });
    byRule.get(e.rule).entries.push(e);
  }

  console.log(`The allowlist — ${exempt.length} string(s) this gate does not count.`);
  console.log('AC2 asks a reviewer to read it and find nothing user-visible here.\n');

  for (const [rule, { why, entries }] of [...byRule.entries()].sort((a, b) => b[1].entries.length - a[1].entries.length)) {
    console.log(`  ${rule} — ${entries.length}`);
    console.log(`    ${why}`);
    if (verbose) {
      for (const e of entries) console.log(`      ${e.file}:${e.line}  ${JSON.stringify(e.text.slice(0, 100))}`);
    } else {
      // Distinct texts, so the list stays readable without hiding a spelling.
      const distinct = [...new Set(entries.map((e) => e.text.slice(0, 72)))].sort();
      for (const t of distinct.slice(0, 8)) console.log(`      ${JSON.stringify(t)}`);
      if (distinct.length > 8) console.log(`      … ${distinct.length - 8} more distinct (--verbose for all)`);
    }
    console.log('');
  }
}

function main() {
  const verbose = process.argv.includes('--verbose');
  const { counted, exempt, scanned } = scan();

  console.log(`Scanned ${scanned} .ts/.tsx files under ${TARGETS.join(', ')}\n`);

  const perWord = RETIRED.map((r) => [r.word, counted.filter((c) => c.words.includes(r.word)).length]);
  const width = Math.max(...perWord.map(([w]) => w.length));
  for (const [word, count] of perWord) {
    console.log(`  ${word.padEnd(width)}  ${count}`);
  }
  console.log('');

  printExemptions(exempt, verbose);

  if (counted.length) {
    console.error(`✗ ${counted.length} user-visible string(s) still carry a retired word.\n`);
    for (const c of counted) {
      const instead = RETIRED.filter((r) => c.words.includes(r.word)).map((r) => `${r.word} → ${r.instead}`);
      console.error(`  ${c.file}:${c.line}`);
      console.error(`    ${instead.join('; ')}`);
      console.error(`    ${JSON.stringify(c.text.slice(0, 140))}\n`);
    }
    console.error('TVW-009 §2.1 has the table. If one of these is genuinely not a string a');
    console.error('person reads, the fix is a NAMED rule in `exemptionFor` that says why —');
    console.error('never a quieter word. The allowlist above is read by a reviewer.\n');
    return 1;
  }

  console.log('✓ No retired word on a user-visible string.\n');
  return 0;
}

/**
 * Requireable, so the spec can grade the CLASSIFIER and not merely the exit code.
 * A gate whose only assertion is "it printed 0 today" passes just as well when the
 * rules that produced the 0 have quietly stopped matching anything at all.
 */
module.exports = { scan, scanSource, RETIRED, TARGETS, BLOCKLY_BENCH_PATHS, COMMUNITY_BENCH_PATHS, VISIBLE_PROPS, NON_VISIBLE_PROPS };

if (require.main === module) {
  try {
    process.exit(main());
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
