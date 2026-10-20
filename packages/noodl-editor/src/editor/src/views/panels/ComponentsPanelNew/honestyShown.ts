/**
 * P111 SEE-001 — the honesty number shows in a source build only.
 *
 * Richard, 2026-10-20, for 0.4.3: leave it out of releases "until we've done as much work as we can on our side to
 * make sure it's going to be as close to 100% on each component as possible", and keep it locally for us to test. A
 * stranger reading "66% known" today learns nothing they can use, and most of it is gaps on our side.
 *
 * So every surface of it (the components panel's header and rows, the script mark on a node card) asks this first.
 * `process.env.devMode` is `'yes'` only when `main.js` was started with `--dev` (`npm run dev`); a packaged app never
 * sets it (the same signal the bug report's `packaged` field reads, `utils/report/collect.ts`).
 *
 * @module noodl-editor/views/panels/ComponentsPanelNew/honestyShown
 */
export function honestyShown(env: Record<string, string | undefined> = process.env): boolean {
  return env.devMode === 'yes';
}
