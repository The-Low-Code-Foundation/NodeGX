/**
 * The project's kits (`noodl_modules/<kit>/`), from files held in memory, as `<script>` and `<style>` tags.
 *
 * The same reading every other surface does — `@nodegx/module-inject`'s `manifestEntry` per kit folder, then
 * `toInjectModules` (the `requires` order, the refusals) and `buildInjectionTags` — with one change: a kit's
 * files are not served from a folder, so each tag that names one gets a `blob:` URL of its text instead. A file
 * the map does not hold keeps a URL under the runtime folder, where it 404s and the page says which.
 *
 * @module noodl-preview/inPage/kits
 */

import { buildInjectionTags, manifestEntry, toInjectModules, type InjectionTags } from '@nodegx/module-inject';
import { hash53 } from '@nodegx/project-contract/hash';

const KITS_DIR = 'noodl_modules/';
/** What `buildInjectionTags` prefixes each kit path with, so the paths can be found again in its output. */
const FILE_PREFIX = '__noodl_preview_file__/';

const TYPES: Record<string, string> = { js: 'text/javascript', css: 'text/css', json: 'application/json' };

/** One `blob:` URL per distinct file text, kept for the life of the page: an unchanged kit is not re-made per update. */
const urls = new Map<string, string>();
function blobUrl(path: string, text: string): string {
  const key = path + '\0' + hash53(text);
  let url = urls.get(key);
  if (!url) {
    const type = TYPES[path.split('.').pop() ?? ''] ?? 'text/plain';
    url = URL.createObjectURL(new Blob([text], { type }));
    urls.set(key, url);
  }
  return url;
}

export interface KitTags extends InjectionTags {
  /** The kit folders read, in folder order, for telling whether two snapshots load the same kits. */
  folders: string[];
  /** What the manifests' scan said (a missing or invalid manifest), as the editor's console would. */
  warnings: string[];
  /** A digest of every kit file's path and text: two snapshots with the same one load the same kits. */
  key: string;
}

export function kitTags(files: Record<string, string>, baseUrl: string): KitTags {
  const folders = [
    ...new Set(
      Object.keys(files)
        .filter((p) => p.startsWith(KITS_DIR) && p.split('/').length > 2)
        .map((p) => p.split('/')[1])
    )
  ].sort();

  const scanned = folders.map((dir) => manifestEntry(dir, files[`${KITS_DIR}${dir}/manifest.json`] ?? null));
  const modules = toInjectModules(scanned);
  const tags = buildInjectionTags(modules.length > 0 ? modules : undefined, FILE_PREFIX);

  const resolve = (html: string) =>
    html.replace(new RegExp(`(src|href)="${FILE_PREFIX}([^"]+)"`, 'g'), (_, attr: string, path: string) =>
      files[path] !== undefined ? `${attr}="${blobUrl(path, files[path])}"` : `${attr}="${baseUrl}${path}"`
    );

  const kitFiles = Object.keys(files)
    .filter((p) => p.startsWith(KITS_DIR))
    .sort();
  const key = hash53(kitFiles.map((p) => `${p}\0${hash53(files[p])}`).join('\0'));

  return {
    dependencies: resolve(tags.dependencies),
    modulesMain: resolve(tags.modulesMain),
    folders,
    warnings: scanned.flatMap((s) => s.warnings),
    key
  };
}
