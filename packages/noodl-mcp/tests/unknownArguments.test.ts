/**
 * P109-S12 — an argument a tool does not have is refused by name, in that call.
 *
 * The stranger round of ISL-015 (2026-10-03) sent `create_component` the key `visualRoots` — the spelling the
 * `set_visual_roots` plan op uses — holding a JSON string. The tool's key is `visual_roots`; zod stripped the unknown
 * key, the write succeeded with no roots, and nothing said so. These specs go through a real client, so they also pin
 * the assumption `refuseUnknownArguments` rests on: the SDK checks every call's arguments with `validateToolInput`.
 */
import { z } from 'zod';

import type { ToolErrorPayload } from '../src/tools/responses';
import { closestArgument, unknownArgumentKeys } from '../src/tools/unknownArguments';
import { call, connect, copyFixture, exists, TestSession } from './helpers';

const PAD = [{ id: 'pad', type: 'Group' }];

describe('P109-S12 — a misnamed argument is refused by name, not dropped', () => {
  let dir: string;
  let session: TestSession;

  beforeEach(async () => {
    dir = copyFixture();
    session = await connect(dir);
  });
  afterEach(async () => {
    await session.close();
  });

  it("refuses create_component's visualRoots, names visual_roots, and writes nothing — the stranger round's call", async () => {
    const res = await call<ToolErrorPayload>(session, 'create_component', { path: 'Widgets/Pad', nodes: PAD, visualRoots: '["pad"]' });

    expect(res.isError).toBe(true);
    expect(res.data.error.code).toBe('invalid-argument');
    expect(res.data.error.message).toContain('create_component has no argument "visualRoots" (did you mean "visual_roots"?)');
    expect(res.data.error.details).toEqual({ unknownArguments: ['visualRoots'], didYouMean: { visualRoots: 'visual_roots' } });
    expect(exists(dir, 'components/Widgets/Pad/nodes.json')).toBe(false);
  });

  it('writes the same call with the right name — the control', async () => {
    const res = await call<{ created: string }>(session, 'create_component', { path: 'Widgets/Pad', nodes: PAD, visual_roots: ['pad'] });

    expect(res.isError).toBe(false);
    expect(res.data.created).toBe('Widgets/Pad');
    expect(exists(dir, 'components/Widgets/Pad/nodes.json')).toBe(true);
  });

  it('refuses on a read tool too, naming a key it cannot place', async () => {
    const res = await call<ToolErrorPayload>(session, 'get_component', { path: 'App', depth: 2, wibble: true });

    expect(res.isError).toBe(true);
    expect(res.data.error.message).toMatch(/get_component has no argument "depth"(?: \(did you mean "[a-z_]+"\?\))?, "wibble"\./);
  });
});

describe('P109-S12 — the pieces', () => {
  it('reads a stripping object as closed, and leaves an open one alone', () => {
    expect(unknownArgumentKeys(z.object({ a: z.string() }), { a: 'x', b: 1 })).toEqual(['b']);
    expect(unknownArgumentKeys(z.object({ a: z.string() }).strict(), { a: 'x', b: 1 })).toEqual(['b']);
    expect(unknownArgumentKeys(z.object({ a: z.string() }).passthrough(), { a: 'x', b: 1 })).toEqual([]);
    expect(unknownArgumentKeys(z.object({ a: z.string() }).catchall(z.number()), { a: 'x', b: 1 })).toEqual([]);
    expect(unknownArgumentKeys(z.object({ a: z.string() }), undefined)).toEqual([]);
  });

  it('suggests the same letters in another case or separator first, then a near spelling, else nothing', () => {
    expect(closestArgument('visualRoots', ['path', 'nodes', 'visual_roots'])).toBe('visual_roots');
    expect(closestArgument('ifRevision', ['if_revision', 'revision'])).toBe('if_revision');
    expect(closestArgument('pth', ['path', 'nodes'])).toBe('path');
    expect(closestArgument('wibble', ['path', 'nodes'])).toBeUndefined();
  });
});
