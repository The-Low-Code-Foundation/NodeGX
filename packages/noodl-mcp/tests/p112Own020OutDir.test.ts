/**
 * P112-OWN020-OUTDIRANYWHERE — `render_report` and `drive_page` write screenshots only inside the project.
 *
 * Measured (OWN-020 UI-2): DeepSeek V4.1 Flash sent `drive_page({ out_dir: "/tmp/opentune-shots", … })`, the server
 * wrote `/tmp/opentune-shots/nav-360-before.png`, and the agent's own file tool, sealed to the work folder, could not
 * open what it had just asked for. On a person's machine nothing refuses, and a file of the same name there is
 * replaced. Every other write this server makes stays in the project.
 *
 * The render CLI is a stub (`NODEGX_RENDER_CLI`, the seam FLD-011 uses) that records its argv: a refusal is graded as
 * "the CLI never ran", and a relative `out_dir` by the path the CLI was handed.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import { connect, copyFixture, reveal, type TestSession } from './helpers';
import { screenshotDir } from '../src/tools/renderTools';

interface RawResult {
  isError?: boolean;
  content: Array<{ type: string; text?: string }>;
}

const REPORT = {
  ok: true,
  viewports: { desktop: { requested: { width: 1280, height: 900 }, layoutWidth: 1280, clientWidth: 1280 } },
  pages: [],
  findings: [],
  summary: 'Rendered clean.'
};

function stubCli(argvLog: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own020-cli-'));
  const file = path.join(dir, 'stub-cli.js');
  fs.writeFileSync(file, `require('fs').writeFileSync(${JSON.stringify(argvLog)}, JSON.stringify(process.argv.slice(2)));\nconsole.log(${JSON.stringify(JSON.stringify(REPORT))});\n`);
  return file;
}

describe('P112-OWN020-OUTDIRANYWHERE — screenshots stay in the project', () => {
  let session: TestSession | undefined;
  let projectDir: string;
  let argvLog: string;
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'opentune-shots-'));
  const originalCli = process.env.NODEGX_RENDER_CLI;

  beforeEach(async () => {
    argvLog = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'own020-argv-')), 'argv.json');
    process.env.NODEGX_RENDER_CLI = stubCli(argvLog);
    projectDir = copyFixture();
    session = await connect(projectDir, true);
    await reveal(session, 'explore'); // drive_page is in it
  });

  afterEach(async () => {
    await session?.close();
    session = undefined;
    if (originalCli === undefined) delete process.env.NODEGX_RENDER_CLI;
    else process.env.NODEGX_RENDER_CLI = originalCli;
  });

  const callTool = async (name: string, args: Record<string, unknown>) =>
    (await session!.client.callTool({ name, arguments: args })) as RawResult;
  /** A refusal's own sentence (the server answers `{ error: { code, message } }`). */
  const refusal = (r: RawResult): string => JSON.parse(r.content.map((c) => c.text ?? '').join('')).error.message;

  it('render_report with an out_dir outside the project is refused by name, and the render never runs', async () => {
    const r = await callTool('render_report', { out_dir: outside });
    expect(r.isError).toBe(true);
    expect(refusal(r)).toContain(`out_dir "${outside}" is outside this project`);
    expect(fs.existsSync(argvLog)).toBe(false);
    expect(fs.readdirSync(outside)).toEqual([]);
  });

  it('drive_page the same, as in the measured round', async () => {
    const r = await callTool('drive_page', { out_dir: outside, steps: [{ screenshot: 'nav-360-before' }] });
    expect(r.isError).toBe(true);
    expect(refusal(r)).toContain('is outside this project');
    expect(fs.readdirSync(outside)).toEqual([]);
  });

  it('a relative out_dir lands inside the project, read against the project and not the server’s folder', async () => {
    const r = await callTool('render_report', { out_dir: '.previews/shots' });
    expect(r.isError).toBeFalsy();
    const argv: string[] = JSON.parse(fs.readFileSync(argvLog, 'utf8'));
    const out = argv[argv.indexOf('--out-dir') + 1];
    expect(out.endsWith(path.join('.previews', 'shots'))).toBe(true);
    expect(fs.realpathSync(path.dirname(path.dirname(out)))).toBe(fs.realpathSync(projectDir));
  });

  it('an out_dir that climbs out with "..", and a link in the project that leads out, are outside', () => {
    expect(() => screenshotDir(projectDir, '../elsewhere')).toThrow(/is outside this project/);
    fs.symlinkSync(outside, path.join(projectDir, 'escape'));
    expect(() => screenshotDir(projectDir, 'escape/shots')).toThrow(/is outside this project/);
    // An absolute path that IS in the project is fine, by either spelling of the folder.
    expect(screenshotDir(projectDir, path.join(projectDir, 'shots'))).toBe(path.join(projectDir, 'shots'));
    expect(screenshotDir(fs.realpathSync(projectDir), path.join(projectDir, 'shots'))).toBe(path.join(projectDir, 'shots'));
  });
});
