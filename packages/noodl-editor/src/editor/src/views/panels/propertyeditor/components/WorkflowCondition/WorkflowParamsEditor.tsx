import React, { useEffect, useRef, useState } from 'react';

import styles from './WorkflowCondition.module.scss';
import { WorkflowValueInput, type ScopeRoot } from './WorkflowValueInput';

import type { NamedValuesWords } from '@noodl-models/workflow/workflowPieces';

import type { NodeGraphModel } from '@noodl-models/nodegraphmodel';

export type ParamRow = [key: string, value: unknown];

export interface WorkflowParamsEditorProps {
  /** The author-named params, in the order they are stored. */
  value: ParamRow[];
  onChange: (value: ParamRow[]) => void;
  /** Names the backend refuses — served, not guessed. */
  reserved?: string[];
  /** Names that are legal but replace part of the run payload for the function. */
  shadows?: string[];
  scope?: ScopeRoot[];
  graph?: NodeGraphModel;
  stepId?: string;
  /**
   * P132 BWF-013: the words, when these rows are not a function's params (a Run a workflow step's `send`, Call an
   * API's query or headers). Absent: CWF-001's words, unchanged.
   */
  words?: NamedValuesWords;
  /** P132 BWF-013: names worth one press (what the piece reads as `body.<name>`), offered while not yet a row. */
  asks?: string[];
}

const PARAM_WORDS: NamedValuesWords = {
  noun: 'param',
  add: '+ param',
  empty: 'The function already receives the run payload and previous. Add a param to hand it a value under a name of your choosing.',
  filled: (first) =>
    `Sent at the top level of the request body, so the function reads "${first}". A param cannot read another param of the same step.`,
  needsName: 'A param needs a name — it is what the function reads the value as.'
};

const cap = (w: string) => w.charAt(0).toUpperCase() + w.slice(1);

const keyOf = (rows: ParamRow[]) => JSON.stringify(rows.map(([k]) => k));

/**
 * The param mapping (CWF-001) — what a Call Function step hands the function.
 *
 * Every other row in this panel edits ONE declared param. This one edits a
 * dictionary whose names the author invents, so it is a list of key fields each
 * beside the same `WorkflowValueInput` a condition operand uses. `switch.cases`
 * set that precedent and this follows it deliberately: two editors that disagree
 * about what a value looks like would teach two dialects of one syntax.
 *
 * **Names are local state until you leave the field**, which is not a nicety.
 * Each name is a real key in the step's params, so committing on every keystroke
 * would write `a`, `am`, `amo`… as separate params and fill the undo queue with
 * them. Values commit immediately — they are structured, and there is no
 * half-typed `{"$path"}`.
 *
 * What it says out loud, because each is a mistake you would otherwise discover
 * at run time:
 *   - a duplicate name silently loses one of the two values (JSON object keys),
 *   - `previous` is REFUSED, because the engine writes it after your params and
 *     the value would be discarded rather than merely shadowed, and
 *   - a payload root (`body`, `trigger`, …) is legal but replaces that part of
 *     the run payload for the function, which is a note and not an error — an
 *     explicit identity mapping is a reasonable thing to write.
 *
 * Both lists are SERVED on the port type, not written here, so this control and
 * the backend's 400 cannot drift apart.
 */
export function WorkflowParamsEditor({
  value,
  onChange,
  reserved,
  shadows,
  scope,
  graph,
  stepId,
  words = PARAM_WORDS,
  asks
}: WorkflowParamsEditorProps) {
  const [names, setNames] = useState<string[]>(() => value.map(([k]) => k));
  const committed = useRef(keyOf(value));

  // Re-sync when the names changed from OUTSIDE this control — an undo, MCP, a
  // proposal applied. Guarded on our own last commit so typing is never
  // interrupted by the write it just caused.
  useEffect(() => {
    const incoming = keyOf(value);
    if (incoming !== committed.current) {
      committed.current = incoming;
      setNames(value.map(([k]) => k));
    }
  }, [value]);

  const reservedSet = new Set(reserved || []);
  const shadowSet = new Set(shadows || []);
  const rows = value.map(([k, v], i) => [names[i] ?? k, v] as ParamRow);

  const commit = (next: ParamRow[]) => {
    committed.current = keyOf(next);
    setNames(next.map(([k]) => k));
    onChange(next);
  };

  const setValue = (i: number, v: unknown) => commit(rows.map((r, j) => (j === i ? [r[0], v] : r)));
  const remove = (i: number) => commit(rows.filter((_, j) => j !== i));

  /** Commit a rename only if it is legal — an illegal one stays in the field. */
  const commitName = (i: number) => {
    const name = (names[i] ?? '').trim();
    if (!name || nameProblem(name, i)) return;
    if (name === value[i][0]) return;
    commit(rows.map((r, j) => (j === i ? [name, r[1]] : r)));
  };

  /** A free name, so a new row is never keyed "" against another keyed "". */
  const freeName = () => {
    const taken = new Set(rows.map(([k]) => k));
    let n = 1;
    while (taken.has(`${words.noun}${n}`)) n++;
    return `${words.noun}${n}`;
  };

  /** A name that cannot work — the backend refuses it and the save will 400. */
  function nameProblem(name: string, i: number): string | null {
    if (!name.trim()) return words.needsName;
    if (reservedSet.has(name)) {
      return `The engine writes "${name}" into the step input after your params, so this value would be discarded. Give it another name.`;
    }
    if (rows.some(([other], j) => j !== i && other === name)) return `Two ${words.noun}s cannot share a name.`;
    return null;
  }

  /**
   * A name that WILL work but is worth a word. Legal is not the same as
   * unsurprising: the params merge after the run payload, so a param called
   * `body` replaces the payload's `body` for the function this step calls.
   */
  function nameNote(name: string): string | null {
    return shadowSet.has(name) ? `Replaces the run payload's "${name}" for this function.` : null;
  }

  return (
    <div className={styles.Root}>
      {rows.map(([key, v], i) => {
        const problem = nameProblem(key, i);
        return (
          <div key={i} className={styles.Case}>
            <div className={styles.CaseHeader}>
              <input
                className={`${styles.Input} ${styles.CaseLabel}`}
                value={key}
                placeholder="name"
                aria-label={`${cap(words.noun)} ${i + 1} name`}
                onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
                onBlur={() => commitName(i)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
              <button className={styles.SmallButton} aria-label={`Remove ${words.noun} ${i + 1}`} onClick={() => remove(i)}>
                ×
              </button>
            </div>

            {problem ? (
              <div className={styles.Error}>{problem}</div>
            ) : (
              nameNote(key) && <div className={styles.Hint}>{nameNote(key)}</div>
            )}

            <WorkflowValueInput
              value={v}
              onChange={(next) => setValue(i, next)}
              graph={graph}
              stepId={stepId}
              scope={scope}
              ariaLabel={`${cap(words.noun)} ${key || i + 1} value`}
            />
          </div>
        );
      })}

      {(asks || [])
        .filter((name) => !rows.some(([k]) => k === name))
        .map((name) => (
          <button
            key={`ask-${name}`}
            className={styles.AddButton}
            data-test="named-value-ask"
            onClick={() => commit([...rows, [name, '']])}
          >
            {`+ ${name}`}
          </button>
        ))}

      <button className={styles.AddButton} onClick={() => commit([...rows, [freeName(), '']])}>
        {words.add}
      </button>

      <span className={styles.Hint}>{rows.length === 0 ? words.empty : words.filled(rows[0][0])}</span>
    </div>
  );
}
