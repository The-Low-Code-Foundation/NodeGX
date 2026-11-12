/**
 * The session a function run is shown for a key bound to a person (FED-005 `actsAs`). One resolution, both doors.
 *
 * FED-005 says a bound key "is that user for every row-level and rule-level question". The graph's own
 * `Allow Unauthenticated` check and its Request node's `UserId` live INSIDE the graph, where no backend rule reaches,
 * so the run has to be handed a session for the person. The MCP door did that and `POST /functions/<name>` did not
 * (P124-S2-ACTSASHTTP): the same key passed the rule gate on both, and the function saw Marie through `/mcp` and
 * nobody through `/functions/*`, which reads as "the key is wrong".
 *
 * ⚠️ **The token never leaves this process.** It is minted, put in the request headers the runner passes to the
 * graph, and deleted in a `finally` — it is not returned to the caller and there is no route that would hand it back.
 * The graph could read it out of `Request.Headers`, which changes nothing: a cloud function already runs as system
 * with the master key, so it is strictly more privileged than the session it is being shown.
 *
 * 🔴 Released in a `finally`, not after a successful call. A function that throws or times out must not leave a usable
 * session behind — that would turn every failing call into a credential leak with a long tail.
 *
 * @module nodegx-backend/server/actingSession
 */

import type { IStorageFacade } from '@noodl/backend-contract';

import type { Principal } from '../security/model';
import { logger } from '../ops/logger';

export interface ActingSession {
  token: string;
  release: () => Promise<void>;
}

/** An ephemeral `_Session` for the user a bound key acts as, or null for any other caller. */
export async function sessionForActingKey(
  facade: Pick<IStorageFacade, 'rawCreate' | 'rawDelete'>,
  principal: Principal
): Promise<ActingSession | null> {
  if (principal.kind !== 'apiKey' || !principal.actsAs) return null;
  const token = 'r:' + require('crypto').randomBytes(24).toString('hex');
  const created = (await facade.rawCreate('_Session', {
    sessionToken: token,
    userId: principal.actsAs.userId,
    // One minute is longer than any function a door will wait for and short enough that a row orphaned by a hard
    // crash is not a live credential. `sessionExpiryMs` reads an ISO string (server/users.ts).
    expiresAt: new Date(Date.now() + 60_000).toISOString()
  })) as Record<string, unknown>;
  const objectId = String(created.objectId);
  return {
    token,
    release: async () => {
      try {
        await facade.rawDelete('_Session', objectId);
      } catch (e) {
        // The row expires on its own a minute from now; a failed delete is worth a log line and never worth failing
        // the call it was minted for.
        logger.warn('acting-session.release-failed', { error: e instanceof Error ? e.message : String(e) });
      }
    }
  };
}
