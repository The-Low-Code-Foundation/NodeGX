/**
 * TWO-005 slice 4 — the community app's prayer requests, held to the approved picture (`look/gram.html`: "Prayer"
 * and the feed's prayer card): the requests newest first, each its words, "🙏 I prayed · 24" (filled once you have:
 * "🙏 You prayed · 25"), and under it "Only Esi sees who prayed." For the person who asked, who prayed instead.
 *
 * - **A prayer request is a post of its own kind** (the world), so it is the feed's card (`/Feed/PostCard`), drawn as
 *   the picture's bordered card, in the feed and here. A new one is the New post page, opened on Prayer request.
 * - 🔴 **W4: only the person who asked sees who prayed.** The page reads `Prayed` as the person signed in, so the policy
 *   hands them their own rows and the rows on their own requests and nothing else; the count every member sees is
 *   the one `prayFor` keeps on the request.
 * - **The sections** (`/UI/Nav`): the picture's bottom bar on a phone, its rail on a tablet. Feed, Post, Prayer,
 *   Profile; the picture's Search waits until there is a search.
 *
 * @module noodl-mcp/tests/two005PrayerPages
 */
import { FEED_COMPONENTS, FEED_PAGES, FEED_READ, FEED_SHOWS, MEMBER_PAGE, navWires, PRAYER_PAGE } from './two005FeedPages';
import { GM_FINE, GM_LINE, GM_TITLE, GRAM_COMPONENTS, GRAM_PAGES, GM_REFUSED, gramShell } from './two005Pages';
import { button, column, fn, go, group, Node, PageComponent, rowOf, text, Wire, wire } from './two003Pages';

export const PRAYER_PAGES = { prayer: PRAYER_PAGE };

/** The sections, in the picture's order. Each label is its mark over its word on a phone, one line on a tablet. */
export const NAV_TABS: ReadonlyArray<{ id: string; label: string; to: string }> = [
  { id: 'feed', label: '⌂\nFeed', to: FEED_PAGES.feed },
  { id: 'post', label: '＋\nPost', to: FEED_PAGES.newPost },
  { id: 'prayer', label: '🙏\nPrayer', to: PRAYER_PAGE },
  { id: 'profile', label: '◯\nProfile', to: MEMBER_PAGE }
];

/** What a page shows when its read was refused: the reason, and the way to sign in. */
function refused(p: string): Node[] {
  return [
    group(`${p}Refused`, 'Refused: why, and sign in', `${p}Body`, column({ rowGap: 'var(--space-3)', mounted: false })),
    text(`${p}RefusedWhy`, 'Why', `${p}Refused`, '', GM_REFUSED),
    button(`${p}RefusedSignIn`, 'Sign in', `${p}Refused`, 'Sign in', GM_LINE),
    go(`${p}ToSignIn`, 'To sign in', GRAM_PAGES.signIn)
  ];
}
const refusedWires = (p: string, loader: string): Wire[] => [
  wire(loader, 'out-problem', `${p}RefusedWhy`, 'text'),
  wire(loader, 'out-refused', `${p}Refused`, 'mounted'),
  wire(`${p}RefusedSignIn`, 'onClick', `${p}ToSignIn`, 'navigate')
];

// ── /Pages/Prayer ──────────────────────────────────────────────────────────────────────────────────────────────────

export const PRAYER_LOAD = `${FEED_READ}
// Read so that a request, a comment or an I prayed made anywhere runs the page again.
var version = Inputs.changed;
var who = await me();
if (!who) { refused({ error: 'Sign in to see the prayer requests.' }); return; }
if (who.status !== 'approved') { Outputs.waiting(); return; }
try {
  var members = await all('Member');
  var posts = shown(await all('Post', { kind: { equalTo: 'prayer' } }), members).slice(0, ${FEED_SHOWS});
  var on = posts.map(function (p) { return ptr('Post', p.objectId); });
  var comments = on.length ? await all('Comment', { post: { containedIn: on } }) : [];
  var prayed = on.length ? await all('Prayed', { post: { containedIn: on } }) : [];
} catch (e) { refused(e); return; }
var mine = Noodl.Users.Current ? String(Noodl.Users.Current.id || '') : '';
Outputs.cards = await cardsOf(posts, members, [], comments, mine, false, prayed);
Outputs.empty = posts.length === 0;
Outputs.band = who.role === 'admin' ? 'Admin' : '';
Outputs.meId = who.id;
Outputs.inside = true;
Outputs.refused = false;
Outputs.ok = true;`;

/** One Subscribe To Changes per collection whose rows move a card. */
const listen = (p: string, collection: string): Node => ({ id: `${p}Live${collection}`, type: 'SubscribeToChanges', label: `${collection}s, as they change`, parameters: { collectionName: collection } });

const PRAYER: PageComponent = {
  path: PRAYER_PAGE,
  description: 'The prayer requests: newest first, I prayed on each, and asking for prayer',
  nodes: [
    ...gramShell('pr', 'Prayer', 'prayer', null, 560, 'prayer'),
    group('prContent', 'The prayer requests', 'prBody', column({ rowGap: 'var(--space-4)', mounted: false })),
    group('prTop', 'Heading and New prayer request', 'prContent', rowOf({ columnGap: 'var(--space-2)' })),
    text('prTitle', 'Heading', 'prTop', 'Prayer', { ...GM_TITLE, cssClassName: 'gm-read gm-wrap gm-grow' }),
    button('prNew', 'New prayer request', 'prTop', '＋ Ask for prayer', { ...GM_LINE, paddingLeft: 'var(--space-2-5)', paddingRight: 'var(--space-2-5)', paddingTop: 'var(--space-1-5)', paddingBottom: 'var(--space-1-5)', fontSize: 'var(--text-xs)', backgroundColor: 'var(--primary)', color: 'var(--primary-foreground)', borderColor: 'var(--primary)' }),
    text('prEmpty', 'No requests yet', 'prContent', 'No prayer requests yet. When you ask, every member sees it and can pray.', { ...GM_FINE, mounted: false }),
    group('prList', 'The requests', 'prContent', column({ rowGap: 'var(--space-4)' })),
    { id: 'prEach', type: 'For Each', label: 'One card per request', parent: 'prList', parameters: { template: FEED_COMPONENTS.card } },
    text('prPrivate', 'Who sees who prayed', 'prContent', 'Every member sees how many prayed. Only the person who asked sees who.', GM_FINE),
    ...refused('pr'),
    fn('prLoad', 'The newest prayer requests, as cards', PRAYER_LOAD, ['waiting']),
    { id: 'prChanged', type: 'Variable2', label: 'The feed changed', parameters: { name: 'feedChanged' } },
    listen('pr', 'Comment'),
    listen('pr', 'Post'),
    go('prToNew', 'To a new prayer request', FEED_PAGES.newPost, { kind: 'prayer' }),
    go('prToWaiting', 'Not let in yet: to waiting', GRAM_PAGES.waiting)
  ],
  connections: [
    wire('prRoot', 'didMount', 'prLoad', 'run'),
    wire('prChanged', 'value', 'prLoad', 'in-changed'),
    ...['Comment', 'Post'].map((c) => wire(`prLive${c}`, 'changed', 'prLoad', 'run')),
    wire('prLoad', 'out-ok', 'prContent', 'mounted'),
    wire('prLoad', 'out-cards', 'prEach', 'items'),
    wire('prLoad', 'out-empty', 'prEmpty', 'mounted'),
    wire('prLoad', 'out-band', 'prBar', 'band'),
    wire('prLoad', 'out-waiting', 'prToWaiting', 'navigate'),
    ...navWires('pr', 'prLoad'),
    ...refusedWires('pr', 'prLoad'),
    wire('prNew', 'onClick', 'prToNew', 'navigate')
  ]
};

// ── /UI/Nav ────────────────────────────────────────────────────────────────────────────────────────────────────────

/** The section the page is in: plum and bold; the others muted. */
export const NAV_LOOK = `var on = String(Inputs.on || '');
${NAV_TABS.map((t) => `Outputs.${t.id}Ink = on === '${t.id}' ? 'var(--primary)' : 'var(--muted-foreground)';
Outputs.${t.id}Weight = on === '${t.id}' ? 'var(--font-extrabold)' : 'var(--font-semibold)';`).join('\n')}`;

const cap = (id: string) => id[0].toUpperCase() + id.slice(1);

const NAV: PageComponent = {
  path: GRAM_COMPONENTS.nav,
  description: 'The sections: Feed, Post, Prayer, Profile. A bar at the bottom of a phone, a rail down a tablet’s side',
  nodes: [
    group('nvRoot', 'The sections', undefined, rowOf({ columnGap: 'var(--space-0)', cssClassName: 'gm-nav', mounted: false })),
    ...NAV_TABS.map((t) =>
      button(`nv${cap(t.id)}`, t.label.replace('\n', ' '), 'nvRoot', t.label, {
        backgroundColor: 'transparent',
        borderStyle: 'none',
        color: 'var(--muted-foreground)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--font-semibold)',
        paddingTop: 'var(--space-1-5)',
        paddingBottom: 'var(--space-1-5)',
        cssClassName: 'gm-nav-tab'
      })
    ),
    {
      id: 'nvIn',
      type: 'Component Inputs',
      label: 'The section, who, and whether to show',
      ports: [
        { name: 'on', type: 'string', plug: 'output' },
        { name: 'meId', type: 'string', plug: 'output' },
        { name: 'show', type: 'boolean', plug: 'output' }
      ]
    },
    fn('nvLook', 'Which section is lit', NAV_LOOK, []),
    ...NAV_TABS.map((t) => go(`nvTo${cap(t.id)}`, `To ${t.label.split('\n')[1]}`, t.to))
  ],
  connections: [
    wire('nvIn', 'show', 'nvRoot', 'mounted'),
    wire('nvIn', 'on', 'nvLook', 'in-on'),
    wire('nvIn', 'meId', 'nvToProfile', 'pm-memberId'),
    ...NAV_TABS.flatMap((t) => [
      wire('nvLook', `out-${t.id}Ink`, `nv${cap(t.id)}`, 'color'),
      wire('nvLook', `out-${t.id}Weight`, `nv${cap(t.id)}`, 'fontWeight'),
      wire(`nv${cap(t.id)}`, 'onClick', `nvTo${cap(t.id)}`, 'navigate')
    ])
  ]
};

/** Leaves first, then the pages that place them. */
export const GRAM_SLICE4_LEAVES: PageComponent[] = [NAV];
export const GRAM_SLICE4_PAGES: PageComponent[] = [PRAYER];
