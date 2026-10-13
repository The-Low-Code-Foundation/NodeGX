/**
 * P112 OWN-019 (R29) — `--profile vibe`: what this server tells an agent, worded for a client whose tool list never
 * changes and whose model pays for every image it opens (Mistral Large 4 in Vibe; `src/clientProfile.ts`).
 *
 * The OWN-019 census (s1) found the sentences that assume Claude Code: tools that "arrive in your next tool list",
 * `find_tools` reveals, and "look at the screenshots". Graded here on everything an agent reads in a Vibe session —
 * the unbound briefing and tool list (which Vibe keeps all session), the bound briefing, `get_project_info`'s
 * doctrine, a reveal's note — with the default profile as the control: the same phrases ARE there without the
 * profile, so an empty search below is the profile's doing, not a phrase nobody sends.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { clientProfile, setClientProfile } from '../src/clientProfile';
import { BOOTSTRAP_INSTRUCTIONS, bootstrapInstructions } from '../src/instructions';
import { createServer, type ServerOptions } from '../src/server';
import { firstFrameNote } from '../src/tools/renderTools';
import { copyFixture } from './helpers';

/** What a static-list, image-costly client must never be told. */
const CLAUDE_ONLY = [
  /arrives? in (your next tool list|this same conversation|the same conversation)/i,
  /arrives once there is a project/i,
  /LOOK AT THE SCREENSHOTS/,
  /look at the screenshots?/i,
  /find_tools\([^)]*\) (reveals|to reveal)/i,
  /they arrive in your next/i
];

async function session(options: ServerOptions) {
  const { server } = createServer(options);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'own019-test', version: '0.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  const texts: string[] = [client.getInstructions() ?? ''];
  const tools = await client.listTools();
  for (const t of tools.tools) texts.push(t.description ?? '');
  return { client, server, texts };
}

async function callText(client: Client, name: string, args: Record<string, unknown> = {}): Promise<string> {
  const r = (await client.callTool({ name, arguments: args })) as { content: Array<{ type: string; text?: string }> };
  return r.content.map((c) => c.text ?? '').join('\n');
}

/** Everything a Vibe session reads: unbound briefing + list, then bound briefing, doctrine, a reveal's note. */
async function whatTheAgentReads(profile: ServerOptions['profile']): Promise<string> {
  const unbound = await session({ allowWrites: true, profile });
  await unbound.client.close();
  await unbound.server.close();
  const bound = await session({ projectDir: copyFixture(), allowWrites: true, deferTools: true, profile });
  const info = await callText(bound.client, 'get_project_info');
  const reveal = await callText(bound.client, 'find_tools', { group: 'theme' });
  await bound.client.close();
  await bound.server.close();
  return [...unbound.texts, ...bound.texts, info, reveal, firstFrameNote()].join('\n\n');
}

afterEach(() => setClientProfile(undefined));

describe('OWN-019 — the Vibe profile', () => {
  it('the control: without the profile, the Claude-worded phrases are there', async () => {
    const read = await whatTheAgentReads(undefined);
    const found = CLAUDE_ONLY.filter((re) => re.test(read)).map(String);
    expect(found.length).toBeGreaterThanOrEqual(4);
    // The doctrine really arrived (an empty get_project_info would make the Vibe arm's absence meaningless).
    expect(read).toContain('Verify by looking. Call `render_report`');
  });

  it('with --profile vibe, none of them is sent, and call_tool is named in both briefings', async () => {
    const read = await whatTheAgentReads('vibe');
    expect(CLAUDE_ONLY.filter((re) => re.test(read)).map(String)).toEqual([]);
    // …and the doctrine arrived, reworded (the swaps applied rather than the text going missing).
    expect(read).toContain('Verify, then prove. Call `render_report`');
    expect(read).toContain('through `call_tool({ name, arguments })`, like every tool not in your list');

    const unbound = await session({ allowWrites: true, profile: 'vibe' });
    const bound = await session({ projectDir: copyFixture(), allowWrites: true, profile: 'vibe' });
    expect({ unbound: unbound.texts[0].includes('call_tool'), bound: bound.texts[0].startsWith('YOUR TOOL LIST WILL NOT CHANGE') }).toEqual({
      unbound: true,
      bound: true
    });
    for (const s of [unbound, bound]) {
      await s.client.close();
      await s.server.close();
    }
  });

  it('the default unbound briefing is unchanged byte for byte; the Vibe one is built from it', () => {
    setClientProfile(undefined);
    expect(bootstrapInstructions()).toBe(BOOTSTRAP_INSTRUCTIONS);
    setClientProfile('vibe');
    const vibe = bootstrapInstructions();
    expect(vibe).not.toBe(BOOTSTRAP_INSTRUCTIONS);
    expect(vibe.slice(0, 200)).toBe(BOOTSTRAP_INSTRUCTIONS.slice(0, 200));
  });

  it('a second server without the profile gets the default back', () => {
    createServer({ allowWrites: true, profile: 'vibe' });
    expect(clientProfile().name).toBe('vibe');
    createServer({ allowWrites: true });
    expect(clientProfile().name).toBe('default');
  });
});
