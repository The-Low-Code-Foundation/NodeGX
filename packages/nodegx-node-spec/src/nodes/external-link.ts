/**
 * External Link (`net.noodl.externallink`) — read from
 * `packages/noodl-viewer-react/src/nodes/std-library/externallink.ts` on 2026-10-01 (NSP-015 s16).
 *
 * R3 (a): the runtime wins by default. Every rule below cites the line it was read from.
 *
 * THE RULE, before the citations: `Do` asks the browser to open Link (world.ts LOCATION) and
 * answers at once, the first of these that holds:
 *   - no window — a server render — is Unchanged, and nothing is opened (:46-49);
 *   - no Link (`undefined`, `null` or `''`) is Failure `external-link/no-link`, Error
 *     "No link to open", and nothing is opened (:60-64);
 *   - otherwise the link is handed to `window.open(link, target, features)` as it is (:100):
 *     target `_blank` when Open In New Tab is `true` or unset, `_self` for anything else (:53);
 *     features `noopener,noreferrer` when Open In New Tab is truthy, `''` when not (:52). The two
 *     reads disagree for a truthy value that is not `true` (`'yes'`, `1`): the same tab, with the
 *     new-tab features. Then, if the target is `_blank` and the browser says the press was NOT a
 *     person's (`userActivation.isActive === false`), Failure `external-link/blocked` with Error
 *     "The browser blocked opening a new tab" — the open is still made (:97-111); otherwise Done
 *     (:114). A browser that cannot say (no `userActivation`) is Done.
 * Link and Open In New Tab are stored raw (no setter); Open In New Tab starts `true`, its default
 * (node.ts seeds defaults). Error keeps its last message — nothing clears it — and is sent each
 * time it is set (:62, :104).
 */

import { defineNode } from '../spec';

const NO_LINK = 'No link to open';
const BLOCKED = 'The browser blocked opening a new tab';

type State = {
  link: unknown;
  openInNewTab: unknown;
  /** :5-7 `_internal.lastError` */
  error: string | undefined;
}

export const ExternalLink = defineNode({
  type: 'net.noodl.externallink',
  version: 1,
  source: 'packages/noodl-viewer-react/src/nodes/std-library/externallink.ts',
  needs: ['location'],

  state: { link: undefined, openInNewTab: true, error: undefined } as State,
  // :116-127 outcomeOutputs({ done, unchanged, failure })
  outcomes: ['done', 'unchanged', 'failure'],

  inputs: {
    // :17-22 — stored raw
    link: {
      type: 'string',
      coerce: 'none',
      displayName: 'Link',
      group: 'Values',
      description: 'Web address to open; one with no scheme is resolved relative to the page the app is served from',
      examples: ['https://example.com', 'relative/page', '', null, 5]
    },
    // :23-29 — read through `getInputValue` (:51), which holds the declared default from creation (nodedefinition.ts :539); the setter never runs for a default
    openInNewTab: {
      type: 'boolean',
      default: true,
      coerce: 'none',
      displayName: 'Open In New Tab',
      group: 'Values',
      description: 'Opens the link in a new tab; when off the current page is replaced and the app unloads',
      examples: [true, false, undefined, 'yes', 0]
    },
    // :30-115
    do: { type: 'signal', outcome: true, displayName: 'Do', group: 'Actions', description: 'Opens Link, or fires Failure if there is no Link or the link was opened outside a user action' }
  },

  outputs: {
    // :133-141
    error: { type: 'string', from: (s) => s.error, displayName: 'Error', group: 'Error', description: 'Why the link could not be opened, set just before Failure fires' }
  }
}).on({
  link: (_s, v) => ({ set: { link: v }, send: [] }),
  openInNewTab: (_s, v) => ({ set: { openInNewTab: v }, send: [] }),
  do: (s, _i, world) => {
    if (!world.viewport()) return { send: [], outcome: 'unchanged' }; // :46-49
    const features = s.openInNewTab ? 'noopener,noreferrer' : ''; // :52
    const target = s.openInNewTab === true || s.openInNewTab === undefined ? '_blank' : '_self'; // :53
    const link = s.link;
    if (link === undefined || link === null || link === '') {
      return { set: { error: NO_LINK }, send: ['error'], outcome: 'failure', error: 'external-link/no-link' }; // :60-64
    }
    const activation = world.userActivation(); // :97
    const blocked = target === '_blank' && typeof activation === 'boolean' && !activation; // :98
    const open = { url: link, target, features }; // :100
    if (blocked) return { set: { error: BLOCKED }, send: ['error'], open, outcome: 'failure', error: 'external-link/blocked' }; // :102-111
    return { send: [], open, outcome: 'done' }; // :114
  }
});
