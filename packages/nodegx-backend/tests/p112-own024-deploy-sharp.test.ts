/**
 * P112-OWN024-DEPLOYNOSHARP — a backend put on a VM (deploy_to_vm's `provision-app.sh`) or in the self-host image
 * (`Dockerfile.backend`) gets sharp, so a photo's small versions (?thumb=) are made there too.
 *
 * Ruled by Richard, 2026-10-25: the server fetches it once. `provision-app.sh` fetches sharp from npm the first time
 * any app ships to a server, into one place outside `/opt/<app>` that every app there shares, and the unit finds it
 * through NODE_PATH. A server that cannot fetch it still ships, and says so in a line `deploy_to_vm` returns.
 *
 * Here: the pins agree with the lockfile, the unit points where the fetch puts it, and the script's own sharp block,
 * cut out of the file and run under the script's `set -euo pipefail` with a stand-in npm, takes each road. The real
 * thing was driven in the DEP-002 throwaway VM (Ubuntu 24.04, systemd, Node 22.13.1): `?thumb=md` 501 with the old
 * script, 200 and 256 px after the first ship (one 16 MB fetch), no fetch on a reship or a second app, offline and
 * no-npm ships succeed with the 501 said, and the self-host image built and answered 200 (501 with its modules hidden).
 */
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const ROOT = path.join(__dirname, '..', '..', '..');
const DEPLOY = path.join(__dirname, '..', 'deploy');
const PROVISION = fs.readFileSync(path.join(DEPLOY, 'vm', 'provision-app.sh'), 'utf8');
const DOCKERFILE = fs.readFileSync(path.join(DEPLOY, 'Dockerfile.backend'), 'utf8');
const LOCKED = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8')).packages['node_modules/sharp'].version;

/** The script's sharp block, from its comment to the `fi` that closes it, writing under `native` instead of /opt. */
function sharpBlock(native: string): string {
  const lines = PROVISION.split('\n');
  const start = lines.findIndex((l) => l.includes('P112-OWN024-DEPLOYNOSHARP (Richard'));
  const end = lines.findIndex((l, i) => i > start && l === 'fi');
  expect(start).toBeGreaterThan(0);
  const block = lines.slice(start, end + 1).join('\n');
  expect(block).toContain('NATIVE=/opt/nodegx-native\n');
  return block.replace('NATIVE=/opt/nodegx-native\n', `NATIVE=${native}\n`);
}

/** A bin folder holding a stand-in `npm` (or none) and a `timeout` that just runs its command (macOS has none). */
function bin(npm?: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'own024-bin-'));
  fs.writeFileSync(path.join(dir, 'timeout'), '#!/bin/bash\nshift\nexec "$@"\n', { mode: 0o755 });
  if (npm) fs.writeFileSync(path.join(dir, 'npm'), `#!/bin/bash\n${npm}\n`, { mode: 0o755 });
  return dir;
}

/** `npm install --prefix <dir> …` that writes node_modules/sharp with the given index.js. */
const installs = (indexJs: string) =>
  `while [ "$1" != --prefix ]; do shift; done; mkdir -p "$2/node_modules/sharp" "$2/.cache"
cat > "$2/node_modules/sharp/index.js" <<'JS'
${indexJs}
JS
echo '{"name":"sharp"}' > "$2/node_modules/sharp/package.json"`;

function run(native: string, binDir: string): { code: number; out: string } {
  const script = `set -euo pipefail\nNODE=${JSON.stringify(process.execPath)}\n${sharpBlock(native)}\necho END`;
  try {
    const out = execFileSync('bash', ['-c', script], {
      encoding: 'utf8',
      env: { PATH: `${binDir}:/usr/bin:/bin`, HOME: os.tmpdir() },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return { code: 0, out };
  } catch (error) {
    const e = error as { status: number; stdout: string; stderr: string };
    return { code: e.status, out: e.stdout + e.stderr };
  }
}

describe('P112-OWN024-DEPLOYNOSHARP: the VM and the self-host image get sharp', () => {
  it('pins the version the lockfile resolves, on both roads', () => {
    expect(LOCKED).toMatch(/^\d+\.\d+\.\d+$/);
    expect(PROVISION).toContain(`\nSHARP_VERSION=${LOCKED}\n`);
    expect(DOCKERFILE).toMatch(new RegExp(`RUN npm install --prefix /app [^\\n]*sharp@${LOCKED.replace(/\./g, '\\.')} `));
    expect(DOCKERFILE).toContain('COPY --chown=node:node artifact/backend/cli.js /app/cli.js');
  });

  it("the service's unit finds sharp where the fetch puts it", () => {
    expect(PROVISION).toContain('SHARP_DIR="$NATIVE/sharp-$SHARP_VERSION"');
    expect(PROVISION).toContain('mv "$FETCH" "$SHARP_DIR"');
    const unit = PROVISION.slice(PROVISION.indexOf('cat > "$UNIT" <<UNIT'), PROVISION.indexOf('\nUNIT\n'));
    expect(unit).toContain('Environment=NODE_PATH=${SHARP_DIR}/node_modules');
    // Fetched before the unit is written, after the folder is copied (which replaces /opt/<app> wholesale).
    expect(PROVISION.indexOf('rsync -a --delete')).toBeLessThan(PROVISION.indexOf('sharp_loads "$SHARP_DIR"'));
    expect(PROVISION.indexOf('sharp_loads "$SHARP_DIR"')).toBeLessThan(PROVISION.indexOf('cat > "$UNIT" <<UNIT'));
  });

  describe('the sharp block, run as the script runs it', () => {
    let native: string;
    beforeEach(() => {
      native = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'own024-native-')), 'nodegx-native');
    });

    it('fetches it once, then a reship finds it there', () => {
      const first = run(native, bin(installs('module.exports = {};')));
      expect(first.code).toBe(0);
      expect(first.out).toContain(`photos: fetched sharp ${LOCKED} from npm`);
      expect(first.out).toContain('END');
      expect(fs.readdirSync(native)).toEqual([`sharp-${LOCKED}`]);
      expect(fs.existsSync(path.join(native, `sharp-${LOCKED}`, '.cache'))).toBe(false);

      const again = run(native, bin('echo "npm must not be asked again" >&2; exit 1'));
      expect(again.code).toBe(0);
      expect(again.out).toContain(`photos: small versions (?thumb=) are made by sharp ${LOCKED}, already on this server`);
    });

    it('a server npm cannot reach still ships, and says why in npm\'s words, not its log path', () => {
      const offline = run(
        native,
        bin(
          'echo "npm error code EAI_AGAIN"; echo "npm error request to https://registry.npmjs.org/sharp failed, reason: getaddrinfo EAI_AGAIN registry.npmjs.org"; ' +
            'echo "npm error A complete log of this run can be found in: /x/.cache/_logs/debug-0.log"; exit 1'
        )
      );
      expect(offline.code).toBe(0);
      expect(offline.out).toContain('END');
      expect(offline.out).toContain('photos: NOT AVAILABLE: small photo versions (?thumb=) answer 501');
      expect(offline.out).toContain('npm could not fetch it (request to https://registry.npmjs.org/sharp failed, reason: getaddrinfo EAI_AGAIN');
      expect(offline.out).not.toContain('complete log');
      expect(fs.readdirSync(native)).toEqual([]);
    });

    it('a server npm fails on in silence still ships', () => {
      const silent = run(native, bin('exit 1'));
      expect(silent.code).toBe(0);
      expect(silent.out).toContain('npm could not fetch it (');
      expect(silent.out).toContain('END');
    });

    it('a server with no npm still ships, and says so', () => {
      const none = run(native, bin());
      expect(none.code).toBe(0);
      expect(none.out).toContain('this server has no npm');
      expect(none.out).toContain('END');
    });

    it('a fetch that does not load here is not kept', () => {
      const broken = run(native, bin(installs("throw new Error('Could not load the sharp module using the linux-arm64 runtime');")));
      expect(broken.code).toBe(0);
      expect(broken.out).toContain('it was fetched but does not load on this server: Error: Could not load the sharp module');
      expect(fs.readdirSync(native)).toEqual([]);
    });
  });
});
