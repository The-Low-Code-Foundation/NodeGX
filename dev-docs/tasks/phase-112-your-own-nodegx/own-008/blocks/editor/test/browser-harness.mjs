// Starts the editor on a copy of the app and opens it in headless Chrome. Shared by the browser test.
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer';
import { copyApp } from './copy-app.mjs';

export const editor = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function startEditor(app, name) {
  const copy = copyApp(app, path.join(editor, '.test-copies', name));
  const server = spawn(process.execPath, ['server.mjs', copy, '--no-open', '--port', '0'], { cwd: editor });
  const base = await new Promise((resolve, reject) => {
    let text = '';
    server.stdout.on('data', (d) => {
      text += d;
      const m = /Open (http:\/\/127\.0\.0\.1:\d+\/)/.exec(text);
      if (m) resolve(m[1]);
    });
    server.stderr.on('data', (d) => (text += d));
    setTimeout(() => reject(new Error('the server did not start: ' + text)), 15000);
  });
  const browser = await puppeteer.launch({ headless: true, args: ['--window-size=1600,1000'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text() + ' ' + (m.location()?.url || '')));
  await page.goto(base, { waitUntil: 'load' });
  return {
    copy,
    base,
    page,
    errors,
    async stop() {
      await browser.close();
      server.kill();
    }
  };
}
