/**
 * The page's `@noodl/platform` storage: a map that lives as long as the page.
 *
 * The default web storage throws "Method not implemented" from every method, and the editor's
 * settings singleton reads it when its module loads — an unhandled rejection in the console of
 * every page that embeds the preview. Nothing the export does reads a setting, so a map that
 * starts empty is the honest answer. Imported first by `exportInPage.ts`, before any editor module.
 *
 * @module noodl-preview/inPage/platform
 */

import { setStorage } from '@noodl/platform';

const held = new Map<string, unknown>();

setStorage({
  // A key never set reads as `{}`, as it does from `@noodl/platform-node`'s files (`EditorSettings`
  // reads `local.settings` straight off the answer).
  get: async (key: string) => held.get(key) ?? {},
  set: async (key: string, data: Record<string, unknown>) => {
    held.set(key, data);
  },
  remove: async (key: string) => {
    held.delete(key);
  }
});
