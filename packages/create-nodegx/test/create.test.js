'use strict';
/** P112 OWN-011 — `npm create nodegx`. Run: `npm test --workspace create-nodegx`. */
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  AGENT_NOTE,
  CLINE_SERVER_FLAGS,
  CLINE_TIMEOUT_SECONDS,
  MCP_PACKAGE,
  MCP_VERSION,
  OPENCODE_CONFIG,
  VIBE_AGENT,
  VIBE_ALLOWED_TOOLS,
  VIBE_CONFIG,
  VIBE_SERVER_FLAGS,
  clineMcpSettingsPath,
  clineServerEntry,
  coreSkillFiles,
  renderOpenCodeConfig,
  renderVibeConfig,
  serverEntry,
  setUp,
  vibeProfileFiles
} = require('../bin/create-nodegx.js');

const BIN = path.join(__dirname, '..', 'bin', 'create-nodegx.js');
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'create-nodegx-'));
const read = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

test('the pinned server is the version the checkout would publish', () => {
  const mcp = require('../../noodl-mcp/package.json');
  assert.equal(MCP_PACKAGE, mcp.name);
  assert.equal(MCP_VERSION, mcp.version);
});

test('an empty folder gets the bootstrap server, pinned, and the two agent notes', () => {
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(fs.readdirSync(dir).sort(), ['.claude', '.mcp.json', '.vibe', 'AGENTS.md', 'CLAUDE.md', 'opencode.json']);
  const entry = read(path.join(dir, '.mcp.json')).mcpServers.nodegx;
  assert.deepEqual(entry, serverEntry());
  assert.ok(entry.args.includes(`${MCP_PACKAGE}@${MCP_VERSION}`));
  assert.ok(entry.args.includes('--allow-writes'));
  // Bootstrap mode: no project directory, so the agent's create_project makes the app (R8).
  assert.ok(!entry.args.some((a) => path.isAbsolute(a)));
  assert.match(run.stdout, /Say what you want to build/);
  assert.match(run.stdout, /Wrote CLAUDE.md and AGENTS.md/);
});

test('P112-S14-NOTNODEGX: the agent notes say an app here is a NodeGX app, and how a key goes in', () => {
  assert.match(AGENT_NOTE, /build it as a NodeGX app with the `nodegx`\nserver's tools/);
  assert.match(AGENT_NOTE, /Don't\nwrite a separate web server/);
  assert.match(AGENT_NOTE, /`set_function_secret` without a value/);
  assert.match(AGENT_NOTE, /`\.env` file/);
  // P112-OWN023-PHONEPREVIEW: how the app opens on a phone
  assert.match(AGENT_NOTE, /add `--host 0\.0\.0\.0` and open the address it prints on the phone/);
  // P112 OWN-023 round 3: the note names the page a stranger reads instead of the JSON, pinned to the same server
  // version as `.mcp.json`, so the command resolves to a server that has the flag.
  assert.match(AGENT_NOTE, new RegExp(`\`npx -y ${MCP_PACKAGE.replace('/', '\\/')}@${MCP_VERSION.replace(/\\./g, '\\.')} <the app's folder> --graph\``));
  assert.match(AGENT_NOTE, /the tool `read_graph` is the same page/);
});

test('P112 OWN-007 (R3): the folder gets the editor brief as a project skill, named for Claude Code and readable by any agent', () => {
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const skill = path.join(dir, '.claude', 'skills', 'nodegx-your-own-editor', 'SKILL.md');
  assert.ok(fs.existsSync(skill), skill);
  const text = fs.readFileSync(skill, 'utf8');
  // Claude Code lists a project skill by its frontmatter; the name must match its folder.
  assert.match(text, /^---\nname: nodegx-your-own-editor\ndescription: "/);
  assert.match(text, /LOAD when the person asks for an editor/);
  // The brief's spine: the kit, the suite, the traps, what it must not do.
  for (const heading of ['## The kit', '## Done means PASS', '## What the editors before yours got wrong', '## What your editor must not do']) {
    assert.ok(text.includes(`\n${heading}\n`), heading);
  }
  // The kit is written as a copy of profiles/core, so a change there is what ships.
  assert.deepEqual(coreSkillFiles().map((f) => f.to), [path.join('.claude', 'skills', 'nodegx-your-own-editor', 'SKILL.md')]);
  // Every other agent is pointed at the same file from the agent notes.
  assert.match(AGENT_NOTE, /`nodegx-your-own-editor` \(`\.claude\/skills\/nodegx-your-own-editor\/SKILL\.md`\)/);
  // P18 EXP-023: the note says how the person leaves, and that the preflight comes first.
  assert.match(AGENT_NOTE, /`npx @nodegx\/export export <the app's folder> --dry-run` says first what/);
  assert.match(AGENT_NOTE, /`npx nodegx-deploy` \(from `@nodegx\/preview`\)/);
  assert.match(run.stdout, /Wrote \.claude\/skills\/nodegx-your-own-editor\/SKILL\.md/);
});

test('P112 OWN-012 AC4 (R4, teach both equally): the brief teaches the real app and the drawn screen side by side, each with its cost', () => {
  const text = fs.readFileSync(path.join(__dirname, '..', 'profiles', 'core', 'skills', 'nodegx-your-own-editor', 'SKILL.md'), 'utf8');
  const section = text.split('\n### The screen: show it or draw it\n')[1]?.split('\n### ')[0];
  assert.ok(section, 'the brief has a section "The screen: show it or draw it"');
  // both ways, each with what it costs, in one table
  assert.match(section, /\| \| show the real app \| draw it from the descriptions \|/);
  assert.match(section, /\| what it loads \| about 3\.6 MB of scripts .* \| 12\.5 KB gzipped \|/);
  // the drawer's import, the version that has it, and the limits it names
  assert.match(section, /from '@nodegx\/node-spec\/draw'/);
  assert.match(section, /0\.1\.0 has no drawer/);
  for (const limit of ['wraps', 'cssClassName', 'tabular numerals', 'automatic minimum', 'For Each']) assert.ok(section.includes(limit), limit);
  // the old one-way instruction is gone
  assert.doesNotMatch(text, /It doesn't draw the screen\./);
});

test("P112 OWN-007: a person's own skill file is never replaced", () => {
  const dir = tmp();
  const skill = path.join(dir, '.claude', 'skills', 'nodegx-your-own-editor', 'SKILL.md');
  fs.mkdirSync(path.dirname(skill), { recursive: true });
  fs.writeFileSync(skill, 'mine\n');
  assert.deepEqual(setUp(dir).skills, []);
  assert.equal(fs.readFileSync(skill, 'utf8'), 'mine\n');
});

test("a person's own CLAUDE.md or AGENTS.md is never replaced", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'mine\n');
  const result = setUp(dir);
  assert.equal(fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf8'), 'mine\n');
  assert.deepEqual(result.notes, ['AGENTS.md']);
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), AGENT_NOTE);
});

test('Windows spawns npx through cmd /c', () => {
  assert.deepEqual(serverEntry('win32').args.slice(0, 3), ['/c', 'npx', '-y']);
  assert.equal(serverEntry('win32').command, 'cmd');
});

test('another server in .mcp.json is kept, and an existing "nodegx" entry is never replaced', () => {
  const dir = tmp();
  const file = path.join(dir, '.mcp.json');
  fs.writeFileSync(file, JSON.stringify({ mcpServers: { other: { command: 'x' } } }));
  assert.equal(setUp(dir).outcome, 'added');
  assert.deepEqual(Object.keys(read(file).mcpServers), ['other', 'nodegx']);

  const mine = { command: 'my-own-nodegx' };
  fs.writeFileSync(file, JSON.stringify({ mcpServers: { nodegx: mine } }));
  assert.equal(setUp(dir).outcome, 'present');
  assert.deepEqual(read(file).mcpServers.nodegx, mine);
});

test('a .mcp.json that is not JSON is refused and left as it is', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, '.mcp.json'), '{ not json');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /not valid JSON/);
  assert.equal(fs.readFileSync(path.join(dir, '.mcp.json'), 'utf8'), '{ not json');
});

test('the home folder is never touched', () => {
  const home = tmp();
  const dir = path.join(tmp(), 'apps');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8', env: { ...process.env, HOME: home, USERPROFILE: home } });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(fs.readdirSync(home), []);
});

test('P112 OWN-018: Mistral Vibe gets Large 4, the same pinned server, and permission for the bootstrap tools', () => {
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const toml = fs.readFileSync(path.join(dir, VIBE_CONFIG), 'utf8');
  assert.equal(toml, renderVibeConfig());
  // Pinned, never `mistral-large-latest` (a different, older model on 2026-10-12), and set, so Vibe's routed default
  // (a non-Mistral model) never applies.
  assert.match(toml, /^active_model = "mistral-large-4"$/m);
  // P112-OWN026-VIBEMAXTOKENS: without a cap Vibe 3 sends max_tokens ≈ the context (985k) and Mistral refuses it
  assert.match(toml, /^max_output_tokens = 262144$/m);
  assert.match(toml, /^name = "mistral-large-4"$/m);
  // The same registration .mcp.json gets, plus the Vibe profile (OWN-019: worded for a tool list that never changes,
  // and screenshots to files — P112-OWN018-IMAGECACHE: an image in the conversation turns Mistral's cache off).
  const entry = serverEntry();
  assert.ok(toml.includes(`command = ${JSON.stringify(entry.command)}`));
  assert.ok(toml.includes(`args = [${[...entry.args, ...VIBE_SERVER_FLAGS].map((a) => JSON.stringify(a)).join(', ')}]`));
  for (const tool of VIBE_ALLOWED_TOOLS) assert.match(toml, new RegExp(`^\\[tools\\.nodegx_${tool}\\]\\npermission = "always"$`, 'm'));
  // The person is told how to start it, and why the harness matters. P112-OWN026-VIBE3LEGACY: Vibe 3 refuses
  // `--legacy-harness`, so the command is plain `vibe` and the flag is a note for 2.x.
  assert.match(toml, /^#   vibe$/m);
  assert.match(toml, /On Vibe 2\.x, start it with `vibe --legacy-harness` instead/);
  assert.match(run.stdout, /Mistral Vibe: cd .* && vibe \(Vibe 2\.x: vibe --legacy-harness\)/);
  assert.match(run.stdout, /Wrote \.vibe\/config\.toml/);
});

test('P112 OWN-018: the allowed tools are exactly what the bootstrap server advertises', () => {
  // Read off the checkout's manifest, so a tool added to bootstrap mode can't be left out of Vibe's permissions.
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'noodl-mcp', 'src', 'toolGroups.ts'), 'utf8');
  const names = (re) => src.match(re)[1].match(/'([a-z_]+)'/g).map((q) => q.slice(1, -1));
  const bootstrap = names(/export const BOOTSTRAP_TOOLS\b.*?Object\.freeze\(\[([^\]]*)\]/s);
  const extra = names(/export const BOOTSTRAP_ADVERTISED\b.*?\[\.\.\.BOOTSTRAP_TOOLS,([^\]]*)\]/s);
  assert.deepEqual([...VIBE_ALLOWED_TOOLS].sort(), [...bootstrap, ...extra].sort());
});

test("P112 OWN-018: a person's own .vibe/config.toml is never replaced", () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, '.vibe'));
  fs.writeFileSync(path.join(dir, VIBE_CONFIG), 'active_model = "mine"\n');
  assert.equal(setUp(dir).vibe, 'present');
  assert.equal(fs.readFileSync(path.join(dir, VIBE_CONFIG), 'utf8'), 'active_model = "mine"\n');
});

test('P112 OWN-018: on Windows, Vibe spawns npx through cmd /c too', () => {
  assert.match(renderVibeConfig('win32'), /^command = "cmd"$/m);
  assert.match(renderVibeConfig('win32'), /^args = \["\/c", "npx", "-y"/m);
});

test('P112 OWN-018: the agent notes name call_tool for an agent whose tool list never refreshes', () => {
  assert.match(AGENT_NOTE, /call it through `call_tool`/);
  assert.match(AGENT_NOTE, /one component at a time/);
});

test('P112 OWN-018 s2: OpenCode gets the same pinned server, and Large 4 limits that compact before the cache stops without cutting an answer', () => {
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [BIN, dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const config = read(path.join(dir, OPENCODE_CONFIG));
  assert.equal(fs.readFileSync(path.join(dir, OPENCODE_CONFIG), 'utf8'), renderOpenCodeConfig());
  const entry = serverEntry();
  assert.deepEqual(config.mcp.nodegx, { type: 'local', command: [entry.command, ...entry.args, '--screenshots-to-files'], enabled: true });
  // Measured (P112-OWN018-CACHE128K): Mistral caches 70% of a prompt under ~128k tokens and 5% of one over it, so
  // OpenCode should compact first (at context − output ≈ 118k); and output at OpenCode's own ceiling, 32000: at 16384
  // two runs ended on an answer cut off mid-step (finish `length`).
  const limit = config.provider.mistral.models['mistral-large-4'].limit;
  assert.deepEqual(limit, { context: 150000, output: 32000 });
  assert.ok(limit.context - limit.output < 128000);
  // The model stays the person's choice: an OpenCode user on another model is not switched to Mistral.
  assert.equal(config.model, undefined);
  assert.match(run.stdout, /Wrote opencode\.json/);
  assert.match(run.stdout, /OpenCode: cd .* && opencode \(with Mistral: opencode -m mistral\/mistral-large-4\)/);
});

test("P112 OWN-018 s2: a person's own opencode.json is never replaced", () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, OPENCODE_CONFIG), '{"model":"mine"}\n');
  assert.equal(setUp(dir).opencode, 'present');
  assert.equal(fs.readFileSync(path.join(dir, OPENCODE_CONFIG), 'utf8'), '{"model":"mine"}\n');
});

test('P112 OWN-018 s2: the agent notes say try the app from its start page', () => {
  assert.match(AGENT_NOTE, /`drive_page` from the app's start page \(leave out `page`\)/);
});

test('P112 OWN-018 s2: only the Mistral-facing configs send screenshots to files; .mcp.json (Claude) keeps them inline', () => {
  const dir = path.join(tmp(), 'my-apps');
  setUp(dir);
  assert.ok(!read(path.join(dir, '.mcp.json')).mcpServers.nodegx.args.includes('--screenshots-to-files'));
  assert.ok(read(path.join(dir, OPENCODE_CONFIG)).mcp.nodegx.command.includes('--screenshots-to-files'));
  // Vibe's server takes the profile, which implies screenshots to files (noodl-mcp cli.ts).
  assert.match(fs.readFileSync(path.join(dir, VIBE_CONFIG), 'utf8'), /"--profile", "vibe"\]/);
});

test('P112 OWN-019: the Vibe kit writes only Vibe files — its AGENTS.md, the NodeGX agent, and a config that starts it', () => {
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [BIN, dir, '--vibe'], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  // R29: the profile overrides what only suits Claude — no .mcp.json, CLAUDE.md or opencode.json.
  for (const absent of ['.mcp.json', 'CLAUDE.md', OPENCODE_CONFIG]) assert.ok(!fs.existsSync(path.join(dir, absent)), absent);
  const toml = fs.readFileSync(path.join(dir, VIBE_CONFIG), 'utf8');
  assert.equal(toml, renderVibeConfig(process.platform, { profile: 'vibe' }));
  assert.match(toml, new RegExp(`^default_agent = "${VIBE_AGENT}"$`, 'm'));
  // The agent carries tool settings only: Vibe 2.26.1 sends an agent's `instructions` on its unified harness alone,
  // and the kit runs the legacy one — so how to build lives in AGENTS.md, which reaches the model on both (s1 smoke).
  const agent = fs.readFileSync(path.join(dir, '.vibe', 'agents', `${VIBE_AGENT}.toml`), 'utf8');
  assert.match(agent, /^disabled_tools = \["task"\]$/m);
  assert.doesNotMatch(agent, /^instructions =/m);
  const notes = fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8');
  assert.match(notes, /Your tool list will not change/);
  assert.match(notes, /"look": "Lisbon"/);
  // R31 as ruled in s3 (one session, taught): a written process in one session, handing over through the app's
  // docs/NEXT.md only when it must; the lab and a person carry on with nothing but "continue". The lab reads NEXT.md's
  // first line to know when to stop.
  assert.match(notes, /You build the whole app in this session, by a process/);
  assert.match(notes, /`\^# Next session`/);
  assert.match(notes, /write `docs\/NEXT\.md` as `# Done`/);
  assert.match(notes, /about 100 tool calls/);
  assert.match(notes, /REQUEST\.md` — what I asked for, \*\*word for word\*\*/);
  assert.match(notes, /at most four checklist lines and one or two components/);
  for (const skill of ['nodegx-first-day', 'nodegx-sizing-the-work', 'nodegx-when-stuck']) {
    assert.match(notes, new RegExp(`\\*\\*\`${skill}\`\\*\\*`));
    // Vibe 2.26.1 lists a skill only when its frontmatter name matches its folder (SkillMetadata: lowercase, hyphens).
    assert.match(fs.readFileSync(path.join(dir, '.vibe', 'skills', skill, 'SKILL.md'), 'utf8'), new RegExp(`^---\\nname: ${skill}\\n`));
  }
  assert.match(run.stdout, /&& vibe \(Vibe 2\.x: vibe --legacy-harness\)/);
  assert.match(run.stdout, /type \/clear, then "continue"/);
});

test("P112 OWN-019: the Vibe kit never replaces a person's own files", () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, '.vibe', 'agents'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'mine\n');
  fs.writeFileSync(path.join(dir, '.vibe', 'agents', `${VIBE_AGENT}.toml`), 'mine = true\n');
  const result = setUp(dir, process.platform, { profile: 'vibe' });
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), 'mine\n');
  assert.equal(fs.readFileSync(path.join(dir, '.vibe', 'agents', `${VIBE_AGENT}.toml`), 'utf8'), 'mine = true\n');
  // Only what was missing is added (s3: the hook and the skills), never the two files that were there.
  const mine = ['AGENTS.md', path.join('.vibe', 'agents', `${VIBE_AGENT}.toml`)];
  assert.deepEqual(result.written, vibeProfileFiles().map((f) => f.to).filter((to) => !mine.includes(to)));
  assert.ok(result.written.includes(path.join('.vibe', 'skills', 'nodegx-sizing-the-work', 'SKILL.md')));
});

test('P112 OWN-019: the plain kit does not set a default agent (there is no agent file beside it)', () => {
  const dir = path.join(tmp(), 'my-apps');
  setUp(dir);
  assert.doesNotMatch(fs.readFileSync(path.join(dir, VIBE_CONFIG), 'utf8'), /default_agent/);
});

test('P112 OWN-019 s3: the hand-over — at 100 tool calls, or once a session writes docs/NEXT.md, only the notes stay open', () => {
  const dir = path.join(tmp(), 'my-apps');
  assert.equal(spawnSync(process.execPath, [BIN, dir, '--vibe'], { encoding: 'utf8' }).status, 0);
  assert.match(fs.readFileSync(path.join(dir, '.vibe', 'hooks.toml'), 'utf8'), /^type = "pre_tool"\ncommand = "node \.vibe\/hooks\/hand-over\.mjs"$/m);
  const hook = path.join(dir, '.vibe', 'hooks', 'hand-over.mjs');
  // A Vibe session folder as 2.26.1 writes it: messages.jsonl beside meta.json, the folder named for its UTC start.
  const session = path.join(tmp(), 'session_20261013_183638_96a2df7d');
  fs.mkdirSync(session);
  const transcript = path.join(session, 'messages.jsonl');
  fs.writeFileSync(transcript, '');
  const started = Date.now() - 60000;
  fs.writeFileSync(path.join(session, 'meta.json'), JSON.stringify({ start_time: new Date(started).toISOString() }));
  const next = path.join(dir, 'capital-quiz', 'docs', 'NEXT.md');
  fs.mkdirSync(path.dirname(next), { recursive: true });
  const ask = (tool_name, tool_input = {}) => {
    const run = spawnSync(process.execPath, [hook], { cwd: dir, input: JSON.stringify({ session_id: 's', transcript_path: transcript, cwd: dir, tool_name, tool_call_id: 'c', tool_input }), encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    return run.stdout ? JSON.parse(run.stdout).decision : 'allow';
  };
  // A new app (no NEXT.md yet): one session plans and builds — nothing is closed.
  assert.equal(ask('nodegx_create_project', {}), 'allow');
  assert.equal(ask('nodegx_call_tool', { name: 'update_component' }), 'allow');
  assert.equal(ask('nodegx_call_tool', { name: 'drive_page' }), 'allow');
  const turn = (n) => JSON.stringify({ role: 'assistant', content: '', tool_calls: Array.from({ length: n }, (_, i) => ({ id: `t${i}` })) }) + '\n';
  // At 100 tool calls the session is asked to hand over, even before any NEXT.md exists; the notes stay open.
  fs.writeFileSync(transcript, turn(50) + turn(49));
  assert.equal(ask('nodegx_call_tool', { name: 'update_component' }), 'allow');
  fs.appendFileSync(transcript, turn(1));
  assert.equal(ask('nodegx_call_tool', { name: 'update_component' }), 'deny');
  assert.equal(ask('write_file', { file_path: path.join(dir, 'capital-quiz', 'docs', 'PLAN.md') }), 'allow');
  fs.writeFileSync(transcript, '');
  // Control: NEXT.md from an earlier session (written before this one started) closes nothing.
  fs.writeFileSync(next, '# Next session: build part 3\n');
  fs.utimesSync(next, new Date(started - 3600000), new Date(started - 3600000));
  assert.equal(ask('nodegx_call_tool', { name: 'update_component' }), 'allow');
  // This session writes it (a hand-over, or "# Done"): its work is written down, only the notes stay open.
  fs.writeFileSync(next, '# Next session: build part 4\n');
  assert.equal(ask('nodegx_call_tool', { name: 'update_component' }), 'deny');
  assert.equal(ask('todo'), 'deny');
  assert.equal(ask('write_file', { file_path: path.join(dir, 'capital-quiz', 'components', 'x.json') }), 'deny');
  assert.equal(ask('read_file', { file_path: next }), 'allow');
  assert.equal(ask('edit', { file_path: path.join(dir, 'capital-quiz', 'docs', 'CHECKLIST.md') }), 'allow');
  // No meta.json yet: the session folder's own name dates it (UTC), here long before NEXT.md was written.
  fs.rmSync(path.join(session, 'meta.json'));
  assert.equal(ask('nodegx_call_tool', { name: 'drive_page' }), 'deny');
  // A broken call never blocks a person's work.
  assert.equal(spawnSync(process.execPath, [hook], { cwd: dir, input: 'not json', encoding: 'utf8' }).status, 0);
});

test('P112-OWN019-NOTELOOP: after this session writes NEXT.md, three more writes to the notes pass and the fourth is refused', () => {
  const dir = path.join(tmp(), 'my-apps');
  assert.equal(spawnSync(process.execPath, [BIN, dir, '--vibe'], { encoding: 'utf8' }).status, 0);
  assert.match(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), /Write `NEXT\.md` whole, in one `write_file` — never patch it/);
  const hook = path.join(dir, '.vibe', 'hooks', 'hand-over.mjs');
  const session = path.join(tmp(), 'session_20261014_101451_5b6889f3');
  fs.mkdirSync(session);
  const transcript = path.join(session, 'messages.jsonl');
  fs.writeFileSync(transcript, '');
  const started = Date.now() - 60000;
  fs.writeFileSync(path.join(session, 'meta.json'), JSON.stringify({ start_time: new Date(started).toISOString() }));
  const docs = path.join(dir, 'editor', 'docs');
  fs.mkdirSync(docs, { recursive: true });
  const next = path.join(docs, 'NEXT.md');
  const ask = (tool_name, tool_input) => {
    const run = spawnSync(process.execPath, [hook], { cwd: dir, input: JSON.stringify({ session_id: 's', transcript_path: transcript, cwd: dir, tool_name, tool_call_id: 'c', tool_input }), encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr);
    return run.stdout ? JSON.parse(run.stdout).decision : 'allow';
  };
  // Vibe 2.26.1's transcript: the asked-about call is recorded after the hook answers.
  const did = (name, file_path) =>
    fs.appendFileSync(transcript, JSON.stringify({ role: 'assistant', content: '', tool_calls: [{ id: 'x', type: 'function', function: { name, arguments: JSON.stringify({ file_path }) } }] }) + '\n');
  // Control: an earlier session's NEXT.md closes nothing — the notes are open however often they are written.
  fs.writeFileSync(next, '# Next session: prove it\n');
  fs.utimesSync(next, new Date(started - 3600000), new Date(started - 3600000));
  for (let i = 0; i < 6; i++) {
    assert.equal(ask('edit', { file_path: path.join(docs, 'CHECKLIST.md') }), 'allow');
    did('edit', path.join(docs, 'CHECKLIST.md'));
  }
  fs.writeFileSync(transcript, '');
  // This session writes NEXT.md whole; then three more writes to the notes (mark a line, fix a word) pass.
  assert.equal(ask('write_file', { file_path: next }), 'allow');
  did('write_file', next);
  fs.writeFileSync(next, '# Done\n');
  for (const f of ['CHECKLIST.md', 'NEXT.md', 'PLAN.md']) {
    assert.equal(ask('edit', { file_path: path.join(docs, f) }), 'allow');
    did('edit', path.join(docs, f));
  }
  // The fourth is refused, NEXT.md included, and the refusal says why and what to do.
  assert.equal(ask('edit', { file_path: next }), 'deny');
  assert.equal(ask('write_file', { file_path: path.join(docs, 'PLAN.md') }), 'deny');
  const run = spawnSync(process.execPath, [hook], { cwd: dir, input: JSON.stringify({ transcript_path: transcript, cwd: dir, tool_name: 'edit', tool_input: { file_path: next } }), encoding: 'utf8' });
  assert.match(JSON.parse(run.stdout).reason, /^The notes are done: editor\/docs\/NEXT\.md is written/);
  // Reading stays open.
  assert.equal(ask('read_file', { file_path: next }), 'allow');
});

test('P112 OWN-019 (R29): `npm create nodegx-vibe` is create-nodegx --vibe, pinned to the same version', () => {
  const wrapper = path.join(__dirname, '..', 'vibe');
  const pkg = read(path.join(wrapper, 'package.json'));
  const core = read(path.join(__dirname, '..', 'package.json'));
  assert.equal(pkg.name, 'create-nodegx-vibe');
  // One release, one version: the wrapper ships with the core it was tested against (R13), pinned exactly.
  assert.equal(pkg.version, core.version);
  assert.deepEqual(pkg.dependencies, { 'create-nodegx': core.version });
  assert.equal(pkg.license, core.license);
  // Not in create-nodegx's own tarball, and not a workspace (packages/* would take it into the shared lockfile).
  assert.ok(!core.files.includes('vibe'));
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [path.join(wrapper, pkg.bin['create-nodegx-vibe']), dir], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  // The same folder `create-nodegx --vibe` writes, file for file.
  const direct = path.join(tmp(), 'my-apps');
  assert.equal(spawnSync(process.execPath, [BIN, direct, '--vibe'], { encoding: 'utf8' }).status, 0);
  const files = (d) => fs.readdirSync(d, { recursive: true }).sort();
  assert.deepEqual(files(dir), files(direct));
  for (const f of files(dir)) if (fs.statSync(path.join(dir, f)).isFile()) assert.equal(fs.readFileSync(path.join(dir, f), 'utf8'), fs.readFileSync(path.join(direct, f), 'utf8'), f);
  assert.match(run.stdout, /&& vibe \(Vibe 2\.x: vibe --legacy-harness\)/);
});

/** A run of the kit with its own empty home and none of the person's CLINE_* settings. */
const clineEnv = (home, extra = {}) => {
  const env = { ...process.env, HOME: home, USERPROFILE: home, ...extra };
  for (const k of Object.keys(env)) if (k.startsWith('CLINE_') && !(k in extra)) delete env[k];
  return env;
};
const CLINE_FILE = (home) => path.join(home, '.cline', 'data', 'settings', 'cline_mcp_settings.json');

test('P112 OWN-020 (R42): the Cline kit writes AGENTS.md and the skill in the folder, and one "nodegx" entry in Cline\'s MCP file — nothing else in the home', () => {
  const home = tmp();
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [BIN, dir, '--cline'], { encoding: 'utf8', env: clineEnv(home) });
  assert.equal(run.status, 0, run.stderr);
  // R29: the profile drops what only suits other agents. Cline reads AGENTS.md, and lists .claude/skills/ as project skills.
  assert.deepEqual(fs.readdirSync(dir).sort(), ['.claude', 'AGENTS.md']);
  assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), AGENT_NOTE);
  assert.ok(fs.existsSync(path.join(dir, '.claude', 'skills', 'nodegx-your-own-editor', 'SKILL.md')));
  // The one write outside the folder, where cline 3.0.71 / 3.0.73 read it with no CLINE_* variables set.
  assert.deepEqual(fs.readdirSync(home, { recursive: true }).sort(), ['.cline', path.join('.cline', 'data'), path.join('.cline', 'data', 'settings'), path.join('.cline', 'data', 'settings', 'cline_mcp_settings.json')]);
  assert.deepEqual(read(CLINE_FILE(home)), { mcpServers: { nodegx: clineServerEntry() } });
  assert.match(run.stdout, new RegExp(`Wrote ${CLINE_FILE(home).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: Cline's MCP servers`));
  assert.match(run.stdout, /cd .*my-apps && cline\n/);
  assert.match(run.stdout, /cline -P cline-pass -m cline-pass\/deepseek-v4\.1-flash/);
});

test('P112 OWN-020: the Cline entry is the server every OWN-020 round ran — pinned, screenshots to files — with a timeout a cold npx fits in', () => {
  const entry = clineServerEntry();
  const core = serverEntry();
  assert.equal(entry.command, core.command);
  assert.deepEqual(entry.args, [...core.args, '--screenshots-to-files']);
  assert.ok(entry.args.includes(`${MCP_PACKAGE}@${MCP_VERSION}`));
  // Cline's connect timeout is 10 s without one; a first npx took 27.8 s (P112-OWN023-COLDSERVER). Cline clamps 1–3600.
  assert.equal(entry.timeout, CLINE_TIMEOUT_SECONDS);
  assert.ok(CLINE_TIMEOUT_SECONDS >= 60 && CLINE_TIMEOUT_SECONDS <= 3600);
  assert.deepEqual(entry.metadata, { writtenBy: 'create-nodegx' });
  assert.deepEqual(clineServerEntry('win32').args.slice(0, 3), ['/c', 'npx', '-y']);
  assert.deepEqual(CLINE_SERVER_FLAGS, ['--screenshots-to-files']);
});

test('P112 OWN-020: the Cline MCP file is found the way Cline finds it', () => {
  const home = '/h';
  assert.equal(clineMcpSettingsPath({}, home), path.join('/h', '.cline', 'data', 'settings', 'cline_mcp_settings.json'));
  assert.equal(clineMcpSettingsPath({ CLINE_DIR: '/c' }, home), path.join('/c', 'data', 'settings', 'cline_mcp_settings.json'));
  assert.equal(clineMcpSettingsPath({ CLINE_DIR: '/c', CLINE_DATA_DIR: '/d' }, home), path.join('/d', 'settings', 'cline_mcp_settings.json'));
  assert.equal(clineMcpSettingsPath({ CLINE_DATA_DIR: '/d', CLINE_MCP_SETTINGS_PATH: '/m.json' }, home), '/m.json');
  assert.equal(clineMcpSettingsPath({ CLINE_MCP_SETTINGS_PATH: '  ' }, home), path.join('/h', '.cline', 'data', 'settings', 'cline_mcp_settings.json'));
  // And the kit writes where the variable says (the OWN-020 lab sets it).
  const file = path.join(tmp(), 'lab', 'mcp.json');
  const home2 = tmp();
  const run = spawnSync(process.execPath, [BIN, path.join(tmp(), 'apps'), '--cline'], { encoding: 'utf8', env: clineEnv(home2, { CLINE_MCP_SETTINGS_PATH: file }) });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(read(file).mcpServers.nodegx, clineServerEntry());
  assert.deepEqual(fs.readdirSync(home2), []);
});

test("P112 OWN-020 (R42): the person's other Cline servers and settings are kept, and their own \"nodegx\" is never replaced", () => {
  const home = tmp();
  const file = CLINE_FILE(home);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  // The nested shape `cline mcp add` writes (3.0.71), and a top-level key the kit doesn't know.
  const other = { transport: { type: 'stdio', command: 'node', args: ['x.js'] } };
  fs.writeFileSync(file, JSON.stringify({ mcpServers: { other }, extra: 1 }, null, 2));
  let run = spawnSync(process.execPath, [BIN, path.join(tmp(), 'a'), '--cline'], { encoding: 'utf8', env: clineEnv(home) });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(read(file), { mcpServers: { other, nodegx: clineServerEntry() }, extra: 1 });
  assert.match(run.stdout, /Added the NodeGX server to Cline .* Your other servers there are as they were/);
  // Run again: the same entry, nothing changes.
  run = spawnSync(process.execPath, [BIN, path.join(tmp(), 'b'), '--cline'], { encoding: 'utf8', env: clineEnv(home) });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Cline already has this release's NodeGX server/);
  // The person's own "nodegx" (no kit mark) is left as it is, and they are told what it is.
  const mine = { transport: { type: 'stdio', command: 'my-own-nodegx', args: ['--x'] } };
  fs.writeFileSync(file, JSON.stringify({ mcpServers: { nodegx: mine } }));
  run = spawnSync(process.execPath, [BIN, path.join(tmp(), 'c'), '--cline'], { encoding: 'utf8', env: clineEnv(home) });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(read(file), { mcpServers: { nodegx: mine } });
  assert.match(run.stdout, /already has a "nodegx" server of your own/);
});

test("P112 OWN-020: the kit's own Cline entry from another release is moved to this release's server", () => {
  const home = tmp();
  const file = CLINE_FILE(home);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const old = { ...clineServerEntry(), args: ['-y', `${MCP_PACKAGE}@0.0.1`, '--allow-writes', '--screenshots-to-files'] };
  fs.writeFileSync(file, JSON.stringify({ mcpServers: { a: { command: 'a' }, nodegx: old } }));
  const run = spawnSync(process.execPath, [BIN, path.join(tmp(), 'apps'), '--cline'], { encoding: 'utf8', env: clineEnv(home) });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(read(file), { mcpServers: { a: { command: 'a' }, nodegx: clineServerEntry() } });
  assert.match(run.stdout, /Moved the "nodegx" server this kit wrote earlier/);
});

test("P112 OWN-020: a Cline MCP file that isn't JSON is refused before anything is written", () => {
  const home = tmp();
  const file = CLINE_FILE(home);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, '{ not json');
  const dir = path.join(tmp(), 'apps');
  const run = spawnSync(process.execPath, [BIN, dir, '--cline'], { encoding: 'utf8', env: clineEnv(home) });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /Cline's MCP servers\) is not valid JSON .* nothing was written/);
  assert.equal(fs.readFileSync(file, 'utf8'), '{ not json');
  assert.deepEqual(fs.readdirSync(dir), []);
  assert.deepEqual(fs.readdirSync(path.dirname(file)), ['cline_mcp_settings.json']);
});

test('P112 OWN-020: one kit at a time', () => {
  const run = spawnSync(process.execPath, [BIN, path.join(tmp(), 'apps'), '--vibe', '--cline'], { encoding: 'utf8', env: clineEnv(tmp()) });
  assert.equal(run.status, 1);
  assert.match(run.stderr, /one kit at a time/);
});

test('P112 OWN-020 (R41): `npm create nodegx-cline` is create-nodegx --cline, pinned to the same version', () => {
  const wrapper = path.join(__dirname, '..', 'cline');
  const pkg = read(path.join(wrapper, 'package.json'));
  const core = read(path.join(__dirname, '..', 'package.json'));
  assert.equal(pkg.name, 'create-nodegx-cline');
  assert.equal(pkg.version, core.version);
  assert.deepEqual(pkg.dependencies, { 'create-nodegx': core.version });
  assert.equal(pkg.license, core.license);
  assert.ok(!core.files.includes('cline'));
  assert.ok(fs.existsSync(path.join(wrapper, 'LICENSE')));
  const home = tmp();
  const dir = path.join(tmp(), 'my-apps');
  const run = spawnSync(process.execPath, [path.join(wrapper, pkg.bin['create-nodegx-cline']), dir], { encoding: 'utf8', env: clineEnv(home) });
  assert.equal(run.status, 0, run.stderr);
  const directHome = tmp();
  const direct = path.join(tmp(), 'my-apps');
  assert.equal(spawnSync(process.execPath, [BIN, direct, '--cline'], { encoding: 'utf8', env: clineEnv(directHome) }).status, 0);
  const files = (d) => fs.readdirSync(d, { recursive: true }).sort();
  assert.deepEqual(files(dir), files(direct));
  for (const f of files(dir)) if (fs.statSync(path.join(dir, f)).isFile()) assert.equal(fs.readFileSync(path.join(dir, f), 'utf8'), fs.readFileSync(path.join(direct, f), 'utf8'), f);
  assert.deepEqual(read(CLINE_FILE(home)), read(CLINE_FILE(directHome)));
  assert.match(run.stdout, /&& cline\n/);
});
