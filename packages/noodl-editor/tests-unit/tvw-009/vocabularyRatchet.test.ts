/**
 * TVW-009 AC2 — the vocabulary gate reads 0, and the rules that produce the 0 still fire.
 *
 * ## Why most of this file is about synthetic sources
 *
 * The obvious spec is one line: scan the tree, expect 0. That line passes for two
 * completely different reasons — because the sweep worked, or because the classifier
 * stopped matching anything at all. A regex edited into always-exempting, a node kind
 * renamed by a TypeScript upgrade, an `exemptionFor` that returns a rule for everything:
 * each of those reads 0 on a tree full of the retired words. [[a-rule-reading-zero-in-both-arms-grades-nothing]]
 *
 * So the real-tree arm sits at the bottom, and everything above it is a **known-firing
 * signal beside the absence**: sources written here, where the right answer is known,
 * and where each exemption is proved to be about the thing it claims to be about rather
 * than about the word. The two `community-bench` arms are the shape to copy — the same
 * text, counted in one file and excused in another, which is the only way to show the
 * rule is about the path.
 *
 * Plain Node, no editor imports: the gate is a script, and `scanSource` is pure.
 */

const ratchet = require('../../../../scripts/vocabulary-ratchet.js');

/** The words `scanSource` counted, for one synthetic file. */
function counted(file: string, source: string): string[] {
  return ratchet.scanSource(file, source).counted.map((c: { text: string }) => c.text);
}

/** The exemption rules `scanSource` applied, for one synthetic file. */
function rules(file: string, source: string): string[] {
  return ratchet.scanSource(file, source).exempt.map((e: { rule: string }) => e.rule);
}

const EDITOR = 'packages/noodl-editor/src/editor/src/views/Example.tsx';

describe('TVW-009 AC2 — the classifier fires', () => {
  it('counts a retired word in JSX a person reads', () => {
    expect(counted(EDITOR, 'const a = <div>Open the sandbox to try it</div>;')).toEqual([
      'Open the sandbox to try it'
    ]);
  });

  it('counts a retired word in a prop a person reads', () => {
    expect(counted(EDITOR, "const a = { title: 'Choose page component' };")).toEqual([
      'Choose page component'
    ]);
  });

  it('counts a one-word label — the identifier heuristic must not swallow it', () => {
    // The launcher's `Bench` tab has no space in it. Were the "no whitespace means an
    // id" rule allowed to run before the visible-prop check, every single-word label in
    // the product would be invisible to this gate.
    expect(counted(EDITOR, "const a = { label: 'Bench' };")).toEqual(['Bench']);
  });
});

describe('TVW-009 AC2 — each exemption is about what it claims', () => {
  it('excuses a module specifier, and the same word in prose beside it is still counted', () => {
    const source = ["import x from '@noodl/runtime/src/sandbox/types';", 'const a = <p>the sandbox is open</p>;'].join(
      '\n'
    );
    expect(rules(EDITOR, source)).toEqual(['module-path']);
    expect(counted(EDITOR, source)).toEqual(['the sandbox is open']);
  });

  it('excuses a data-test hook but not a sentence in the same element', () => {
    const source = 'const a = <div data-test="sandbox-auth-toggle">the sandbox is open</div>;';
    expect(rules(EDITOR, source)).toEqual(['non-visible-prop:data-test']);
    expect(counted(EDITOR, source)).toEqual(['the sandbox is open']);
  });

  it('excuses an object key, a case label and a type literal — all machinery', () => {
    expect(rules(EDITOR, "const a = { 'page component': 1 };")).toEqual(['object-key']);
    expect(rules(EDITOR, "switch (k) { case 'bench': break; }")).toEqual(['case-clause']);
    expect(rules(EDITOR, "let a: 'bench' | 'canvas';")).toEqual(['type-literal']);
  });

  it('excuses a console line, because we read it in devtools and nobody else reads it', () => {
    expect(rules(EDITOR, "console.log('[Agg] Page components: ' + n);")).toEqual(['developer-log']);
    // The control: the identical text outside a console call is a sentence again.
    // Reported text is trimmed, so the trailing space in the source is not in the readout.
    expect(counted(EDITOR, "const a = { message: '[Agg] Page components: ' + n };")).toEqual([
      '[Agg] Page components:'
    ]);
  });

  it('never counts a comment, so the gate cannot redden on prose explaining the sweep', () => {
    const source = ['// This used to say sandbox, and TVW-009 retired the word.', "const a = { label: 'Workbench' };"].join(
      '\n'
    );
    expect(counted(EDITOR, source)).toEqual([]);
    expect(rules(EDITOR, source)).toEqual([]);
  });
});

describe("TVW-009 — 🔴 'bench' means two things and the gate knows which file it is in", () => {
  const COMMUNITY = 'packages/noodl-core-ui/src/preview/launcher/Launcher/views/communityTabs.ts';
  const SOURCE = "const a = { label: 'Bench' };";

  it("excuses the community's Bench, which is a different surface", () => {
    expect(rules(COMMUNITY, SOURCE)).toEqual(['community-bench']);
    expect(counted(COMMUNITY, SOURCE)).toEqual([]);
  });

  it('counts the very same string anywhere else — the rule is about the path, not the word', () => {
    // Without this pair the arm above proves only that something was excused. Together
    // they prove what was varied: the file, and nothing else.
    expect(counted(EDITOR, SOURCE)).toEqual(['Bench']);
  });

  it('declares its community paths, so the exception lives in one place', () => {
    expect(ratchet.COMMUNITY_BENCH_PATHS).toContain(
      'packages/noodl-core-ui/src/preview/launcher/Launcher/views/communityTabs.ts'
    );
  });
});

describe('TVW-009 — 🔴 the Blockly logic run bench keeps its name, because a ruling says so', () => {
  const BLOCKLY = 'packages/noodl-editor/src/editor/src/views/BlocklyEditor/InterfaceRailsOverlay.ts';
  const NOTE = "const a = { title: 'The bench runs these blocks here in the editor' };";

  it('does not ask that surface to say Workbench', () => {
    // Richard ruled 2026-09-17: swap the jargon, do not merge the names. VFN-011's AC3 is
    // that the cost of running inside the editor is STATED — "Workbench" would claim it
    // mounts the real app on sample values, which is the opposite of what it does.
    // This session swept it by mistake and the ruling caught it; the arm is here so the
    // next sweep cannot.
    expect(rules(BLOCKLY, NOTE)).toEqual(['blockly-run-bench']);
    expect(counted(BLOCKLY, NOTE)).toEqual([]);
  });

  it('counts the same sentence anywhere else', () => {
    expect(counted(EDITOR, NOTE)).toEqual(['The bench runs these blocks here in the editor']);
  });

  it('excuses only the word bench there — the rest of the vocabulary cannot hide in that folder', () => {
    // 🔴 Without this the exemption would be a hole shaped like the whole task: any retired
    // word written under BlocklyEditor/ would go uncounted.
    expect(counted(BLOCKLY, "const a = { title: 'Open the sandbox' };")).toEqual(['Open the sandbox']);
    expect(counted(BLOCKLY, "const a = { title: 'a page component' };")).toEqual(['a page component']);
  });
});

describe('TVW-009 — the replacement word does not trip the gate that retired it', () => {
  it('reads Workbench as Workbench and not as bench', () => {
    // The leading `\b` is the whole mechanism: there is no word boundary between the `k`
    // and the `b` of Workbench. Were the anchor dropped, the sweep would be unfinishable —
    // every string fixed by writing "Workbench" would redden the gate that asked for it.
    // 🔴 A `(?<!work)` lookbehind sat here until a mutant SURVIVED its removal, which is
    // how it was discovered to be decoration: `\b` had been doing the job alone all along,
    // and the comment claiming otherwise was the only thing making it look load-bearing.
    expect(counted(EDITOR, "const a = { label: 'Open the Workbench' };")).toEqual([]);
  });

  it('and the control: the bare word still counts', () => {
    expect(counted(EDITOR, "const a = { label: 'Open the bench' };")).toEqual(['Open the bench']);
  });

  it('covers every word §2.1 retires, each with a replacement named', () => {
    expect(ratchet.RETIRED.map((r: { word: string }) => r.word).sort()).toEqual([
      'bench',
      'component node',
      'in isolation',
      'isolated component',
      'page component',
      'sandbox'
    ]);
    for (const r of ratchet.RETIRED) expect(r.instead).toBeTruthy();
  });
});

describe('TVW-009 AC2 — the real tree', () => {
  const result = ratchet.scan();

  it('scans both roots §2.1 names, and finds real files in them', () => {
    expect(ratchet.TARGETS).toEqual(['packages/noodl-editor/src', 'packages/noodl-core-ui/src']);
    // Guards the whole suite against a walk that silently returns nothing — against
    // which every count below would be 0 for the wrong reason.
    expect(result.scanned).toBeGreaterThan(1000);
  });

  it('holds every retired word at 0 on a user-visible string', () => {
    const perWord: Record<string, number> = {};
    for (const r of ratchet.RETIRED) {
      perWord[r.word] = result.counted.filter((c: { words: string[] }) => c.words.includes(r.word)).length;
    }
    expect(perWord).toEqual({
      sandbox: 0,
      bench: 0,
      'in isolation': 0,
      'isolated component': 0,
      'page component': 0,
      'component node': 0
    });
  });

  it('still has strings to classify, so the 0 is a sweep and not an empty scan', () => {
    // 🔴 The load-bearing control. 0 counted out of 0 examined grades nothing; 0 counted
    // out of ~130 examined says the rules ran and decided.
    expect(result.exempt.length).toBeGreaterThan(50);
  });

  it('gives every exemption a named rule and a reason, because a reviewer reads the list', () => {
    // AC2's second half is a human check, and this is the part of it a machine can hold:
    // that the printed list is complete and self-describing. An exemption with no reason
    // is one nobody can disagree with.
    for (const e of result.exempt) {
      expect(typeof e.rule).toBe('string');
      expect(e.rule.length).toBeGreaterThan(0);
      expect(typeof e.why).toBe('string');
      expect(e.why.length).toBeGreaterThan(20);
    }
  });

  it('applies community-bench only inside the paths it declares', () => {
    const strays = result.exempt
      .filter((e: { rule: string }) => e.rule === 'community-bench')
      .filter((e: { file: string }) => !ratchet.COMMUNITY_BENCH_PATHS.some((p: string) => e.file.startsWith(p)));
    expect(strays).toEqual([]);
  });
});
