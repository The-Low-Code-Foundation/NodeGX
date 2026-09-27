/**
 * "Keep it safe": the copies the app's Keep-safe card lists, makes and brings back. Forked from Nightbook's shell
 * (TPL-011 V1-6; TPL-011-DESKTOP §3.7) for P105 CG-004; the door prefix and the header come from the caller.
 *
 * The backend runs with `--no-admin`, so a page cannot reach its backup API — and should not: a page that could restore
 * could be made to. The SHELL does it instead, with the backend's own CLI (`cli.js backup` / `cli.js restore`, the same
 * BackupManager as the scheduled copy: an online SQLite snapshot, retention, and a safety copy before any restore). The
 * page asks the shell through the relay, under the shell's prefix (`/__garden/` from garden.json).
 *
 * Three doors, no more:
 *   GET  <prefix>copies            the copies in the backup folder, newest first
 *   POST <prefix>copy              make one now
 *   POST <prefix>restore {name}    bring that one back (a name from the list, never a path)
 *
 * A POST must carry the shell's header (`x-garden: 1`). A page on another site cannot send a custom header to this
 * origin without a CORS preflight, and nothing here answers one, so only the app's own page can ask for a copy or a restore.
 *
 * Plain Node, no dependencies, so `node --test` runs it.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ARCHIVE_EXT = '.ngxbackup.tar.gz';
const PREFIX = '/__garden/';
const HEADER = 'x-garden';

/** The copies in `dir`, newest first: `{ name, at, bytes }`. A missing folder is no copies, never a throw. */
function listCopies(dir) {
  let names;
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  return names
    .filter((n) => n.endsWith(ARCHIVE_EXT))
    .map((name) => {
      try {
        const st = fs.statSync(path.join(dir, name));
        return st.isFile() ? { name, at: st.mtime.toISOString(), bytes: st.size } : null;
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** A name the list gave, and only that: no separators, no `..`, the archive's own extension. */
function isCopyName(name) {
  return typeof name === 'string' && name.endsWith(ARCHIVE_EXT) && !/[\\/]/.test(name) && !name.includes('..') && name.length < 256;
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(json) });
  res.end(json);
}

function readJson(req, limit = 4096) {
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => {
      raw += c;
      if (raw.length > limit) req.destroy();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

/**
 * The relay's hook: answers a request under the prefix and returns true, or returns false for anything else.
 *
 * @param {{ folder: () => string, copy: () => Promise<void>, restore: (file: string) => Promise<void>, log?: (l: string) => void }} api
 * @param {{ prefix?: string, header?: string }} [o] the door prefix and the header the app's page sends (garden.json)
 */
function createShellDoors(api, o = {}) {
  const log = api.log || (() => {});
  const prefix = o.prefix || PREFIX;
  const header = o.header || HEADER;
  let busy = false;
  return function handle(req, res, urlPath) {
    if (!urlPath.startsWith(prefix)) return false;
    const door = urlPath.slice(prefix.length);
    if (req.method === 'GET' && door === 'copies') {
      send(res, 200, { copies: listCopies(api.folder()) });
      return true;
    }
    if (req.method !== 'POST' || (door !== 'copy' && door !== 'restore')) {
      send(res, 404, { error: 'no such door' });
      return true;
    }
    if (req.headers[header] !== '1') {
      send(res, 403, { error: 'only the app asks for this' });
      return true;
    }
    if (busy) {
      send(res, 409, { error: 'busy' });
      return true;
    }
    busy = true;
    const done = (status, body) => {
      busy = false;
      send(res, status, body);
    };
    if (door === 'copy') {
      api.copy().then(
        () => done(200, { ok: true, copies: listCopies(api.folder()) }),
        (e) => {
          log(`copy failed: ${e && e.message}`);
          done(500, { error: 'copy failed' });
        }
      );
      return true;
    }
    readJson(req).then((body) => {
      const name = body && body.name;
      if (!isCopyName(name) || !listCopies(api.folder()).some((c) => c.name === name)) return done(400, { error: 'not one of the copies' });
      api.restore(path.join(api.folder(), name)).then(
        () => done(200, { ok: true }),
        (e) => {
          log(`restore failed: ${e && e.message}`);
          done(500, { error: 'restore failed' });
        }
      );
    });
    return true;
  };
}

module.exports = { listCopies, isCopyName, createShellDoors, ARCHIVE_EXT, PREFIX, HEADER };
