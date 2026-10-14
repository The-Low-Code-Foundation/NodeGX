/**
 * P112 OWN-018 s2 (P112-OWN018-SUMMARYLOSS) — the project's agent notes send an agent back to the person's own words.
 *
 * Mistral Large 4's quiz (run 7, OpenCode): the conversation was summarised, the summary kept "Portugal → Lisbon, three
 * answers in exact order" and dropped the answers, and the agent rebuilt them from memory — Porto / Lisbon / Madrid.
 * `create_project` had quoted the request word for word in `docs/decisions/000-initial-scope.md` all along. The notes
 * (`AGENTS.md`, `CLAUDE.md`) are read into the system prompt, which no summary rewrites, so they carry the pointer.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { writeAgentConfig } from '../src/project/agentConfig';

describe('P112 OWN-018 — the notes point at the verbatim request', () => {
  it.each(['AGENTS.md', 'CLAUDE.md'])('🔴 %s names the quote and says to re-read it after a summary', async (file) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own018-verbatim-'));
    await writeAgentConfig({ projectDir: dir, projectName: 'Capital Quiz', hasDocs: true, registration: null });
    const text = fs.readFileSync(path.join(dir, file), 'utf8');
    expect(text).toContain('quoted word for word in `docs/decisions/000-initial-scope.md`');
    expect(text).toMatch(/read it again after\s+your conversation has been summarised/);
  });

  it('🟢 control: a project without docs/ is not pointed at a file it does not have', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own018-verbatim-'));
    await writeAgentConfig({ projectDir: dir, projectName: 'Capital Quiz', hasDocs: false, registration: null });
    expect(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8')).not.toContain('000-initial-scope.md');
  });
});
