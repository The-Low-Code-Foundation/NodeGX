/**
 * HLT-004 — the two `401`s in every launch's renderer log, and the credential nobody buried.
 *
 * ───────────────────────────────────────────────────────────────────────────────
 * 🔴 **WHAT THIS FILE IS ACTUALLY ABOUT, because "handle the 401 better" is the wrong fix and
 * was the task file's premise.** Both `401`s were ALREADY handled — `Read<T>` grew an
 * `unauthenticated` variant for these exact routes, argued at length in `communityapi.ts`, and
 * twenty-nine modules render it. The log line is not the editor's. It is Chromium's NETWORK
 * stack, a `Log.entryAdded` entry written before any JavaScript sees the response, and no
 * `catch` anywhere can suppress it. **The only way to stop writing it is not to make the
 * request** — which is why every assertion below counts REQUESTS rather than outcomes.
 *
 * 🔴 **The second half is the one that had no owner at all.** `clearCommunitySession` had
 * exactly ONE caller in the repository — the deliberate sign-out — so a token the platform had
 * started refusing was re-sent on every launch for ever, under a launcher card still drawing
 * the handle cached beside it. Measured on Richard's machine 2026-09-21: a session written
 * 2026-08-20, `GET /api/v1/me` answering `viewer: null` to it, and `@richardosborne14` on the
 * card regardless.
 *
 * ⚠️ **WHAT A GREEN RUN HERE DOES NOT PROVE.** That a real launch writes zero `401` lines —
 * `fetch` is injected throughout and there is no renderer in this runner. That is the driven
 * session in `scripts/devtools/drive-hlt004-requests.js`, and the count in the verdict is its
 * reading, not this file's ([[verify-the-consequence-not-just-the-mechanism]]).
 */

import {
  COMMUNITY_SESSION_KEY,
  writeCommunitySession
} from '../../src/editor/src/models/community/communitysession';
import { confirmStoredSession } from '../../src/editor/src/models/community/communitysignin';
import { CommunityApiClient } from '../../src/editor/src/models/community/communityapi';

function fakeStore() {
  const data = new Map<string, unknown>();
  const removed: string[] = [];
  return {
    data,
    removed,
    get: async (key: string) => data.get(key),
    set: async (key: string, value: { [k: string]: unknown }) => {
      data.set(key, value);
    },
    remove: async (key: string) => {
      removed.push(key);
      data.delete(key);
    }
  };
}

/** Records every URL it is asked for, so an ABSENCE of a request is assertable. */
function recordingFetch(answer: { status?: number; body?: unknown; throws?: unknown } = {}) {
  const urls: string[] = [];
  const impl = (async (url: string) => {
    urls.push(String(url));
    if (answer.throws) throw answer.throws;
    const status = answer.status ?? 200;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => {
        if (answer.body === undefined) throw new Error('no body');
        return answer.body;
      }
    } as unknown as Response;
  }) as unknown as typeof fetch;
  return { urls, impl };
}

const BASE = 'https://community.example';

describe('the instrument — a control before any absence is claimed', () => {
  /**
   * 🔴 **THE KNOWN-FIRING SIGNAL, and without it every assertion below passes for the worst
   * possible reason.** If the recorder simply never recorded, "no request was made" would be
   * true of a client that made every request. `GET /api/v1/me` is NOT credentialed — it is the
   * route that answers 200 for everybody — so with no token it must still go out.
   * ([[assert-an-absence-with-a-known-firing-signal-beside-it]])
   */
  it('an UNcredentialed route still goes out with no token — the guard is not blanket', async () => {
    const { urls, impl } = recordingFetch({ status: 200, body: { viewer: null } });
    const client = new CommunityApiClient({ baseUrl: BASE, token: null, fetchImpl: impl });

    const read = await client.me();

    expect({ outcome: read.outcome, requested: urls }).toEqual({
      outcome: 'ok',
      requested: [`${BASE}/api/v1/me`]
    });
  });

  it('and the same recorder sees a credentialed route when there IS a token', async () => {
    const { urls, impl } = recordingFetch({ status: 200, body: { intake: null, path: null } });
    const client = new CommunityApiClient({ baseUrl: BASE, token: 'live', fetchImpl: impl });

    const read = await client.path();

    expect({ outcome: read.outcome, requested: urls }).toEqual({
      outcome: 'ok',
      requested: [`${BASE}/api/v1/me/path`]
    });
  });
});

describe('a route that cannot be answered without a credential is not requested without one', () => {
  /**
   * The two routes HLT-004 measured, by name. Both were reached on every launch from
   * `ProjectsPage` — `path()` from `useLearnerPath`, `myListing()` from `useCommunityPeople`,
   * whose read is deliberately unconditional (UNI-001 AC4).
   */
  it.each([
    ['path', (c: CommunityApiClient) => c.path()],
    ['myListing', (c: CommunityApiClient) => c.myListing()]
  ])('%s() with no token: no request, and the caller still gets `unauthenticated`', async (_name, call) => {
    const { urls, impl } = recordingFetch({ status: 401 });
    const client = new CommunityApiClient({ baseUrl: BASE, token: null, fetchImpl: impl });

    const read = await call(client);

    expect({ outcome: read.outcome, requested: urls }).toEqual({ outcome: 'unauthenticated', requested: [] });
  });

  /**
   * ⚠️ **The answer is the SAME either way, and that is what makes this safe to change.** A
   * caller that branched on `unauthenticated` cannot tell the short-circuit from the round
   * trip, so no rendering decision anywhere in the editor moves.
   */
  it('gives the identical outcome the round trip used to give', async () => {
    const withToken = recordingFetch({ status: 401 });
    const withoutToken = recordingFetch({ status: 401 });

    const asked = await new CommunityApiClient({ baseUrl: BASE, token: 'dead', fetchImpl: withToken.impl }).path();
    const skipped = await new CommunityApiClient({ baseUrl: BASE, token: null, fetchImpl: withoutToken.impl }).path();

    expect({ asked, skipped, askedRequests: withToken.urls.length, skippedRequests: withoutToken.urls.length }).toEqual({
      asked: { outcome: 'unauthenticated' },
      skipped: { outcome: 'unauthenticated' },
      askedRequests: 1,
      skippedRequests: 0
    });
  });
});

describe('confirmStoredSession — the credential lifecycle nothing owned', () => {
  it('with no stored session it asks the platform nothing at all', async () => {
    const store = fakeStore();
    const { urls, impl } = recordingFetch({ status: 200, body: { viewer: null } });

    const outcome = await confirmStoredSession({ baseUrl: BASE, fetchImpl: impl, store, readStore: store });

    expect({ outcome, requested: urls }).toEqual({ outcome: 'none', requested: [] });
  });

  it('a token the platform still knows is kept', async () => {
    const store = fakeStore();
    await writeCommunitySession({ token: 'live', handle: 'nia' }, store);
    const { impl } = recordingFetch({ status: 200, body: { viewer: { handle: 'nia', kind: 'individual' } } });

    const outcome = await confirmStoredSession({ baseUrl: BASE, fetchImpl: impl, store, readStore: store });

    expect({ outcome, stillStored: store.data.has(COMMUNITY_SESSION_KEY) }).toEqual({
      outcome: 'live',
      stillStored: true
    });
  });

  /**
   * 🔴 **THE DEFECT, IN ONE TEST.** `viewer: null` while holding a token is the platform saying
   * the credential buys nothing. Before HLT-004 this state persisted for ever.
   */
  it('a token the platform does NOT know is forgotten, and the key is actually removed', async () => {
    const store = fakeStore();
    await writeCommunitySession({ token: 'dead', handle: 'richardosborne14' }, store);
    const { urls, impl } = recordingFetch({ status: 200, body: { viewer: null } });

    const outcome = await confirmStoredSession({ baseUrl: BASE, fetchImpl: impl, store, readStore: store });

    expect({
      outcome,
      stillStored: store.data.has(COMMUNITY_SESSION_KEY),
      removed: store.removed,
      asked: urls
    }).toEqual({
      outcome: 'forgotten',
      stillStored: false,
      removed: [COMMUNITY_SESSION_KEY],
      asked: [`${BASE}/api/v1/me`]
    });
  });

  /**
   * 🔴 **THE ASYMMETRY IS THE SAFETY PROPERTY AND IT IS WORTH FOUR CASES.** Wrongly forgetting
   * costs somebody their sign-in over a flaky connection; wrongly keeping costs one request
   * that was going to be made anyway. So ONLY a parsed `viewer: null` from a 200 is a verdict.
   * ⚠️ `viewer` absent is not `viewer` null — a payload without the field is a platform this
   * client does not understand ([[an-arm-with-no-predicate-in-it]]).
   */
  it.each([
    ['the network throws', { throws: new Error('offline') }],
    ['a 500', { status: 500, body: {} }],
    ['a body that will not parse', { status: 200 }],
    ['a 200 with no `viewer` field at all', { status: 200, body: { community: { surface: 'present' } } }]
  ])('%s keeps the session — inconclusive is never a verdict', async (_name, answer) => {
    const store = fakeStore();
    await writeCommunitySession({ token: 'dead', handle: 'nia' }, store);
    const { impl } = recordingFetch(answer);

    const outcome = await confirmStoredSession({ baseUrl: BASE, fetchImpl: impl, store, readStore: store });

    expect({ outcome, stillStored: store.data.has(COMMUNITY_SESSION_KEY), removed: store.removed }).toEqual({
      outcome: 'inconclusive',
      stillStored: true,
      removed: []
    });
  });

  it('presents the token it is asking about, and does NOT try to revoke it', async () => {
    const store = fakeStore();
    await writeCommunitySession({ token: 'dead' }, store);
    const seen: { url: string; auth?: string }[] = [];
    const impl = (async (url: string, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>;
      seen.push({ url: String(url), auth: headers.authorization });
      return { ok: true, status: 200, json: async () => ({ viewer: null }) } as unknown as Response;
    }) as unknown as typeof fetch;

    await confirmStoredSession({ baseUrl: BASE, fetchImpl: impl, store, readStore: store });

    // ⚠️ One request, to `/api/v1/me`, carrying the token — and nothing to `/api/auth/signout`,
    // which would spend a round trip collecting a second rejection.
    expect(seen).toEqual([{ url: `${BASE}/api/v1/me`, auth: 'Bearer dead' }]);
  });
});
