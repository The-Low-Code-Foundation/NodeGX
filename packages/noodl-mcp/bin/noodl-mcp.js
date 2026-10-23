#!/usr/bin/env node
// P125 CCN-001 s5 (2026-10-23) — the bundle needs Node 20 or newer (`@nodegx/node-spec` wants the `File`
// constructor). Claude Desktop starts a SECOND copy of a server "for Cowork and Code sessions" from a shared pool
// with its own, shorter PATH, where `node` resolved to v16 on Richard's Mac while the chat's copy got v22: that
// copy died with a stack trace at the top of mcp-server-nodegx.log and Desktop said "nodegx couldn't start". Said
// in one sentence, with the fix, before the require that would throw it.
var major = Number(process.versions.node.split('.')[0]);
if (major < 20) {
  process.stderr.write(
    'noodl-mcp: needs Node 20 or newer; this is Node ' + process.versions.node + ' at ' + process.execPath + '. ' +
      'In the host\'s config, set "command" to an absolute path of a newer node (for nvm: ~/.nvm/versions/node/v22.x/bin/node) ' +
      'rather than "node": a host can start a server with a PATH that is not your shell\'s.\n'
  );
  process.exit(1);
}
require('../dist/noodl-mcp.cjs');
