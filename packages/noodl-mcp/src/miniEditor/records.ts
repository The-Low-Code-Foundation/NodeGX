/**
 * P125 CCN-008 R2 — a mini editor is never lost.
 *
 * Richard, 2026-10-24: *"those mini editors should be made available again if the user makes a mistake and writes a
 * follow up message asking for more info and then their mini editor to validate disappears, it should be stored
 * somewhere to bring it up again."* Every call writes one file, `.nodegx/mini-editors/<id>.json`, and every change
 * the person makes and every decision lands in it. `reopen` draws it again in a new message; `get_mini_editor`
 * lists and reads them. A deploy leaves `.nodegx/` out (the editor's ignore list), so none of this ships with the app.
 *
 * @module miniEditor/records
 */

import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

import type { Control, MiniEditorInput, Stage, Variant } from './spec';

export const MINI_EDITORS_DIR = path.join('.nodegx', 'mini-editors');

export type MiniEditorStatus = 'open' | 'approved' | 'not-that' | 'done';

export interface MiniEditorChange {
  label: string;
  from: unknown;
  to: unknown;
  at: string;
}

export interface MiniEditorRecord {
  id: string;
  version: 1;
  createdAt: string;
  updatedAt: string;
  title: string;
  ask: string;
  kind: 'approve' | 'tweak';
  /** The agent's arguments, as given: what `reopen` resolves again if a part moved. */
  input: MiniEditorInput;
  stage: Stage;
  controls: Control[];
  variants: Variant[];
  status: MiniEditorStatus;
  decision?: { outcome: Exclude<MiniEditorStatus, 'open'>; note?: string; variant?: string; at: string };
  /** Per control key: the value before the person's first change, and the value now. */
  changes: Record<string, MiniEditorChange>;
  /** Each time a panel drew it (the first call and every `reopen`). */
  shown: Array<{ at: string; panelId: string }>;
  /** The variant the person last switched to. */
  variant?: string;
}

const ID = /^me-[a-z0-9]+-[a-f0-9]{6}$/;

export function newMiniEditorId(now = Date.now()): string {
  return `me-${now.toString(36)}-${randomUUID().replace(/-/g, '').slice(0, 6)}`;
}

export function isMiniEditorId(id: string): boolean {
  return ID.test(id);
}

function fileOf(projectDir: string, id: string): string {
  if (!isMiniEditorId(id)) throw new Error(`not a mini editor id: ${id}`);
  return path.join(projectDir, MINI_EDITORS_DIR, `${id}.json`);
}

export function writeRecord(projectDir: string, record: MiniEditorRecord): void {
  const file = fileOf(projectDir, record.id);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  fs.writeFileSync(tmp, JSON.stringify(record, null, 2), 'utf8');
  fs.renameSync(tmp, file);
}

export function readRecord(projectDir: string, id: string): MiniEditorRecord | null {
  if (!isMiniEditorId(id)) return null;
  try {
    return JSON.parse(fs.readFileSync(fileOf(projectDir, id), 'utf8')) as MiniEditorRecord;
  } catch {
    return null;
  }
}

/** Read, change, write: the one way a record changes, so two quick changes never lose each other in one process. */
export function updateRecord(projectDir: string, id: string, change: (r: MiniEditorRecord) => void): MiniEditorRecord | null {
  const record = readRecord(projectDir, id);
  if (!record) return null;
  change(record);
  record.updatedAt = new Date().toISOString();
  writeRecord(projectDir, record);
  return record;
}

/** Every stored mini editor, newest first. */
export function listRecords(projectDir: string): MiniEditorRecord[] {
  const dir = path.join(projectDir, MINI_EDITORS_DIR);
  let names: string[];
  try {
    names = fs.readdirSync(dir);
  } catch {
    return [];
  }
  const out: MiniEditorRecord[] = [];
  for (const name of names) {
    if (!name.endsWith('.json')) continue;
    const r = readRecord(projectDir, name.slice(0, -5));
    if (r) out.push(r);
  }
  return out.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
}

function show(v: unknown): string {
  if (v === undefined || v === null) return '(default)';
  if (typeof v === 'string') return v.replace(/^var\(--([\w-]+)\)$/, '$1');
  if (typeof v === 'object' && typeof (v as { value?: unknown }).value === 'number') {
    const o = v as { value: number; unit?: string };
    return `${o.value}${o.unit ?? ''}`;
  }
  return JSON.stringify(v);
}

/** The changes in a person's words: "Title size 32 → 40". */
export function changeLines(record: MiniEditorRecord): string[] {
  return Object.values(record.changes)
    .filter((c) => JSON.stringify(c.from) !== JSON.stringify(c.to))
    .map((c) => `${c.label} ${show(c.from)} → ${show(c.to)}`);
}

/**
 * What the panel sends into the conversation as the person's message when they decide. Written for the agent to act
 * on and for the person to recognise as theirs: the outcome, what they changed, their note, and the id.
 */
export function decisionMessage(record: MiniEditorRecord): string {
  const d = record.decision;
  const outcome =
    d?.outcome === 'approved' ? 'Approved' : d?.outcome === 'not-that' ? 'Not that' : d?.outcome === 'done' ? 'Done with' : 'About';
  const lines = changeLines(record);
  return (
    `${outcome}: "${record.title}" (mini editor ${record.id}).` +
    (d?.variant ? ` I picked "${d.variant}".` : '') +
    (lines.length > 0 ? ` I changed: ${lines.join('; ')}.` : ' I changed nothing.') +
    (d?.note ? ` ${d.note.trim()}` : '')
  );
}

/** A record as the agent reads it: what was asked, the outcome, the changes in words. */
export function summarise(record: MiniEditorRecord): Record<string, unknown> {
  return {
    id: record.id,
    title: record.title,
    status: record.status,
    answered: record.status !== 'open',
    createdAt: record.createdAt,
    ...(record.decision ? { decision: record.decision } : {}),
    changed: changeLines(record),
    shown: record.shown.length,
    stage: record.stage.nodeName
  };
}
