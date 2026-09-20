/**
 * TVW-009 AC4 — the briefing says the lane is where the stack already is.
 *
 * ## Why this is not left to `instructions.test.ts`
 *
 * That file pins the whole briefing to a byte, which catches a change nobody meant. It
 * cannot catch a change somebody meant and got wrong: delete this sentence, regenerate the
 * fixture in the same commit, and the byte comparison is green again on a briefing that no
 * longer says the thing TVW-009 added. A fixture grades *drift*; only a named assertion
 * grades *presence*. [[a-frozen-fixture-answers-a-different-question-once-its-subject-moves]]
 *
 * ## What the sentence is for
 *
 * FIX-014 gave the server one placement sentence — "the visual tree flows down a left
 * column" — and it reads as a rule about where a stack must GO. TVW-006 then built a
 * structure lane that finds the visual stack wherever it already is. An agent holding
 * FIX-014's sentence as law will move a graph to satisfy a column the editor never
 * required. Both sentences have to be present for either to be read correctly, which is
 * why the control below asserts FIX-014's is still there.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { projectInstructions, type ProjectInstructionOptions } from '../src/instructions';
import { createServer } from '../src/server';
import { copyFixture } from './helpers';

const MODES: ProjectInstructionOptions[] = [
  { projectDir: '/tmp/p', allowWrites: true, deferTools: true },
  { projectDir: '/tmp/p', allowWrites: true, deferTools: false },
  { projectDir: '/tmp/p', allowWrites: false, deferTools: true }
];

const LANE_SENTENCE =
  'The editor draws a structure lane around the visual stack wherever it is; the column is a default, not a rule.';

describe('TVW-009 AC4 — the lane sentence reaches the agent', () => {
  it.each(MODES)('is in the briefing in every mode (allowWrites=$allowWrites deferTools=$deferTools)', (options) => {
    expect(projectInstructions(options)).toContain(LANE_SENTENCE);
  });

  it('sits beside FIX-014s column sentence rather than replacing it', () => {
    // The control. Without it, deleting the column sentence and keeping the lane one would
    // pass — and an agent would be told the column is "a default" with nothing saying what
    // the default IS.
    const text = projectInstructions(MODES[0]);

    expect(text).toContain('LAYOUT: the visual tree flows down a left column');
    expect(text.indexOf('LAYOUT: the visual tree flows down a left column')).toBeLessThan(
      text.indexOf(LANE_SENTENCE)
    );
  });
});

describe('TVW-009 §2.1 — the briefing speaks the vocabulary', () => {
  it.each(MODES)('never says "page component" (allowWrites=$allowWrites deferTools=$deferTools)', (options) => {
    expect(projectInstructions(options)).not.toMatch(/\bpage components?\b/i);
  });

  it('still teaches the registration rule it used those words for', () => {
    // 🔴 The sweep had to keep the lesson. "a page component is only reachable if a Router
    // node lists it" became "a page is only reachable if…"; an assertion that only checked
    // the word was gone would pass just as well on a briefing that dropped the paragraph.
    const text = projectInstructions(MODES[0]);

    expect(text).toContain('a page is only reachable if a Router node lists it');
    expect(text).toContain('build pages around a `Page` node');
  });
});

/**
 * TVW-009 §2.5 — the clause this change DELETED still reaches the agent.
 *
 * 🔴 The lane sentence cost 23 resident tokens against 6 free, and
 * `toolDisclosure.test.ts`'s own header says `SURFACE_TOKEN_BUDGET` must not be
 * renegotiated a third time. So it was funded, not bumped: the briefing's identifier
 * clause was a near-verbatim duplicate of `get_project_info`'s `note` — filed as P77 D48,
 * ~39 tokens, owner NONE since 2026-09-02 — and the sentence before it already told the
 * agent to call that tool first. Surface went 8274 → 8255 with the lane sentence in.
 *
 * That argument is only sound while the other copy exists. Deleting a fact because
 * something else carries it, and never checking that something else, is how a fact leaves
 * the product with a comment claiming it did not. So this asserts the survivor.
 */
describe('TVW-009 §2.5 — the de-duplicated identifier fact survives in the free channel', () => {
  it("is in get_project_info's note, the tool the briefing sends the agent to first", async () => {
    const projectDir = copyFixture();
    const { server } = createServer({ projectDir, allowWrites: true, deferTools: true });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: 'tvw009', version: '0.0.0' });
    await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

    const res = (await client.callTool({ name: 'get_project_info', arguments: {} })) as {
      content: Array<{ type: string; text: string }>;
    };
    const info = JSON.parse(res.content[0].text) as { note?: string };

    await client.close();
    await server.close();

    expect(info.note).toContain('Pages/Home');
    expect(info.note).toContain('legacyName');

    // And the briefing still points at it, which is what makes the note reachable at all.
    expect(projectInstructions(MODES[0])).toContain('Start with get_project_info.');
  });

  it('no longer pays for that fact twice in the resident surface', () => {
    // The control on the deletion itself: were the clause still in the briefing, the
    // funding this change depends on would not exist and the budget arm would be red.
    expect(projectInstructions(MODES[0])).not.toContain('Component identifiers accept path form');
  });
});
