/**
 * P109 S13-FINDTOOLSPHRASE — a multi-word `find_tools` query is tried word by word when the phrase finds nothing.
 *
 * The two queries are the ones two agents really sent over the stdio door (ISL-016 AC6 s13, ISL-021 AC6 s14), and
 * both revealed nothing. The census is the widening's cost, in groups, for the multi-word queries a model writes;
 * the controls are the DEF-006 (b) rule that a widening must not reveal everything.
 */
import { call, connect, copyFixture } from './helpers';
import type { FindToolsResponse } from '../src/tools/responses';
import { TOOL_GROUPS } from '../src/toolGroups';

async function find(query: string): Promise<string[]> {
  const s = await connect(copyFixture());
  try {
    const found = await call<FindToolsResponse>(s, 'find_tools', { query });
    return found.data.revealed;
  } finally {
    await s.close();
  }
}

/** The deferred groups a reveal touched, by id. */
function groupsOf(revealed: string[]): string[] {
  return TOOL_GROUPS.filter((g) => g.tools.some((t) => revealed.includes(t))).map((g) => g.id);
}

describe('P109 S13-FINDTOOLSPHRASE — find_tools reads a sentence’s worth of words', () => {
  it('the ISL-016 agent’s query finds set_project_settings', async () => {
    expect((await find('project settings home title')).includes('set_project_settings')).toBe(true);
  });

  it('the ISL-021 agent’s query finds drive_page', async () => {
    expect((await find('nodegx interact click type fill test runtime')).includes('drive_page')).toBe(true);
  });

  it('a phrase that matches as a phrase is answered by the phrase alone', async () => {
    // "test the page" is an explore keyword verbatim; the word "page" must not widen it further.
    expect(groupsOf(await find('test the page'))).toEqual(['explore']);
  });

  it('census: what a multi-word query reveals, in groups — never more than two', async () => {
    const census: Record<string, string[]> = {};
    for (const q of [
      'project settings home title',
      'nodegx interact click type fill test runtime',
      'change the colour palette and fonts',
      'create a new collection with roles',
      'list all the components in this project',
      'export the project to react code',
      'press a button and read a variable'
    ]) {
      census[q] = groupsOf(await find(q));
    }
    // Read once (s14) and pinned: a change to the manifest moves this, and the move is the thing to look at.
    expect(Object.values(census).every((g) => g.length <= 2)).toBe(true);
    expect(census).toEqual({
      'project settings home title': ['project'],
      'nodegx interact click type fill test runtime': ['backend', 'explore'],
      'change the colour palette and fonts': ['theme'],
      'create a new collection with roles': ['backend'],
      // "list" and "project" are in three or more groups; "components" is in core, which is never deferred.
      'list all the components in this project': [],
      'export the project to react code': ['project'],
      'press a button and read a variable': ['explore']
    });
  });

  it('🔴 control: nonsense, a foreign product and words found in three or more groups reveal nothing', async () => {
    for (const query of ['zzzznotathing', 'photoshop', 'send a fax', 'create list export project']) {
      expect({ query, revealed: await find(query) }).toEqual({ query, revealed: [] });
    }
  });
});
