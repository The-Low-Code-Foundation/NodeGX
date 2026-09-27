/**
 * HLT-013 — the library entries that have a documentation page. **Generated.**
 *
 * Written by `npm run docs:library` from `docs-site/docs/library/`, and graded
 * by `npm run docs:library:check`. Do not edit by hand.
 *
 * 🔴 This exists because the index entry cannot answer the question.
 * `scripts/library/build.js` writes a `docs` path for **every** entry whether a
 * page exists at it or not, and the index is *published* — so a shipped editor
 * reads rows written before any of this, and drew a "Read docs" button to a 404
 * on all 78 of them. The editor asks this list instead.
 *
 * 72 entries have a page.
 */
export const LIBRARY_DOCS_PAGES: ReadonlySet<string> = new Set([
  'modules/chartjs',
  'modules/clipboard',
  'modules/custom-html',
  'modules/data-context',
  'modules/drag-to-reorder',
  'modules/file-download',
  'modules/font-awesome-brands',
  'modules/font-awesome-solid',
  'modules/geospatial-analysis',
  'modules/graphql',
  'modules/i18next',
  'modules/intl-format',
  'modules/keyboard-shortcuts',
  'modules/lottie',
  'modules/maplibre',
  'modules/markdown',
  'modules/marquee',
  'modules/material-icons',
  'modules/media-recorder',
  'modules/pdf-viewer',
  'modules/qr-scanner',
  'modules/rich-text-editor',
  'modules/shake-detector',
  'modules/simple-tooltips',
  'modules/validation',
  'modules/virtual-list',
  'modules/webcamera',
  'prefabs/accordion',
  'prefabs/advanced-columns',
  'prefabs/app-shell',
  'prefabs/auth-pages',
  'prefabs/avatar',
  'prefabs/card-grid',
  'prefabs/confirm-dialog',
  'prefabs/crud-screen',
  'prefabs/date-picker',
  'prefabs/email-verification',
  'prefabs/file-upload',
  'prefabs/filters',
  'prefabs/form',
  'prefabs/form-fields',
  'prefabs/format-date',
  'prefabs/format-full-name',
  'prefabs/list-with-icons',
  'prefabs/mail-gun',
  'prefabs/mailgun',
  'prefabs/media-query',
  'prefabs/multi-select',
  'prefabs/navigation-menu',
  'prefabs/oauth2',
  'prefabs/page-header',
  'prefabs/pagination',
  'prefabs/progress-circle',
  'prefabs/rating',
  'prefabs/sanitise-email',
  'prefabs/search-bar',
  'prefabs/send-grid',
  'prefabs/sendgrid',
  'prefabs/settings-page',
  'prefabs/states-kit',
  'prefabs/stepper',
  'prefabs/stripe',
  'prefabs/supabase',
  'prefabs/tab-bar',
  'prefabs/table',
  'prefabs/tags',
  'prefabs/time-picker',
  'prefabs/toast',
  'prefabs/toggle',
  'prefabs/totp',
  'prefabs/user-menu',
  'prefabs/xano',
]);

/**
 * Whether `<type>/<slug>` has a page on the docs site.
 *
 * Takes the index entry's own `docs` path (`/library/prefabs/accordion/`) so the
 * caller does not re-derive the key from two other fields and get it subtly wrong.
 */
export function hasLibraryDocsPage(docsPath: string | undefined): boolean {
  if (!docsPath) return false;
  const parts = docsPath.split('/').filter(Boolean);
  if (parts[0] !== 'library' || parts.length < 3) return false;
  return LIBRARY_DOCS_PAGES.has(`${parts[1]}/${parts[2]}`);
}
