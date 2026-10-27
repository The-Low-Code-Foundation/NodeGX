/**
 * CLI entry: `noodl-mcp [project-dir] [--allow-writes]`
 * Speaks MCP over stdio. All human-facing output goes to stderr — stdout is
 * the protocol channel.
 *
 * BST-001 — the project directory is optional. With none, the server starts in
 * bootstrap mode: the tools that need no project, and a briefing for an agent
 * that has not got one. Zero positionals used to be the usage-and-exit-2 branch,
 * so {@link USAGE} is where somebody first reads that the mode exists — which is
 * why it says what zero means rather than only what one means.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as os from 'os';
import * as path from 'path';

import { reapOrphanedBackends } from './backend/reaper';
import { CLIENT_PROFILES, isClientProfileName } from './clientProfile';
import { ToolError } from './errors';
import { runGraphCli } from './graphText';
import { parseReproducibleFlag, type ReproducibleOutput } from './project/writeClock';
import { createServer } from './server';
import { clientLabel } from './studio/companion';
import { findStudioApp, launchStudioApp, STUDIO_DOWNLOAD_URL, STUDIO_URL_SCHEME } from './studio/studioApp';
import { startStudioProxy } from './studio/studioProxy';
import { BOOTSTRAP_ADVERTISED } from './toolGroups';
import { USAGE } from './usage';

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    process.stderr.write(USAGE);
    return;
  }
  if (argv.includes('--version')) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    process.stderr.write(require('../package.json').version + '\n');
    return;
  }

  const allowWrites = argv.includes('--allow-writes');
  const deferTools = !argv.includes('--all-tools');
  // P112 OWN-019 — `--profile <client>` or `--profile=<client>` (`clientProfile.ts`).
  const profileAt = argv.findIndex((a) => a === '--profile' || a.startsWith('--profile='));
  const profileValueAt = profileAt >= 0 && argv[profileAt] === '--profile' ? profileAt + 1 : -1;
  const profileName =
    profileAt < 0 ? 'default' : argv[profileAt] === '--profile' ? argv[profileValueAt] ?? '' : argv[profileAt].slice('--profile='.length);
  if (!isClientProfileName(profileName)) {
    process.stderr.write(`noodl-mcp: --profile takes one of ${CLIENT_PROFILES.join(', ')}; got "${profileName}"\n`);
    process.exitCode = 2;
    return;
  }
  const screenshotsToFiles = argv.includes('--screenshots-to-files') || profileName === 'vibe';
  // P109 ISL-019 — `--reproducible <namespace>@<epoch>` or `--reproducible=<namespace>@<epoch>`.
  let reproducible: ReproducibleOutput | undefined;
  const reproducibleAt = argv.findIndex((a) => a === '--reproducible' || a.startsWith('--reproducible='));
  let reproducibleValueAt = -1;
  if (reproducibleAt >= 0) {
    const flag = argv[reproducibleAt];
    if (flag === '--reproducible') reproducibleValueAt = reproducibleAt + 1;
    const value = flag === '--reproducible' ? argv[reproducibleValueAt] ?? '' : flag.slice('--reproducible='.length);
    try {
      reproducible = parseReproducibleFlag(value);
    } catch (err) {
      process.stderr.write(`noodl-mcp: ${(err as Error).message}\n`);
      process.exitCode = 2;
      return;
    }
  }
  const positional = argv.filter((a, i) => !a.startsWith('--') && i !== reproducibleValueAt && i !== profileValueAt);
  // P112 OWN-023 round 3 — `--graph`: the project as text, to stdout, and out. Before the orphan sweep on purpose:
  // a read that kills a running backend is not a read. stdout is free here because no protocol is spoken.
  const graphExit = runGraphCli(
    argv,
    positional,
    (t) => process.stdout.write(t),
    (t) => process.stderr.write(t)
  );
  if (graphExit !== undefined) {
    process.exitCode = graphExit;
    return;
  }
  // BST-001 — zero is bootstrap mode, one is a served project, two is still a
  // mistake. `createServer` refuses zero-without---allow-writes with a message
  // naming the flag, rather than this branch printing the whole usage at
  // somebody who got one thing wrong.
  if (positional.length > 1) {
    process.stderr.write(USAGE);
    process.exitCode = 2;
    return;
  }

  // AAQ-011/F13 — reap first, serve second.
  //
  // This process may spawn backends, and it is the worst spawner in the product
  // for orphaning them: no window to close, no quit event, and a client that can
  // SIGKILL it at any moment. Startup is the one reliable moment we get, so a
  // dead session's backends are cleaned up before this one adds any of its own.
  // Deliberately awaited (a sweep is milliseconds unless something needs
  // killing) and deliberately never fatal: a reaper that cannot start a server
  // is worse than one that misses a process. It reports to stderr because stdout
  // is the MCP protocol channel.
  try {
    const reaped = (await reapOrphanedBackends()).filter((row) => row.outcome !== 'owner-alive' && row.outcome !== 'self');
    for (const row of reaped) {
      process.stderr.write(
        `noodl-mcp: orphaned backend "${row.backendName}" (${row.backendId}, pid ${row.pid}, port ${row.port}): ` +
          `${row.outcome}${row.detail ? ` — ${row.detail}` : ''}\n`
      );
    }
  } catch (err) {
    process.stderr.write(`noodl-mcp: orphan sweep failed (${err instanceof Error ? err.message : err})\n`);
  }

  try {
    // P125 CCN-001 s7 — Studio's panel origin, before the server exists: the MCP App resource names it in its CSP,
    // and a host that prefetches the resource (Claude Desktop) reads it before any Studio runs.
    // CCN-006 — the port it had last time first, so a browser window left open across a restart reconnects.
    // `NODEGX_STUDIO_PORT_FILE=none` (and any jest run) takes a free port and remembers nothing.
    const portFileEnv = process.env.NODEGX_STUDIO_PORT_FILE;
    const portFile =
      portFileEnv === 'none' || process.env.JEST_WORKER_ID
        ? undefined
        : (portFileEnv ?? path.join(os.homedir(), '.noodl', 'studio-proxy-port'));
    const studioProxy = await startStudioProxy({ portFile });
    const { server, binding, disclosure } = createServer({
      projectDir: positional[0],
      allowWrites,
      deferTools,
      screenshotsToFiles,
      profile: profileName,
      studioProxy,
      // P112-OWN023-RESUMEUNBOUND — the folder the client opened, so an unbound briefing can name the app already in it.
      startFolder: process.cwd(),
      ...(reproducible ? { reproducible } : {})
    });
    // CCN-006 — what a browser window of Studio reads to offer the desktop app (studio/companion.ts).
    studioProxy.setCompanion(
      () => {
        const app = findStudioApp();
        return {
          client: clientLabel(server.server.getClientVersion()?.name),
          projectDir: binding.projectDir ?? null,
          app: app ? { opensLinks: app.opensLinks } : null,
          download: STUDIO_DOWNLOAD_URL,
          scheme: STUDIO_URL_SCHEME
        };
      },
      async () => {
        const app = findStudioApp();
        const dir = binding.projectDir;
        return app && dir ? launchStudioApp(app, dir) : false;
      }
    );
    process.stderr.write(`noodl-mcp: Studio panel served through ${studioProxy.origin}\n`);
    // AWP-006 — the surface is now a decision, so it is stated at startup rather
    // than inferred from a tools/list. `--all-tools` is named here because the
    // one failure mode of deferral is a client that never re-lists, and the
    // person who can fix that is reading stderr.
    //
    // ⚠️ BST-001 — this line is the one diagnostic a person configuring a client
    // actually reads, and unbound it must not print a directory the server does
    // not have. It names the state and the exit instead: a banner that said
    // "serving undefined" is how somebody spends an afternoon looking for a
    // path bug in a server that started exactly as asked.
    if (!binding.isBound) {
      process.stderr.write(
        // 🔴 F87 — counted from what is actually advertised, `find_tools`
        // included. It said four and served five.
        `noodl-mcp: no project bound — bootstrap mode (${BOOTSTRAP_ADVERTISED.length} tools: ` +
          `${BOOTSTRAP_ADVERTISED.join(', ')}). Call list_projects then open_project to serve a project that ` +
          'already exists, or create_project to make one — either binds this server without a restart.\n'
      );
    } else {
      const advertised = disclosure.groupStates().filter((g) => g.advertised);
      const held = disclosure.groupStates().filter((g) => !g.advertised);
      process.stderr.write(
        `noodl-mcp serving ${binding.projectDir} (${allowWrites ? 'read-write' : 'read-only'}) on stdio\n` +
          `noodl-mcp advertising ${advertised.reduce((n, g) => n + g.tools, 0)} tools` +
          (held.length > 0
            ? `; ${held.reduce((n, g) => n + g.tools, 0)} held behind find_tools (${held
                .map((g) => `${g.group}:${g.tools}`)
                .join(', ')}) — pass --all-tools to advertise everything\n`
            : ' (--all-tools)\n')
      );
    }
    await server.connect(new StdioServerTransport());
  } catch (err) {
    if (err instanceof ToolError) {
      process.stderr.write(`noodl-mcp: ${err.message}\n`);
      process.exitCode = 2;
      return;
    }
    throw err;
  }
}

void main();
