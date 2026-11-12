/**
 * P128 S6 (STU-084) — Studio's vocabulary, one file; and the question a person asks from Studio's "Ask the agent".
 *
 * S2 pinned what Studio edits by hand from `studio.html` (`src/studio/vocabulary.ts`, "S6 replaces it"). Studio now
 * says it in `nodegx-studio/editor/vocabulary.json`, which studio.html itself reads; this server keeps the generated
 * copy `src/studio/studioVocabulary.ts` (`scripts/pin-studio-vocabulary.mjs`). The copy must equal Studio's file
 * (checked when a Studio checkout is beside this one: `NODEGX_STUDIO`, or `~/vscode_projects/nodegx-studio`), and the
 * lists read from it must say what S2's hand-pinned lists said.
 *
 * A part Studio does not edit has an "Ask the agent" on its card: Studio writes the question into the project's
 * `.nodegx-questions.json`, and `what_changed_since` reports each question once.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { STUDIO_STEP_TYPES, studioEdits } from '../src/studio/vocabulary';
import { STUDIO_VOCABULARY } from '../src/studio/studioVocabulary';
import { QUESTIONS_FILE, questionsSinceSeen } from '../src/tools/whatChanged';
import { call, connect, copyFixture, reveal, TestSession } from './helpers';

const STUDIO = process.env.NODEGX_STUDIO ?? path.join(os.homedir(), 'vscode_projects', 'nodegx-studio');
const STUDIO_FILE = path.join(STUDIO, 'editor', 'vocabulary.json');

describe('P128 S6 — Studio’s vocabulary is Studio’s file', () => {
  (fs.existsSync(STUDIO_FILE) ? it : it.skip)('the pinned copy equals nodegx-studio/editor/vocabulary.json (run scripts/pin-studio-vocabulary.mjs when it does not)', () => {
    expect(JSON.parse(JSON.stringify(STUDIO_VOCABULARY))).toEqual(JSON.parse(fs.readFileSync(STUDIO_FILE, 'utf8')));
  });

  it('the step types read from it are the ones S2 pinned by hand from studio.html', () => {
    // S2's list (studio.html `ACTIONS` at 668212a, the three display-name rows with the types they place)
    const s2 = ['RouterNavigate', 'NewDbModelProperties', 'SetDbModelProperties', 'DeleteDbModelProperties', 'Set Variable', 'Condition', 'net.noodl.user.LogIn', 'net.noodl.user.LogOut', 'net.noodl.user.SignUp', 'Timer', 'Send Event', 'Event Sender', 'Navigate To Path', 'PageStackNavigateToPath', 'Show Popup', 'NavigationShowPopup'];
    expect([...STUDIO_STEP_TYPES].sort()).toEqual([...s2].sort());
  });

  it('what Studio edits, read from the file: elements, steps, sources, an option set’s insides; and what it does not', () => {
    const visual = (t: string) => t === '/Components/Card';
    const edits = (node: { id: string; type: string; metadata?: Record<string, unknown> }, inComponent = '/Pages/Home') => studioEdits(node, inComponent, visual);
    expect(edits({ id: 'a', type: 'Group' })).toBe(true);
    expect(edits({ id: 'b', type: 'net.noodl.controls.button' })).toBe(true);
    expect(edits({ id: 'c', type: '/Components/Card' })).toBe(true);
    expect(edits({ id: 'd', type: 'Event Sender' })).toBe(true);
    expect(edits({ id: 'e', type: 'Variable2', metadata: { customState: { of: 'a' } } })).toBe(true);
    expect(edits({ id: 'f', type: 'Expression', metadata: { rule: {} } })).toBe(true);
    expect(edits({ id: 'g', type: 'Static Data' }, '/Option sets/Languages')).toBe(true);
    expect(edits({ id: 'h', type: '/Option sets/Languages' })).toBe(true);
    // Muddy Paws Shelter's parts (the audit §1.3): none of them Studio's
    expect(edits({ id: 'w', type: '/Components/Wording' })).toBe(false);
    expect(edits({ id: 's', type: 'States' }, '/Components/Wording')).toBe(false);
    expect(edits({ id: 'v', type: 'Variable2' }, '/Components/Wording')).toBe(false);
    expect(edits({ id: 'j', type: 'JavaScriptFunction' })).toBe(false);
    expect(edits({ id: 'x', type: 'Expression' })).toBe(false);
    expect(edits({ id: 'k', type: 'Static Data' })).toBe(false);
  });
});

describe('P128 S6 — a question asked from Studio reaches the agent once', () => {
  const ask = (dir: string, ...qs: { id: string; node: string; text: string }[]) => {
    const file = path.join(dir, QUESTIONS_FILE);
    const had = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')).questions : [];
    fs.writeFileSync(file, JSON.stringify({ questions: [...had, ...qs.map((q) => ({ at: '2026-10-27T19:00:00.000Z', component: 'Pages/Home', label: 'Wordings', type: '/Components/Wording', ...q }))] }, null, 2));
  };

  it('each question once, a later one on its own; none, unreadable or absent, is no question', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'p128-questions-'));
    const store = { projectDir: dir };
    expect(questionsSinceSeen(store)).toEqual([]);
    ask(dir, { id: 'q1', node: 'wording', text: 'What is it?' }, { id: 'q2', node: 'wording', text: 'And this?' });
    expect(questionsSinceSeen(store).map((q) => q.id)).toEqual(['q1', 'q2']);
    expect(questionsSinceSeen(store)).toEqual([]);
    ask(dir, { id: 'q3', node: 'wordStates', text: 'The States node?' });
    expect(questionsSinceSeen(store)).toEqual([{ id: 'q3', at: '2026-10-27T19:00:00.000Z', component: 'Pages/Home', node: 'wordStates', label: 'Wordings', type: '/Components/Wording', text: 'The States node?' }]);
    fs.writeFileSync(path.join(dir, QUESTIONS_FILE), '{ not json');
    expect(questionsSinceSeen(store)).toEqual([]);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  describe('through the tool', () => {
    let dir: string;
    let session: TestSession;
    beforeEach(async () => {
      dir = copyFixture();
      session = await connect(dir, true);
      await reveal(session, 'project');
    });
    afterEach(async () => {
      await session.close();
      fs.rmSync(dir, { recursive: true, force: true });
    });

    type Said = { questions?: { id: string; node: string; text: string }[]; note: string };
    it('what_changed_since reports the person’s question and says what to do with it; the next call does not repeat it', async () => {
      const control = await call<Said>(session, 'what_changed_since');
      expect(control.data.questions).toBeUndefined();
      ask(dir, { id: 'q1', node: 'wording', text: "In Studio, on Home, I'm looking at \"Wordings\": what is it?" });
      const first = await call<Said>(session, 'what_changed_since');
      expect(first.data.questions?.map((q) => [q.id, q.node])).toEqual([['q1', 'wording']]);
      expect(first.data.note).toContain('`questions` the person asked you from Studio');
      const again = await call<Said>(session, 'what_changed_since');
      expect(again.data.questions).toBeUndefined();
    });
  });
});
