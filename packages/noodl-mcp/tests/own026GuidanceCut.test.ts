/**
 * P112-OWN026-GUIDANCECUT — the kit's guidance reaches a reader that sees only the start and the end of a long result.
 *
 * t1-nodegx-2 (2026-10-22): DeepSeek in Cline never saw FIX-01's backend lesson. `get_project_info` was 51,834
 * characters and Cline keeps ~8,000 of a tool result (its start and its end); the lesson sat at character 40,311.
 * These specs read every answer through that cut: 4,000 characters from each end.
 */
import { splitSection, SECTION_PART_CHARS } from '../src/guidance';
import { ELEMENT_STYLE_STARTERS } from '../src/tools/elementStyles';
import type { ToolErrorPayload } from '../src/tools/responses';
import { call, callRawText, connect, copyFixture, TestSession } from './helpers';

const HEAD = 4000;
const TAIL = 4000;
/** What a client that cuts long results in the middle keeps of `text`. */
const kept = (text: string) => (text.length <= HEAD + TAIL ? text : text.slice(0, HEAD) + text.slice(-TAIL));

describe('get_project_info — what costs a rebuild arrives in the first 4,000 characters', () => {
  let session: TestSession;
  beforeAll(async () => {
    session = await connect(copyFixture());
  });
  afterAll(async () => {
    await session.close();
  });

  it('leads with readFirst, inside the start a cut keeps', async () => {
    const text = await callRawText(session, 'get_project_info');
    expect(text.length).toBeGreaterThan(HEAD + TAIL); // the case this exists for
    expect(text.indexOf('"readFirst"')).toBe(1);
    const info = JSON.parse(text);
    expect(JSON.stringify(info.readFirst).length).toBeLessThan(HEAD - 200);
    // the note names the answer's own length, to within the few characters the number itself adds
    const said = Number(/This answer is ([\d,]+) characters/.exec(info.readFirst.note)![1].replace(/,/g, ''));
    expect(Math.abs(said - text.length)).toBeLessThan(16);
  });

  it('the lessons FIX-01 put in the backend doctrine survive the cut — they did not before', async () => {
    const seen = kept(await callRawText(session, 'get_project_info'));
    for (const lesson of ['visualFilter', 'Noodl.Records.increment', 'cloud-shared-counter', 'taken once', 'its own URL']) {
      expect({ lesson, seen: seen.includes(lesson) }).toEqual({ lesson, seen: true });
    }
  });

  it('every field the answer had is still there, unchanged — a reader that sees all of it loses nothing', async () => {
    const info = JSON.parse(await callRawText(session, 'get_project_info'));
    for (const field of ['authoringTraps', 'authoringDoctrine', 'interfaceDoctrine', 'designDoctrine', 'backendDoctrine', 'honesty']) {
      expect(typeof info[field]).not.toBe('undefined');
    }
    expect(Object.keys(info).at(-1)).toBe('moreGuidance');
  });

  it('the end a cut keeps says how to fetch what the middle lost', async () => {
    const text = await callRawText(session, 'get_project_info');
    expect(text.slice(-TAIL)).toContain('section');
  });
});

describe('get_project_info({ section }) — each section alone, in parts that arrive whole', () => {
  let session: TestSession;
  beforeAll(async () => {
    session = await connect(copyFixture());
  });
  afterAll(async () => {
    await session.close();
  });

  it('returns the backend doctrine whole, part by part, each under the cut', async () => {
    const full = JSON.parse(await callRawText(session, 'get_project_info')).backendDoctrine as string;
    let next: string | undefined = 'backend';
    const parts: string[] = [];
    while (next) {
      const raw = await callRawText(session, 'get_project_info', { section: next });
      expect(raw.length).toBeLessThan(HEAD + TAIL);
      const answer = JSON.parse(raw) as { text: string; next?: string; field: string };
      expect(answer.field).toBe('backendDoctrine');
      parts.push(answer.text);
      next = answer.next;
    }
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.join('')).toBe(full);
  });

  it('a short section is one part, with no next', async () => {
    const answer = (await call<{ text: string; next?: string; part?: number }>(session, 'get_project_info', { section: 'authoring' })).data;
    expect(answer.next).toBeUndefined();
    expect(answer.part).toBeUndefined();
    expect(answer.text).toContain('Components are the unit of good work');
  });

  it('a name that is not a section is refused with the names', async () => {
    const res = await call<ToolErrorPayload>(session, 'get_project_info', { section: 'wibble' });
    expect(res.isError).toBe(true);
    expect(res.data.error.message).toContain('traps, authoring, interface, design, backend');
  });

  it('a part past the last is refused with the count', async () => {
    const res = await call<ToolErrorPayload>(session, 'get_project_info', { section: 'authoring/9' });
    expect(res.isError).toBe(true);
    expect(res.data.error.message).toContain('"authoring" has 1 part');
  });
});

describe('splitSection', () => {
  it('splits at headings, keeps every character, and no part is longer than the limit', () => {
    const text = ['## A', 'x'.repeat(2500), '### B', 'y'.repeat(2500), '### C', 'z'.repeat(2500)].join('\n');
    const parts = splitSection(text, SECTION_PART_CHARS);
    expect(parts.length).toBe(2);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(SECTION_PART_CHARS);
    expect(parts[1].startsWith('\n### C')).toBe(true);
    expect(parts.join('')).toBe(text);
  });
  it('a text under the limit is one part', () => {
    expect(splitSection('## A\nshort')).toEqual(['## A\nshort']);
  });
});

describe('get_node_type — a long answer leads each type with how it fails', () => {
  let session: TestSession;
  beforeAll(async () => {
    session = await connect(copyFixture());
  });
  afterAll(async () => {
    await session.close();
  });

  it("each entry: summary and antiPatterns before ports — the round's eight-type ask, read through the cut", async () => {
    const names = ['Group', 'Text', 'net.noodl.controls.button', 'net.noodl.controls.textinput', 'For Each', 'Static Data', 'Component Inputs', 'Component Outputs'];
    const text = await callRawText(session, 'get_node_type', { type_names: names });
    const answer = JSON.parse(text) as { readFirst?: string; types: Array<Record<string, unknown>> };
    expect(text.length).toBeGreaterThan(HEAD + TAIL);
    expect(text.indexOf('"readFirst"')).toBe(1);
    expect(answer.readFirst).toContain('one or two types per call');
    for (const t of answer.types) {
      const keys = Object.keys(t);
      expect(keys.at(-1)).toBe('ports');
      if ('antiPatterns' in t) expect(keys.indexOf('antiPatterns')).toBeLessThan(keys.indexOf('ports'));
    }
  });

  it('one short answer carries no note', async () => {
    const answer = (await call<{ readFirst?: string }>(session, 'get_node_type', { type_names: ['DbModel2'] })).data;
    expect(answer.readFirst).toBeUndefined();
  });

  it("the Record's entry says a page opened by its own URL is read from the backend", async () => {
    const answer = (await call<{ types: Array<{ antiPatterns?: string[] }> }>(session, 'get_node_type', { type_names: ['DbModel2'] })).data;
    expect(answer.types[0].antiPatterns?.join(' ')).toContain('its own URL');
  });
});

describe('P112-OWN026-BUTTON35 — the Button starter is a comfortable touch target', () => {
  it('has a 44 px floor, as a token', () => {
    expect(ELEMENT_STYLE_STARTERS['net.noodl.controls.button'].parameters.minHeight).toBe('var(--space-11)');
  });

  it('set_element_style starter: true writes it, and a project that set its own keeps its own', async () => {
    const session = await connect(copyFixture());
    try {
      await call(session, 'call_tool', { name: 'set_element_style', arguments: { type: 'Button', starter: true } });
      const styles = JSON.parse(require('fs').readFileSync(require('path').join(session.projectDir, 'nodegx.styles.json'), 'utf8'));
      const button = styles.variants.find((v: { typename: string; name?: string }) => v.typename === 'net.noodl.controls.button' && !v.name);
      expect(button.parameters.minHeight).toBe('var(--space-11)');

      await call(session, 'call_tool', { name: 'set_element_style', arguments: { type: 'Button', parameters: { minHeight: 'var(--space-12)' } } });
      await call(session, 'call_tool', { name: 'set_element_style', arguments: { type: 'Button', parameters: { paddingTop: 'var(--space-3)' } } });
      const after = JSON.parse(require('fs').readFileSync(require('path').join(session.projectDir, 'nodegx.styles.json'), 'utf8'));
      const kept = after.variants.find((v: { typename: string; name?: string }) => v.typename === 'net.noodl.controls.button' && !v.name);
      expect(kept.parameters.minHeight).toBe('var(--space-12)');
    } finally {
      await session.close();
    }
  });
});
