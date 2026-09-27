/**
 * The third-party half of the Digital Bricks lesson kit — bundled by
 * `build.mjs` (esbuild, IIFE, global `DbtMarkdown`) ABOVE `kit.js`, the
 * `game-kit` shape.
 *
 * Exactly the three modules this product's `Markdown.tsx` uses, and the one
 * its `sanitise.ts` uses, resolved from the Digital Bricks Training repo's
 * own `node_modules` so the versions are the ones the source renders with:
 *
 *   react-markdown + rehype-sanitize + remark-gfm — the ONE markdown path
 *   dompurify                                     — the SVG sanitiser
 *
 * `react` and `react/jsx-runtime` are NOT bundled. `build.mjs` maps both onto
 * the `React` global the NodeGX runtime installs before any kit runs (phase
 * 69's single-React guarantee). A second React inside a kit renders a second
 * tree that shares nothing with the page, and the failure reads exactly like
 * a component that never mounted.
 */
import Markdown from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import DOMPurify from 'dompurify';

export { Markdown as ReactMarkdown, rehypeSanitize, defaultSchema, remarkGfm, DOMPurify };
