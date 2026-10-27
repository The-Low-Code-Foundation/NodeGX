/**
 * P128-S1-PREVIEWCUT — in Claude Code, `get_project_info` arrives whole.
 *
 * Measured first (Claude Code 2.1.251): an MCP text result over 50,000 characters is saved to a file and the agent is
 * shown a 2,000-character preview (`Az=50000`, `$De=2000` in its code; the MCP docs' "MCP output limits and
 * warnings"). `get_project_info` is ~62,000, so a Claude Code agent never saw `readFirst.sections` (P128 S1's rounds;
 * a haiku `claude -p` drive on `templates/todo-list`: "Output too large (61.9KB)", 2,362 characters delivered).
 * The documented door is `_meta["anthropic/maxResultSizeChars"]` on the tool's `tools/list` entry (ceiling 500,000).
 *
 * These specs pin: Claude Code is told on `get_project_info` and on `call_tool` (the door the measured round used);
 * every other client's `tools/list` carries no such key and is otherwise the list Claude Code gets; and the answer
 * itself is over Claude Code's default limit (the reason) and under the raised one, with room (the approach, not
 * only the crossing, is reported).
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

import { RESULT_SIZE_META_KEY, WHOLE_RESULT_CHARS, WHOLE_RESULT_TOOLS } from '../src/clientApps';
import { createServer } from '../src/server';
import { copyFixture } from './helpers';

/** Claude Code's own default save-to-file threshold, 2.1.251 (`Az`). */
const CLAUDE_CODE_DEFAULT_CHARS = 50_000;

async function session(projectDir: string, clientName: string) {
  const { server } = createServer({ projectDir, allowWrites: true });
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: clientName, version: '1.0.0' });
  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);
  return {
    client,
    close: async () => {
      await client.close();
      await server.close();
    }
  };
}

type Listed = { name: string; _meta?: Record<string, unknown> };

async function listed(projectDir: string, clientName: string): Promise<Listed[]> {
  const s = await session(projectDir, clientName);
  try {
    return (await s.client.listTools()).tools as Listed[];
  } finally {
    await s.close();
  }
}

describe('P128-S1-PREVIEWCUT — the answer the agent must read whole', () => {
  const dir = copyFixture();

  it('Claude Code is told to keep get_project_info and call_tool whole', async () => {
    const tools = await listed(dir, 'claude-code');
    for (const name of WHOLE_RESULT_TOOLS) {
      const tool = tools.find((t) => t.name === name);
      expect({ name, limit: tool?._meta?.[RESULT_SIZE_META_KEY] }).toEqual({ name, limit: WHOLE_RESULT_CHARS });
    }
    expect(WHOLE_RESULT_CHARS).toBeLessThanOrEqual(500_000);
  });

  it.each(['cline', 'claude-ai', 'local-agent-mode-nodegx', 'test-client'])(
    '%s gets no such key, and otherwise the same entries as Claude Code',
    async (clientName) => {
      const tools = await listed(dir, clientName);
      expect(JSON.stringify(tools)).not.toContain(RESULT_SIZE_META_KEY);
      const code = await listed(dir, 'claude-code');
      const strip = (t: Listed | undefined) => {
        if (!t) return t;
        const { _meta, ...rest } = t;
        const { [RESULT_SIZE_META_KEY]: _k, ...meta } = _meta ?? {};
        return Object.keys(meta).length > 0 ? { ...rest, _meta: meta } : rest;
      };
      for (const name of WHOLE_RESULT_TOOLS) {
        expect(strip(code.find((t) => t.name === name))).toEqual(tools.find((t) => t.name === name));
      }
    }
  );

  it('the answer is over Claude Code’s default limit and under the raised one, with room', async () => {
    const s = await session(dir, 'claude-code');
    try {
      const direct = await s.client.callTool({ name: 'get_project_info', arguments: {} });
      const viaDoor = await s.client.callTool({ name: 'call_tool', arguments: { name: 'get_project_info' } });
      const chars = (r: unknown) =>
        ((r as { content: { text?: string }[] }).content ?? []).reduce((n, c) => n + (c.text?.length ?? 0), 0);
      const length = chars(direct);
      // Printed on a passing run, so the margin is read before it is gone.
      process.stdout.write(
        `[previewcut] get_project_info ${length.toLocaleString('en-US')} chars; Claude Code's default ` +
          `${CLAUDE_CODE_DEFAULT_CHARS.toLocaleString('en-US')}, raised ${WHOLE_RESULT_CHARS.toLocaleString('en-US')}\n`
      );
      expect(length).toBeGreaterThan(CLAUDE_CODE_DEFAULT_CHARS);
      expect(chars(viaDoor)).toBe(length);
      // At 80% of the raised limit, decide again (move a doctrine body behind `section`, or raise it with a reason).
      expect(length).toBeLessThan(WHOLE_RESULT_CHARS * 0.8);
    } finally {
      await s.close();
    }
  });
});
