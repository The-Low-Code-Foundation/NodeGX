/**
 * P112-OWN020-PILLWRAP and P112-OWN020-FILLGROW — a node with no size setting fills its parent (ruled 2026-10-26: warn
 * and teach, and make sure it works). The two live rules in `rules/layoutFillTraps.ts`, through the real
 * `SemanticValidator` and `ALL_RULES`, so what is graded is what the Problems panel and an agent's write both run.
 *
 * The fixtures are CGQ1's own nodes (GLM-5.3's quiz, `OWN-020 ClinePass apps/CGQ1`): the start screen's glass pill
 * and the quiz screen's header row, with their parameters as written. Every firing arm has a silent twin that differs
 * by the one thing the message tells a person to change, so neither rule can pass by firing on everything.
 */
import { DiagnosticCode } from '../../src/editor/src/validation/diagnostics';
import { fromLegacyProject } from '../../src/editor/src/validation/normalize';
import { ALL_RULES } from '../../src/editor/src/validation/rules';
import { SemanticValidator } from '../../src/editor/src/validation/SemanticValidator';

type Node = { id: string; type: string; label?: string; parameters: Record<string, unknown>; children: Node[] };
const n = (id: string, type: string, parameters: Record<string, unknown> = {}, children: Node[] = []): Node => ({
  id,
  type,
  label: id,
  parameters,
  children
});

const CODES = [DiagnosticCode.ContentRowSplitsItsChildren, DiagnosticCode.RowOfWordsFillsItsColumn];

function fired(name: string, root: Node): string[] {
  const report = new SemanticValidator().validate(fromLegacyProject({ components: [{ name, graph: { roots: [root] } } as never] }));
  return report.diagnostics.filter((d) => CODES.includes(d.code)).map((d) => `${d.code}@${d.location.nodeId}`);
}

const pct = (value: number) => ({ unit: '%', value });

/** CGQ1 Pages/Start: a centred column holding the glass pill, a row that sizes to its content, and two stat Texts. */
function startScreen(stat: Record<string, unknown> = {}, pill: Record<string, unknown> = {}) {
  return n('page', 'Page', {}, [
    n('s_shell', 'Group', { alignItems: 'center', flexDirection: 'column', width: pct(100) }, [
      n('s_title', 'Text', { text: 'Capital quiz' }),
      n('s_glass', 'Group', { flexDirection: 'row', sizeMode: 'contentSize', columnGap: 'var(--space-8)', ...pill }, [
        n('s_stat_a', 'Text', { text: '5 questions', ...stat }),
        n('s_stat_b', 'Text', { text: '10 s each', ...stat })
      ])
    ])
  ]);
}

/** CGQ1 Pages/Quiz: a band under a minHeight, a column shell, the header row with two content-sized Texts, the question. */
function quizScreen(meta: Record<string, unknown> = {}, shell: Record<string, unknown> = {}) {
  return n('page', 'Page', {}, [
    n('q_band', 'Group', { flexDirection: 'column', minHeight: pct(100) }, [
      n('q_shell', 'Group', { flexDirection: 'column', rowGap: 'var(--space-5)', width: pct(100), ...shell }, [
        n('q_meta', 'Group', { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', width: pct(100), ...meta }, [
          n('q_label', 'Text', { sizeMode: 'contentSize', text: 'Question 1 of 5' }),
          n('q_timer', 'Text', { sizeMode: 'contentSize', text: '10 s' })
        ]),
        n('q_question', 'Text', { text: 'What is the capital of Australia?' })
      ])
    ])
  ]);
}

describe('P112-OWN020-PILLWRAP — a row that sizes to its content splits it between children with no width', () => {
  it('fires on CGQ1’s glass pill, from the pill', () => {
    expect(fired('/Pages/Start', startScreen())).toEqual(['content-row-splits-its-children@s_glass']);
  });

  it('is silent once the Texts hug their words (the fix it names)', () => {
    expect(fired('/Pages/Start', startScreen({ sizeMode: 'contentSize' }))).toEqual([]);
  });

  it('is silent on a full-width row (sharing its width out is what that row is for)', () => {
    // As tall as its words, so the other rule has nothing to say about it either.
    expect(fired('/Pages/Start', startScreen({}, { sizeMode: 'contentHeight', width: pct(100) }))).toEqual([]);
  });

  it('is silent with one grower beside a content-sized sibling (it gets exactly the room left)', () => {
    const root = startScreen();
    root.children[0].children[1].children[1].parameters.sizeMode = 'contentSize';
    expect(fired('/Pages/Start', root)).toEqual([]);
  });
});

describe('P112-OWN020-FILLGROW — a row of words with no height of its own fills its column', () => {
  it('fires on CGQ1’s header row, from the row', () => {
    expect(fired('/Pages/Quiz', quizScreen())).toEqual(['row-of-words-fills-its-column@q_meta']);
  });

  it('is silent once the row is as tall as its words (the fix it names)', () => {
    expect(fired('/Pages/Quiz', quizScreen({ sizeMode: 'contentHeight' }))).toEqual([]);
  });

  it('is silent when the column sizes to its content (it has no height to hand out)', () => {
    expect(fired('/Pages/Quiz', quizScreen({}, { sizeMode: 'contentHeight' }))).toEqual([]);
  });

  it('is silent when the row holds something that can use the height (a section meant to fill)', () => {
    const root = quizScreen();
    root.children[0].children[0].children[0].children.push(n('q_panel', 'Group', { flexDirection: 'column' }));
    expect(fired('/Pages/Quiz', root)).toEqual([]);
  });

  it('is silent inside a component that is not a page (its height is decided where it is placed)', () => {
    expect(fired('/Components/QuizHeader', quizScreen().children[0])).toEqual([]);
  });

  it('is silent when the row is the column’s only child (filling its box is then a choice)', () => {
    const root = quizScreen();
    root.children[0].children[0].children.pop();
    expect(fired('/Pages/Quiz', root)).toEqual([]);
  });
});

describe('both are live rules', () => {
  it('are in ALL_RULES, which the Problems panel and an agent’s write both run', () => {
    const codes = ALL_RULES.map((r) => r.code);
    for (const code of CODES) expect(codes).toContain(code);
  });
});
