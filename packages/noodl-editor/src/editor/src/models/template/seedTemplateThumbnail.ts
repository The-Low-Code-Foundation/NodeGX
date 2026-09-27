/**
 * CHR-006 AC2 — a project made from a template starts with the template's picture.
 *
 * The Templates tab shows a template as its shot; the project that comes out of it would otherwise
 * be a gradient-and-initial until the editor captures its own. So the chosen row's picture is
 * written into the project's `thumbURI` once, at creation, and the editor's own capture replaces it
 * the first time there is one.
 *
 * 🔴 **FETCHED ONCE AND STORED AS A `data:` URI — NEVER THE URL.** A project card treats any
 * `http(s)` string as a usable capture (`hasUsableCapture`), so storing the shelf's URL would
 * "work" — and would put a community request on every cold start of the launcher, for every
 * project ever made from a template, which `useProjectTemplates` forbids in as many words. It would
 * also go blank offline, and a cross-origin image taints the canvas `bottomEdgeColour` reads.
 *
 * ⚠️ **NEVER OVER A REAL CAPTURE**, checked before the fetch and again after it: the editor can
 * capture while the picture is on the wire, and its capture is the truer picture.
 *
 * @module noodl-editor/models/template
 */

import { hasUsableCapture } from '@noodl-core-ui/utils/projectThumbnail';

/** The half of `ProjectModel` this touches. */
export interface ThumbnailTarget {
  getThumbnailURI(): string | undefined;
  setThumbnailFromDataURI(uri: string): void;
}

export type SeedOutcome = 'seeded' | 'kept' | 'no-picture' | 'failed';

const IMAGE_TYPES = new Set(['image/webp', 'image/png', 'image/jpeg']);
const TYPE_BY_EXTENSION: Record<string, string> = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' };

/**
 * @param src the chosen row's `TemplateChoice.thumbnail` — a shelf URL, or a bundled template's
 *   page-relative asset. `undefined` is a template with no picture, and changes nothing.
 * @returns what happened, for the caller's log. Never throws: a picture is never worth a failed
 *   project creation.
 */
export async function seedTemplateThumbnail(
  project: ThumbnailTarget,
  src: string | undefined,
  fetchImpl: typeof fetch = globalThis.fetch
): Promise<SeedOutcome> {
  if (!src) return 'no-picture';
  if (hasUsableCapture(project.getThumbnailURI())) return 'kept';

  try {
    const response = await fetchImpl(src);
    if (!response.ok) return 'failed';
    // A bundled asset read off disk can arrive with no type; its extension is then the type.
    const declared = (response.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    const type = declared || TYPE_BY_EXTENSION[(/\.([a-z]+)(?:[?#].*)?$/i.exec(src)?.[1] ?? '').toLowerCase()] || '';
    if (!IMAGE_TYPES.has(type)) return 'failed';

    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0) return 'failed';

    if (hasUsableCapture(project.getThumbnailURI())) return 'kept';
    project.setThumbnailFromDataURI(`data:${type};base64,${bytes.toString('base64')}`);
    return 'seeded';
  } catch {
    return 'failed';
  }
}
