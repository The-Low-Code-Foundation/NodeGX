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

import { stepKindCatalog } from '../../nodegx-backend/src/workflow/steps/kinds';
import { RESULT_SIZE_META_KEY, WHOLE_RESULT_CHARS } from '../src/clientApps';
import { createServer } from '../src/server';
import { copyFixture } from './helpers';

/**
 * Named here, not read from `WHOLE_RESULT_TOOLS`: a spec that loops over the list it checks passes with a tool taken
 * off it (measured: BWF-004's mutant without `list_backend_step_kinds` stayed green).
 */
const MUST_BE_WHOLE = ['get_project_info', 'call_tool', 'list_backend_step_kinds'];

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

/** The tools listed once the backend group is revealed, so `list_backend_step_kinds` is among them. */
async function listed(projectDir: string, clientName: string): Promise<Listed[]> {
  const s = await session(projectDir, clientName);
  try {
    await s.client.callTool({ name: 'find_tools', arguments: { group: 'backend' } });
    return (await s.client.listTools()).tools as Listed[];
  } finally {
    await s.close();
  }
}

describe('P128-S1-PREVIEWCUT — the answer the agent must read whole', () => {
  const dir = copyFixture();

  it('Claude Code is told to keep get_project_info, call_tool and list_backend_step_kinds whole', async () => {
    const tools = await listed(dir, 'claude-code');
    for (const name of MUST_BE_WHOLE) {
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
      for (const name of MUST_BE_WHOLE) {
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

  // P132 BWF-004 AC4: a Claude Code agent asked for a workflow change got the step catalog as "Output too large
  // (53.5KB)" and a 2 KB preview, so it never read `formulaLanguage` and found the formula by trial runs. The tool
  // only forwards the backend's served catalog, so its size is the catalog's.
  it('the step catalog is over Claude Code’s default limit and under the raised one, with room', () => {
    const length = JSON.stringify(stepKindCatalog()).length;
    process.stdout.write(`[previewcut] list_backend_step_kinds ${length.toLocaleString('en-US')} chars\n`);
    expect(length).toBeGreaterThan(CLAUDE_CODE_DEFAULT_CHARS);
    expect(length).toBeLessThan(WHOLE_RESULT_CHARS * 0.8);
  });
});
