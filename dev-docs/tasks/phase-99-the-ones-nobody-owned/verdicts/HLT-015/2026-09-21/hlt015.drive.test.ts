/* HLT-015 AC1/AC2/AC3 drive: a real BackendService on a real socket, real curl, real Chrome. */
import { execFile } from 'child_process';
import { promisify } from 'util';
const run = promisify(execFile);
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const PKG = '/Users/richardosborne/vscode_projects/OpenNoodl/packages/nodegx-backend';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BackendService } = require(path.join(PKG, 'src/service'));
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { hashToken } = require(path.join(PKG, 'src/email/tokens'));
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

async function curl(args: string[]): Promise<{ status: string; headers: string; body: string }> {
  const out = (await run('curl', ['-s', '-i', ...args], { encoding: 'utf-8' })).stdout;
  const split = out.indexOf('\r\n\r\n');
  const headers = out.slice(0, split);
  return { status: headers.split(' ')[1], headers, body: out.slice(split + 4) };
}

test('hlt015 drive', async () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hlt015-drive-'));
  fs.writeFileSync(path.join(dataDir, 'ops.json'), JSON.stringify({ version: 1, rateLimit: { enabled: false } }));
  const service = new BackendService({ dataDir, port: 0, backendId: 'hlt015drive', backendName: 'Drive App', authToken: 'adm' });
  const base: string = (await service.start()).listen.url;
  const facade = service.facade;
  const mail: string[] = [];
  service.getMailerForTesting().setTransportForTesting({ sendMail: async (o: { text: string }) => { mail.push(o.text); } });
  const H = ['-H', 'authorization: Bearer adm', '-H', 'content-type: application/json'];
  await curl(['-X', 'PUT', ...H, '-d', JSON.stringify({ baseUrl: base, enabled: true, smtp: { host: 'smtp.test', port: 587, secure: false, username: 'u' }, fromAddress: 'n@test' }), `${base}/admin/email/config`]);
  await curl(['-X', 'PUT', ...H, '-d', JSON.stringify({ magicLink: { enabled: true, ttlMinutes: 15, allowSignup: true } }), `${base}/admin/auth`]);

  const row = async (token: string) => (await facade.rawQuery('_EmailToken', { where: { tokenHash: hashToken(token) }, limit: 1 })).results[0];
  const sessions = async () => (await facade.rawQuery('_Session', { limit: 10000 })).results.length;
  const report: Record<string, unknown> = {};

  await curl(['-X', 'POST', '-H', 'content-type: application/json', '-d', '{"email":"scanned@example.com"}', `${base}/auth/magic-link`]);
  await new Promise((r) => setTimeout(r, 150));
  const link = (/(https?:\/\/\S*\/auth\/magic-link\/callback\?token=\S+)/.exec(mail[mail.length - 1]) || [])[1];
  const token = decodeURIComponent(new URL(link).searchParams.get('token') as string);
  const before = JSON.stringify(await row(token));
  const sessionsBefore = await sessions();

  const gets = [await curl([link]), await curl([link]), await curl([link])];
  report.curlGets = gets.map((g) => ({
    status: g.status,
    setCookie: /^set-cookie:/im.test(g.headers),
    location: (/^location:\s*(.*)$/im.exec(g.headers) || [])[1] || null,
    nodegxAuthAnywhere: /nodegx_auth/.test(g.headers + g.body),
    title: (/<title>(.*?)<\/title>/.exec(g.body) || [])[1]
  }));
  const dom = (await run(CHROME, ['--headless=new', '--disable-gpu', `--user-data-dir=${fs.mkdtempSync(path.join(os.tmpdir(), 'hlt015-chrome-'))}`, '--dump-dom', link], { encoding: 'utf-8', timeout: 60000 })).stdout;
  report.afterBrowserLoad = {
    chromeSawTitle: (/<title>(.*?)<\/title>/.exec(dom) || [])[1] || null,
    chromeSawHandoff: /nodegx_auth|signed in/i.test(dom),
    tokenRowUnchanged: JSON.stringify(await row(token)) === before,
    consumedAt: (await row(token)).consumedAt,
    sessionsMinted: (await sessions()) - sessionsBefore
  };

  const p1 = await curl(['-X', 'POST', '-d', `token=${encodeURIComponent(token)}`, `${base}/auth/magic-link/callback`]);
  report.firstPost = {
    status: p1.status,
    location: (/^location:\s*(.*)$/im.exec(p1.headers) || [])[1]?.trim(),
    rowRedirect: (await row(token)).redirectUrl,
    consumedAt: (await row(token)).consumedAt,
    sessionsMinted: (await sessions()) - sessionsBefore
  };
  const p2 = await curl(['-X', 'POST', '-d', `token=${encodeURIComponent(token)}`, `${base}/auth/magic-link/callback`]);
  report.secondPost = { status: p2.status, title: (/<title>(.*?)<\/title>/.exec(p2.body) || [])[1] };
  const g4 = await curl([link]);
  report.getAfterSpent = { status: g4.status, title: (/<title>(.*?)<\/title>/.exec(g4.body) || [])[1] };

  console.log(JSON.stringify(report, null, 2));
  await service.stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
  fs.writeFileSync(process.env.HLT015_OUT as string, JSON.stringify(report, null, 2));
}, 120000);
