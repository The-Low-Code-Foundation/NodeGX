import classNames from 'classnames';
import React from 'react';

import { ADVANCED_CSS_GROUP, activityBadgeLabel, sumActiveCounts } from '../propertyPanelTiers';

export interface PropertyGroupModel {
  name: string;
  isExpanded: boolean;
  /**
   * The group's rows, as React nodes — CHR-008 §3.2.
   *
   * Was `els: TSFixme[]`, a list of DOM elements built by `Ports.renderParams` and appended into a
   * host by hand. `Ports` now returns `<PropertyRow>` elements, so the rows are siblings in this
   * tree and a row's decorations are props rather than post-render DOM surgery.
   */
  rows: React.ReactNode;
  /**
   * FB-017 AC2: how many of the group's ports are connected or set. Drawn as a badge when the
   * group is collapsed, so nothing folded away is doing something invisible.
   */
  activeCount?: number;
  /**
   * CHR-008 (R8): the one line a switched-off group draws instead of a sentence under every row — see
   * `model/groupGate.ts` for when a group gets one.
   */
  gate?: GroupGateLineProps;
  /**
   * P94 STY-003 rule 2 — the Look these rows draw from, named once on the heading.
   *
   * 🔴 **This is what stops rule 2 from being satisfied by a colour alone.** *"Every style field
   * states where its value came from"* is a naming requirement; a treatment can make a row look
   * different but cannot say `Primary Button`. Design §3.1 puts the name here on purpose — once,
   * above the rows — rather than repeating it down the column.
   */
  lookSource?: string;
}

export interface GroupGateLineProps {
  /** `Offset X, Offset Y and Color apply once Shadow Enabled is on.` */
  sentence: string;
  /** `Turn on`, or `Show <control>` where one press has no single meaning. */
  actionLabel: string;
  onAction: () => void;
  /** The gating port, for `data-test`. */
  gatePortName: string;
}

export interface PropertyGroupsProps {
  /** The basic tier, already ordered by `orderPropertyGroups`. */
  groups: PropertyGroupModel[];
  /**
   * FB-017: groups folded into the single `Advanced CSS` section. Empty or omitted renders no
   * section at all — a node with no advanced ports must not grow an empty heading.
   */
  advancedGroups?: PropertyGroupModel[];
  /** Whether the `Advanced CSS` section itself is open. Collapsed by default; see `propertyPanelViewState`. */
  isAdvancedExpanded?: boolean;
  /** When false the rows are rendered without group chrome (the single "Other" group case) */
  showHeaders: boolean;
  /**
   * FB-017 AC7: the active property filter, or empty. Used only to explain an empty result —
   * the filtering itself happens in `propertyPanelFilter.ts` before the groups arrive here.
   */
  filterQuery?: string;
  /** Called with the group name and the state it should move to. */
  onToggleGroup?: (groupName: string, isExpanded: boolean) => void;
}

/**
 * A group's heading: the label, a disclosure chevron, and — when collapsed — a count of the
 * ports inside that are connected or set.
 *
 * 🔴 It is a real `<button>` with `aria-expanded`, not the clickable `<div>` it replaces. Before
 * FB-017 this was a plain div with no handler at all: `Ports.ts` declared `groupExpansions`, read
 * it on every render, and never wrote to it, so the collapse mechanism was dead code with a live
 * reader. A div that toggles is the same defect wearing a cursor — it is unreachable by keyboard
 * and announces nothing, on a panel whose whole job is now progressive disclosure.
 *
 * ⚠️ The chevron is a text glyph with `aria-hidden`, following `VariantSelector`, rather than the
 * shared `Icon`. That keeps this module renderable by the `tests-unit` jest runner, which has no
 * renderer around it — `Icon` is one of the imports that makes a spec here fail *to run* rather
 * than fail.
 *
 * Exported for that runner. It calls no hooks, so `renderElements` can evaluate it end-to-end and
 * grade the actual chevron, `aria-expanded` and badge. The same split `views/Community.tsx` makes
 * for the same reason: the hook-free half is the half worth grading, and what remains — that the
 * sections are composed in the right order around it — is a drive.
 *
 * ⚠️ CHR-008 §3.2 removed `RowHost`, so `PropertyGroups` itself no longer calls a hook. That does
 * NOT make the whole tree evaluable in that runner: the rows `Ports` hands it each contain a
 * `ControlHost`, which uses `useRef`/`useLayoutEffect` to host an element built outside React.
 */
export function GroupHeading({
  name,
  isExpanded,
  activeCount,
  lookSource,
  onToggle,
  isFooter = false
}: {
  name: string;
  isExpanded: boolean;
  activeCount?: number;
  /** P94 STY-003 — `STYLE — from Primary Button`. Absent on every group with no Look to name. */
  lookSource?: string;
  onToggle?: (isExpanded: boolean) => void;
  /**
   * CHR-009 §2 (Richard, s20: "match the mockup") — `Advanced CSS` is the panel's footer row, so its count
   * reads as plain muted text rather than the pill a section heading carries. Same button, same count.
   */
  isFooter?: boolean;
}) {
  const badge = isExpanded ? null : activityBadgeLabel(activeCount ?? 0);

  return (
    <button
      type="button"
      className={classNames('property-group-label', isFooter && 'property-group-label--footer')}
      aria-expanded={isExpanded}
      onClick={() => onToggle && onToggle(!isExpanded)}
    >
      {/* CHR-009 — a drawn chevron, not a text `▾`. Inline SVG rather than `Icon`, which would stop
          this module rendering in the `tests-unit` runner (see above). */}
      <span className={classNames('property-group-chevron', isExpanded && 'is-expanded')} aria-hidden>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="m2.5 4 2.5 2.5L7.5 4" />
        </svg>
      </span>
      <span className="property-group-name">{name}</span>
      {/* P94 STY-003 rule 2. Its own element rather than part of the name, so the heading a
          person reads and the group's identity stay two different strings — `onToggleGroup`,
          `isGroupExpanded` and the persisted preference are all keyed by `name`. */}
      {lookSource && (
        <span className="property-group-look-source" data-test="group-look-source">
          {`— from ${lookSource}`}
        </span>
      )}
      {badge && <span className="property-group-badge">{badge}</span>}
    </button>
  );
}

/**
 * What the panel says when a filter matches nothing.
 *
 * 🔴 A panel that has gone blank is indistinguishable from a panel that has broken, and this one
 * has just hidden every property a builder can see — including the tier headings that would
 * otherwise prove it is still alive. The notice names the query back, because the most common
 * reason for no matches is a typo in the box rather than an absent property.
 *
 * Exported for the `tests-unit` runner: it calls no hooks, so `renderElements` can evaluate it.
 */
export function NoMatchesNotice({ query }: { query: string }) {
  return (
    <div className="property-filter-empty">
      <span className="property-filter-empty-title">No properties match “{query}”</span>
      <span className="property-filter-empty-hint">
        Clear the filter to see this node’s properties, including the ones under Advanced CSS.
      </span>
    </div>
  );
}

/**
 * CHR-008 (R8) — one sentence and one verb for a group whose rows one switch turned off.
 *
 * Hook-free and exported for the `tests-unit` runner, like {@link GroupHeading}. The verb reuses FB-021's
 * `property-port-gate-link` so the panel keeps one way of drawing "go and switch it on".
 */
export function GroupGateLine({ sentence, actionLabel, onAction, gatePortName }: GroupGateLineProps) {
  return (
    <div className="property-group-gate" data-test={`group-gate-${gatePortName}`}>
      <span>{sentence}</span>
      <button
        type="button"
        className="property-port-gate-link"
        data-test={`group-gate-action-${gatePortName}`}
        onClick={(event) => {
          // The line sits inside the group; the click must not reach anything that folds it.
          event.stopPropagation();
          onAction();
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}

function Group({
  group,
  onToggleGroup
}: {
  group: PropertyGroupModel;
  onToggleGroup?: PropertyGroupsProps['onToggleGroup'];
}) {
  return (
    <div className="property-group">
      <GroupHeading
        name={group.name}
        isExpanded={group.isExpanded}
        activeCount={group.activeCount}
        lookSource={group.lookSource}
        onToggle={(next) => onToggleGroup && onToggleGroup(group.name, next)}
      />

      {group.gate && group.isExpanded && <GroupGateLine {...group.gate} />}

      <div className={classNames('properties', !group.isExpanded && 'hidden')}>{group.rows}</div>
    </div>
  );
}

/**
 * The property editor's group sections (legacy `group` template).
 *
 * FB-017 gives it two tiers: the basic groups at the top level, then one `Advanced CSS` section
 * holding the shared CSS plumbing — see `propertyPanelTiers.ts` for which groups those are and
 * why. A `Group` node opens with 18 headings today; the split moves 8 of them behind one.
 */
export function PropertyGroups({
  groups,
  advancedGroups,
  isAdvancedExpanded = false,
  showHeaders,
  filterQuery,
  onToggleGroup
}: PropertyGroupsProps) {
  const hasAdvanced = Boolean(advancedGroups && advancedGroups.length);

  // Checked before the `showHeaders` branch below, because a node whose ports all sit in one
  // unnamed group can still be filtered down to nothing — and that branch would answer it with
  // an empty row host, which is the blank panel this notice exists to prevent.
  if (filterQuery && !groups.length && !hasAdvanced) {
    return <NoMatchesNotice query={filterQuery} />;
  }

  if (!showHeaders) {
    // ⚠️ No `properties` class here, as before: the single-unnamed-group case never carried one.
    return <div>{groups[0] ? groups[0].rows : null}</div>;
  }

  // The super-group's badge is the sum of what is folded inside it, so a collapsed
  // `Advanced CSS` still reports that something in there is driving the screen — the count is
  // the only thing standing between FB-018's confusion and a new place to hide.
  const advancedActiveCount = sumActiveCounts(advancedGroups ?? []);

  return (
    <>
      {groups.map((group) => (
        <Group key={group.name} group={group} onToggleGroup={onToggleGroup} />
      ))}

      {hasAdvanced && (
        <div className="property-group property-group--advanced">
          <GroupHeading
            name={ADVANCED_CSS_GROUP}
            isExpanded={isAdvancedExpanded}
            activeCount={advancedActiveCount}
            isFooter
            onToggle={(next) => onToggleGroup && onToggleGroup(ADVANCED_CSS_GROUP, next)}
          />

          {/*
           * Nested groups keep their own headings and their own expansion state. Flattening them
           * into one list would drop the only thing telling a builder that `Border Color` under
           * here belongs to the thumb rather than to the element — several of the folded groups
           * are sub-element restylings whose port names are identical to the root's.
           */}
          <div className={classNames('property-group-children', !isAdvancedExpanded && 'hidden')}>
            {(advancedGroups ?? []).map((group) => (
              <Group key={group.name} group={group} onToggleGroup={onToggleGroup} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
