import React from 'react';

import css from './SpecSections.module.scss';
import type { TimelineEntry } from './tryNodeModel';

/**
 * NSP-019 AC2 — the timeline a try produces, drawn as plain events top to bottom.
 *
 * Hook-free, like `NodeRulesSection`, so a scenario played through `playTimeline` can be drawn
 * and read in the plain-Node runner. What the person did sits flush; what the node answered is
 * indented under the frame it came out of; a frame nothing came out of says so.
 */
export interface TryTimelineProps {
  entries: readonly TimelineEntry[];
  error?: string;
}

export function TryTimeline({ entries, error }: TryTimelineProps) {
  if (entries.length === 0 && !error) {
    return <p className={css['Empty']}>Nothing tried yet. Set a value, press a signal or move the clock.</p>;
  }
  return (
    <ol className={css['Timeline']} aria-label="What happened">
      {entries.map((entry, i) =>
        entry.kind === 'frame' ? (
          <li key={i} className={css['TimelineFrame']} aria-hidden="true" />
        ) : (
          <li key={i} className={css[`Timeline-${entry.kind}`]}>
            {entry.text}
          </li>
        )
      )}
      {error !== undefined && <li className={css['TimelineError']}>The spec refused that: {error}</li>}
    </ol>
  );
}
