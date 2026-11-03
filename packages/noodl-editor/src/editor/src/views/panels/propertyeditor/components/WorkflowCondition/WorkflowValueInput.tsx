import React, { useEffect, useMemo, useState } from 'react';

import { WorkflowEditorService } from '@noodl-models/workflow/WorkflowEditorService';
import { danglingReference, upstreamSteps } from '@noodl-models/workflow/workflowScope';
import { fieldRows, type ReadSource } from '@noodl-models/workflow/workflowSources';
import { isLiteralSpec, isPathSpec } from '@noodl-models/workflow/types';

import styles from './WorkflowCondition.module.scss';

import type { NodeGraphModel } from '@noodl-models/nodegraphmodel';

export interface ScopeRoot {
  name: string;
  description: string;
}

export interface WorkflowValueInputProps {
  value: unknown;
  onChange: (value: unknown) => void;
  /** The graph and the step this value belongs to — for the predecessor picker. */
  graph?: NodeGraphModel;
  stepId?: string;
  /** Scope roots from the served value language. */
  scope?: ScopeRoot[];
  placeholder?: string;
  ariaLabel?: string;
  /** The param this value is for. A list step's `items` cannot read its own item; every other param of it can. */
  paramName?: string;
}

/** How a value is currently written. */
type Mode = 'literal' | 'path';

function modeOf(value: unknown): Mode {
  return isPathSpec(value) ? 'path' : 'literal';
}

/**
 * Render a literal so it can be typed back. Strings stay bare — quoting every
 * string would make the common case (`"paid"`) look like a mistake — and
 * everything else is JSON, which is what `parseLiteral` reads back.
 */
function literalText(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (isLiteralSpec(value)) return literalText((value as { $literal: unknown }).$literal);
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

/**
 * Read a typed literal back.
 *
 * A bare number or `true`/`false`/`null` becomes that value — a condition
 * comparing `total gt "100"` against a number is the mistake this prevents, and
 * it is a silent one because a string is a legal operand. Anything else stays a
 * string unless it parses as JSON.
 */
export function parseLiteral(text: string): unknown {
  const t = text.trim();
  if (t === '') return '';
  if (t === 'true') return true;
  if (t === 'false') return false;
  if (t === 'null') return null;
  if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      return JSON.parse(t);
    } catch {
      return text;
    }
  }
  return text;
}

/**
 * One operand: a literal, or a reference into the run scope (WFA-004 §4).
 *
 * The reference side is a picker over reachable predecessors rather than free
 * text alone, because the alternative is typing `upstream.<stepId>.…` from
 * memory and finding out it was wrong when the backend answers 400. Free text
 * is still there as the fallback — the scope has runtime shapes the editor
 * cannot enumerate — and a reference the write-time validator would reject is
 * flagged in the editor with the same reason it would give.
 */
export function WorkflowValueInput({
  value,
  onChange,
  graph,
  stepId,
  scope,
  placeholder,
  ariaLabel,
  paramName
}: WorkflowValueInputProps) {
  const [mode, setMode] = useState<Mode>(modeOf(value));
  const [picking, setPicking] = useState(false);
  const reads = useReads(graph, stepId, paramName, picking);

  const upstream = useMemo(
    () => (graph && stepId ? upstreamSteps(graph, stepId) : []),
    [graph, stepId]
  );

  const path = isPathSpec(value) ? value.$path : '';
  const dangling = useMemo(
    () => (graph && stepId && mode === 'path' && path ? danglingReference(graph, stepId, path) : null),
    [graph, stepId, mode, path]
  );

  function switchMode(next: Mode) {
    setMode(next);
    if (next === 'path' && !isPathSpec(value)) onChange({ $path: '' });
    if (next === 'literal' && isPathSpec(value)) onChange('');
  }

  return (
    <div className={styles.Value}>
      <div className={styles.ValueRow}>
        <select
          className={styles.ModeSelect}
          value={mode}
          onChange={(e) => switchMode(e.target.value as Mode)}
          aria-label={`${ariaLabel || 'Value'} kind`}
          title="A fixed value, or a reference to data the run produced"
        >
          <option value="literal">value</option>
          <option value="path">from</option>
        </select>

        {mode === 'literal' ? (
          <input
            className={styles.Input}
            value={literalText(value)}
            placeholder={placeholder || 'a value'}
            aria-label={ariaLabel || 'Value'}
            onChange={(e) => onChange(parseLiteral(e.target.value))}
          />
        ) : (
          <input
            className={styles.Input}
            value={path}
            placeholder="previous.total"
            aria-label={`${ariaLabel || 'Value'} path`}
            onChange={(e) => onChange({ $path: e.target.value })}
            list={undefined}
          />
        )}
      </div>

      {mode === 'path' && reads && (
        <>
          {path && <PathWords words={reads.words(path)} />}
          <button
            className={styles.SmallButton}
            aria-expanded={picking}
            onClick={() => setPicking(!picking)}
            title="A value from what started the workflow, or from a step before this one"
          >
            {picking ? 'Close the list' : 'Choose what it reads…'}
          </button>
          {picking && (
            <ReadsTree
              sources={reads.sources}
              current={path}
              onPick={(p) => {
                onChange({ $path: p });
                setPicking(false);
              }}
            />
          )}
        </>
      )}

      {mode === 'path' && !reads && (
        <div className={styles.PathHelpers}>
          {/* The served scope has PATTERN entries — `upstream.<stepId>`,
              `<param name>` — which describe a family rather than name a root.
              Inserting one literally would produce a path that resolves to
              nothing, so the concrete steps below stand in for `upstream.*` and
              the patterns are not offered as chips. */}
          {(scope || [])
            .filter((root) => !root.name.includes('<'))
            .map((root) => (
              <button
                key={root.name}
                className={styles.Chip}
                title={root.description}
                onClick={() => onChange({ $path: root.name + '.' })}
              >
                {root.name}
              </button>
            ))}
          {upstream.map((step) => (
            <button
              key={step.id}
              className={styles.Chip}
              title={`The output of ${step.label}${step.kindLabel ? ` (${step.kindLabel})` : ''}`}
              onClick={() => onChange({ $path: `upstream.${step.id}.` })}
            >
              {step.label}
            </button>
          ))}
          {upstream.length === 0 && (
            <span className={styles.Hint}>
              Nothing runs before this step, so only the run payload is readable here.
            </span>
          )}
        </div>
      )}

      {dangling && <div className={styles.Error}>{dangling.message}</div>}
    </div>
  );
}

/**
 * What this step can read, from the open workflow document (P132 BWF-008 item 3, BWF-003's model): null when no
 * document holds this graph, and the picker keeps its chips. Opening the list asks for the newest run again, so a
 * run made since shows.
 */
function useReads(graph: NodeGraphModel | undefined, stepId: string | undefined, paramName: string | undefined, picking: boolean) {
  const document = WorkflowEditorService.instance?.document;
  const mine = !!document && !!graph && !!stepId && document.graph === graph;
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!mine) return;
    const group = {};
    document.on('readsChanged', () => setTick((t) => t + 1), group);
    return () => void document.off(group);
  }, [mine, document]);

  useEffect(() => {
    if (mine && picking) void document.refreshReads();
  }, [mine, picking, document]);

  if (!mine) return null;
  const step = document.toInput().steps.find((s) => s.id === stepId);
  const item = !!step && !!document.specFor(step.kind)?.params.some((p) => p.name === 'itemKey') && paramName !== 'items';
  return {
    sources: picking ? document.readsFor(stepId, item) : [],
    words: (p: string) => document.valueWords(p, stepId)
  };
}

const FROM_TAG: Record<string, string> = { shape: 'no run yet', sample: 'from the test sample' };

function PathWords({ words }: { words: { name: string; from: string; missing?: boolean } }) {
  return (
    <div className={styles.Hint} data-test="path-words">
      <b>{words.name}</b> · from {words.from}
    </div>
  );
}

/** The sources as trees: a source a heading, a field a line; a press picks its path. Folded as Studio folds them. */
function ReadsTree({ sources, current, onPick }: { sources: ReadSource[]; current: string; onPick: (path: string) => void }) {
  // A fold is open at the top level and closed below it, until pressed; the trigger's source starts closed.
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const flip = (key: string) =>
    setFlipped((was) => {
      const next = new Set(was);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  const isOpen = (key: string, byDefault: boolean) => byDefault !== flipped.has(key);

  return (
    <div className={styles.Reads} role="tree" aria-label="A value from what came before">
      {sources.map((src) => {
        const open = isOpen(src.root, src.root !== 'trigger');
        const words = src.words.charAt(0).toUpperCase() + src.words.slice(1);
        const rows = src.leaf ? [] : fieldRows(src);
        const closedBelow: string[] = [];
        return (
          <div key={src.root} className={styles.ReadsSource} data-root={src.root} data-from={src.from}>
            <div className={styles.ReadsHead}>
              {!src.leaf && (
                <button className={styles.Fold} aria-expanded={open} aria-label={`${open ? 'Fold' : 'Unfold'} ${src.words}`} onClick={() => flip(src.root)}>
                  {open ? '▾' : '▸'}
                </button>
              )}
              <button
                className={src.root === current ? `${styles.Field} ${styles.FieldOn}` : styles.Field}
                data-path={src.root}
                title={`Use all of it (${src.root})`}
                onClick={() => onPick(src.root)}
              >
                {words}
              </button>
              {FROM_TAG[src.from] && <span className={styles.Hint}>{FROM_TAG[src.from]}</span>}
            </div>
            {open && !src.leaf && (rows.length ? (
              rows.map((r) => {
                if (closedBelow.some((c) => r.path.startsWith(`${c}.`))) return null;
                const foldOpen = r.folds && isOpen(r.path, r.depth < 1);
                if (r.folds && !foldOpen) closedBelow.push(r.path);
                return (
                  <div key={r.path} className={styles.ReadsRow} style={{ paddingLeft: 14 + r.depth * 12 }}>
                    {r.folds ? (
                      <button className={styles.Fold} aria-expanded={foldOpen} aria-label={`${foldOpen ? 'Fold' : 'Unfold'} ${r.name}`} onClick={() => flip(r.path)}>
                        {foldOpen ? '▾' : '▸'}
                      </button>
                    ) : (
                      <span className={styles.FoldSpace} />
                    )}
                    <button
                      className={r.path === current ? `${styles.Field} ${styles.FieldOn}` : styles.Field}
                      data-path={r.path}
                      title={`Use ${r.path}`}
                      onClick={() => onPick(r.path)}
                    >
                      {r.name}
                    </button>
                    {r.shown !== null && <span className={styles.ReadsValue}>{r.shown}</span>}
                  </div>
                );
              })
            ) : (
              <div className={styles.Hint} style={{ paddingLeft: 14 }}>
                {src.note ?? (src.from === 'shape' ? 'Its fields show once the workflow is tested.' : 'Nothing in it.')}
              </div>
            ))}
          </div>
        );
      })}
      <div className={styles.Hint}>Or type where it reads from in the box above.</div>
    </div>
  );
}
