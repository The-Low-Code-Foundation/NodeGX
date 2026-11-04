/**
 * P132 BWF-012 — the backend's saved API calls, at `<dataDir>/api-calls.json`.
 *
 * One file for all of them (they are small, and a workflow folder per call would be one more folder a restore has to
 * know). Loaded strictly, as `workflow-defs/` is: an invalid file refuses to start, because a workflow whose saved call
 * silently did not load fails on a delay timer. The rules are `apiCalls.ts`'s, which the project file's validator
 * reads too.
 *
 * Deleting a call that a workflow still uses is refused by the subsystem (it holds both registries), naming the
 * workflows: a call removed under a workflow would fail that workflow at its next run, not now.
 *
 * @module nodegx-backend/workflow/ApiCallRegistry
 */

import * as fs from 'fs';
import * as path from 'path';

import { ApiCallDefinition, ApiCallInput, validateApiCall } from './apiCalls';

const FILE = 'api-calls.json';

export class ApiCallConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiCallConfigError';
  }
}

/** The stored form of an input: its own keys only, in a fixed order, so a diff shows decisions. */
function normalize(input: ApiCallInput, existing: ApiCallDefinition | undefined): ApiCallDefinition {
  const now = new Date().toISOString();
  return {
    id: input.id,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.description !== undefined ? { description: input.description } : {}),
    params: input.params,
    ...(input.blanks && input.blanks.length ? { blanks: input.blanks } : {}),
    createdAt: existing ? existing.createdAt : now,
    updatedAt: now
  };
}

export class ApiCallRegistry {
  private readonly file: string;
  private calls = new Map<string, ApiCallDefinition>();

  constructor(private readonly dataDir: string) {
    this.file = path.join(dataDir, FILE);
    this.calls = ApiCallRegistry.read(this.file);
  }

  private static read(file: string): Map<string, ApiCallDefinition> {
    const out = new Map<string, ApiCallDefinition>();
    if (!fs.existsSync(file)) return out;
    let parsed: unknown;
    try {
      parsed = JSON.parse(fs.readFileSync(file, 'utf-8'));
    } catch (e) {
      throw new ApiCallConfigError(`${FILE} is not valid JSON: ${e instanceof Error ? e.message : e}`);
    }
    const list = parsed && typeof parsed === 'object' && Array.isArray((parsed as { calls?: unknown }).calls) ? (parsed as { calls: unknown[] }).calls : null;
    if (!list) throw new ApiCallConfigError(`${FILE} must be { "version": 1, "calls": [ … ] }`);
    const errors: string[] = [];
    for (const c of list) {
      const errs = validateApiCall(c);
      if (errs.length) {
        errors.push(...errs);
        continue;
      }
      const def = c as ApiCallDefinition;
      if (out.has(def.id)) errors.push(`duplicate saved call id "${def.id}"`);
      out.set(def.id, def);
    }
    if (errors.length) {
      throw new ApiCallConfigError(
        `Invalid saved API calls in ${FILE} — refusing to start with calls that would not run correctly:\n` + errors.map((e) => `  - ${e}`).join('\n')
      );
    }
    return out;
  }

  /** ISL-039's rule, as the workflow registry's: re-read after a restore; an invalid file is refused and the live calls kept. */
  reload(): void {
    let fresh: Map<string, ApiCallDefinition>;
    try {
      fresh = ApiCallRegistry.read(this.file);
    } catch (e) {
      this.persist();
      throw e;
    }
    this.calls = fresh;
  }

  list(): ApiCallDefinition[] {
    return [...this.calls.values()].map((c) => ({ ...c }));
  }

  get(id: string): ApiCallDefinition | null {
    const c = this.calls.get(id);
    return c ? { ...c } : null;
  }

  /** The reasons an input would be refused, writing nothing. */
  validate(input: ApiCallInput): string[] {
    return validateApiCall(input);
  }

  upsert(input: ApiCallInput): ApiCallDefinition {
    const errors = validateApiCall(input);
    if (errors.length) throw new ApiCallConfigError(`Invalid saved API call:\n${errors.map((e) => `  - ${e}`).join('\n')}`);
    const def = normalize(input, this.calls.get(input.id));
    this.calls.set(def.id, def);
    this.persist();
    return { ...def };
  }

  delete(id: string): boolean {
    if (!this.calls.delete(id)) return false;
    this.persist();
    return true;
  }

  private persist(): void {
    fs.mkdirSync(this.dataDir, { recursive: true });
    const sorted = [...this.calls.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
    const tmp = `${this.file}.tmp-${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify({ version: 1, calls: sorted }, null, 2) + '\n');
    fs.renameSync(tmp, this.file);
  }
}
