/**
 * P112 OWN-015 — P112-S14-DETACHEDVISUAL: a visual node left outside the visual tree passed the checker and was never
 * mounted.
 *
 * The stranger round's `PhraseRow` held a hidden `Video` (its audio player) with no parent beside
 * `visualRoots: ["row"]`; `validate_project` said 0 errors and the tap played nothing. Graded through
 * `validate_component` (the on-disk door) and `create_component` (the write door, where it must warn and still write),
 * each beside the same component with the Video under the row, and with a parentless logic node, which draws nothing
 * by design and must not be named.
 */
import * as fs from 'fs';
import * as path from 'path';

import type { ValidateComponentResponse } from '../src/tools/responses';
import { call, connect, copyFixture, TestSession } from './helpers';

jest.setTimeout(60000);

const CODE = 'detached-visual-node';

function phraseRow(videoUnderRow: boolean) {
  return [
    { id: 'row', type: 'Group', label: 'Row', children: videoUnderRow ? ['word', 'player'] : ['word'] },
    { id: 'word', type: 'Text', parent: 'row', parameters: { text: 'Bonjour' } },
    {
      id: 'player',
      type: 'Video',
      label: 'Hidden audio player',
      ...(videoUnderRow ? { parent: 'row' } : {}),
      parameters: { opacity: 0 }
    },
    { id: 'said', type: 'String', label: 'Last phrase', parameters: { value: '' } }
  ];
}

describe('OWN-015 DETACHEDVISUAL — a visual node no root reaches is named', () => {
  let dir: string;
  let session: TestSession;

  beforeAll(async () => {
    dir = copyFixture();
    session = await connect(dir);
  });

  afterAll(async () => {
    await session?.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const detached = (diagnostics: Array<{ code: string; severity: string; location?: { nodeId?: string }; message: string; suggestion?: unknown }>) =>
    diagnostics.filter((d) => d.code === CODE);

  it('create_component warns on the Video outside the tree, writes anyway, and says where to put it', async () => {
    const res = await call<{ created: string; warnings?: unknown; diagnostics?: unknown }>(session, 'create_component', {
      path: 'Components/PhraseRow',
      nodes: phraseRow(false),
      visual_roots: ['row']
    });
    expect(res.isError).toBe(false);
    expect(res.data.created).toBe('Components/PhraseRow');
    const text = JSON.stringify(res.data);
    expect(text).toContain(CODE);
    expect(text).toContain('Hidden audio player');
    expect(text).toContain('Put \\"Hidden audio player\\" under \\"Row\\"');
  });

  it('validate_component names exactly the Video — not the String beside it, not the row', async () => {
    const v = await call<ValidateComponentResponse>(session, 'validate_component', { path: 'Components/PhraseRow' });
    expect(v.isError).toBe(false);
    const found = detached(v.data.diagnostics ?? []);
    expect(found.map((d) => `${d.severity}:${d.location?.nodeId}`)).toEqual(['warning:player']);
    expect(found[0].message).toMatch(/never drawn/);
  });

  it('known-good: the same component with the Video under the row has no such warning', async () => {
    const res = await call(session, 'create_component', {
      path: 'Components/PhraseRowFixed',
      nodes: phraseRow(true),
      visual_roots: ['row']
    });
    expect(res.isError).toBe(false);
    const v = await call<ValidateComponentResponse>(session, 'validate_component', { path: 'Components/PhraseRowFixed' });
    expect(detached(v.data.diagnostics ?? [])).toEqual([]);
  });

  it('known-good: roots derived by the door (no visual_roots passed) list every parentless visual node, so nothing is named', async () => {
    const res = await call<{ visualRoots?: string[] }>(session, 'create_component', {
      path: 'Components/PhraseRowDerived',
      nodes: phraseRow(false)
    });
    expect(res.isError).toBe(false);
    // Ids are remapped here (the earlier components hold `row` and `player`), so read them from the result.
    expect(res.data.visualRoots).toHaveLength(2);
    expect(res.data.visualRoots!.map((id) => id.replace(/-\d+$/, ''))).toEqual(['row', 'player']);
    const v = await call<ValidateComponentResponse>(session, 'validate_component', { path: 'Components/PhraseRowDerived' });
    expect(detached(v.data.diagnostics ?? [])).toEqual([]);
    // The fixture is read back, not trusted: the derived list is on disk.
    const nodes = JSON.parse(fs.readFileSync(path.join(dir, 'components', 'Components', 'PhraseRowDerived', 'nodes.json'), 'utf8'));
    expect(nodes.visualRoots).toEqual(res.data.visualRoots);
  });
});
