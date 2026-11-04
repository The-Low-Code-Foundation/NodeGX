/**
 * P132 BWF-012 — the shapes of a saved API call, with no imports, so the agent's server (which writes the project
 * file but cannot load the workflow engine) can name them. The rules are `apiCalls.ts`'s.
 *
 * @module nodegx-backend/workflow/apiCallTypes
 */

export const API_CALL_BLANK_TYPES = ['text', 'number', 'boolean', 'any'] as const;
export type ApiCallBlankType = (typeof API_CALL_BLANK_TYPES)[number];

export interface ApiCallBlank {
  name: string;
  type?: ApiCallBlankType;
  /** What a test fills it with, and what a person reads as "for example". */
  example?: unknown;
  description?: string;
}

/** What a client writes (the project file's entry). */
export interface ApiCallInput {
  id: string;
  /** The words a person reads ("The weather in a city"). The id when absent. */
  name?: string;
  description?: string;
  params: Record<string, unknown>;
  blanks?: ApiCallBlank[];
}

/** What a backend stores. */
export interface ApiCallDefinition extends ApiCallInput {
  createdAt: string;
  updatedAt: string;
}

/** Find a saved call by id; null when there is none. */
export type ApiCallLookup = (id: string) => ApiCallInput | null;
