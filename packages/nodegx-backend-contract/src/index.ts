/**
 * `@noodl/backend-contract` — the backend-neutral contracts, and the capability
 * descriptor that says what each backend can actually do.
 *
 * Types and frozen data. **No I/O, no adapter implementations, no node code.**
 * Adapters arrive in BCN-002 onwards; this package is what they register
 * against, and what the editor gates ports on.
 *
 * One executor, by ruling (P116 README §9 R9): `migration.ts` runs a world
 * migration plan for the backend's `POST /admin/world/migrate`. It does no I/O
 * of its own — every read and write goes through the context it is handed. So does
 * `targetGoes.ts` (R10): the delete that keeps what a link says happens when its record goes.
 *
 * @module backend-contract
 */

export * from './backends';
export * from './capabilities';
export * from './data';
export * from './auth';
export * from './events';
export * from './relations';
export * from './realtime';
export * from './filter';
export * from './descriptors';
export * from './wire';
export * from './nodeCapabilities';
export * from './probes';
export * from './storage';
export * from './operational';
export * from './migration';
export * from './targetGoes';
