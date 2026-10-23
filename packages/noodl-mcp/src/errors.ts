/**
 * Typed tool failures. Tools catch these and return a structured error payload
 * (with `isError: true`) so the calling agent can react to the `code` rather
 * than parse prose.
 */
export class ToolError extends Error {
  constructor(
    public readonly code:
      | 'not-found'
      | 'already-exists'
      | 'conflict'
      | 'invalid-argument'
      | 'validation-failed'
      | 'not-a-v2-project'
      // BST-001 — this server started with no project directory. Distinct from
      // `not-found`, which means a project was named and is not there: this one
      // means none was ever named, and the fix is a different call entirely.
      | 'no-project'
      | 'read-only'
      | 'no-backend'
      | 'backend-error'
      // P125 CCN-001 — the person pressed HOLD in Studio: `.nodegx-hold.json` is in the project folder, and every
      // write is refused until they release it. Not `read-only` (a flag on the server) and not `conflict` (a
      // drift on one file): a person, now, saying stop.
      | 'held'
      // P26 DEP-002 s4 — `deploy_to_vm` stopped; `data.stage` says where (connect, box, build, stage, provision,
      // secrets, up), and `data.said` carries the box's own words when it refused.
      | 'deploy-failed'
      | 'io-error',
    message: string,
    public readonly data?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ToolError';
  }
}
