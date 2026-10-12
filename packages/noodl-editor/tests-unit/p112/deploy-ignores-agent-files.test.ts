/**
 * P112-S13-AGENTFILES — a deploy does not publish the agent's files.
 *
 * `create_project` writes `.mcp.json` and `CLAUDE.md` into every project. Deploying a project the npm kit made, with
 * the engine `@nodegx/preview@0.1.0` ships, copied both into the public folder: the server command with this
 * machine's path to the project, and the whole brief. The default rules are the one list the editor's Deploy button
 * and the npm engine share, so they are graded here.
 */
import { buildIgnoreMatcher } from '../../src/editor/src/utils/compilation/build/ignore';

describe('P112-S13-AGENTFILES — the default deploy rules', () => {
  const matcher = buildIgnoreMatcher({ isV2Project: true, ignoreFileContent: null });

  it.each(['.mcp.json', 'CLAUDE.md', 'AGENTS.md', '.claude/settings.json'])('🔴 excludes %s', (file) => {
    expect(matcher.match(file).ignored).toBe(true);
  });

  it('control: the files a deployed app needs are still copied', () => {
    for (const file of ['index.html', 'favicon.png', 'assets/logo.svg', 'fonts/Inter.woff2']) {
      expect(matcher.match(file).ignored).toBe(false);
    }
  });
});
