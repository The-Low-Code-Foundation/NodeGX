import classNames from 'classnames';
import React, { useEffect, useRef, useState } from 'react';

import { getComponentIconType } from '@noodl-models/nodelibrary/ComponentIcon';
import { RuntimeType } from '@noodl-models/nodelibrary/NodeLibraryData';
import { getDefaultComponent } from '@noodl-models/projectmodel.utils';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';
import { IconButton, IconButtonVariant } from '@noodl-core-ui/components/inputs/IconButton';
import { MenuDialogWidth } from '@noodl-core-ui/components/popups/MenuDialog';
import { Tooltip } from '@noodl-core-ui/components/popups/Tooltip';

import { ViewerConnection } from '../../ViewerConnection';
import type { LaneFilter } from '../nodegrapheditor/canvas/structureLane';
import { buildCreateMenuItems, CLOUD_CREATE_PARENT_PATH, createMenuTitle } from '../panels/ComponentsPanelNew/createMenu';
import { folderSegmentLabel } from '../panels/ComponentsPanelNew/folderDisplay';
import { useComponentActions } from '../panels/ComponentsPanelNew/hooks/useComponentActions';
import { showContextMenuInPopup } from '../ShowContextMenuInPopup';
import css from './NodeGraphComponentTrail.module.scss';

export interface ComponentTrailItem {
  id?: string;
  name: string;
  fullName: string;
  component?: TSFixme; // Noodl Component object or undefined if folder
  isCurrent: boolean;
  stateText: 'Read only' | null;
}

export interface NodeGraphComponentTrailProps {
  componentTrail: ComponentTrailItem[];

  canNavigateBack: boolean;
  canNavigateForward: boolean;

  onSwitchToComponent: (component: TSFixme, args?: any) => void;
  onHistoryForward: () => void;
  onHistoryBack: () => void;

  /** PAR-003: runtime of the hosting graph — scopes the "+" new-component templates. */
  runtimeType?: RuntimeType;
  /** PAR-003: hides the "+" new-component affordance on read-only canvases. */
  readOnly?: boolean;

  /**
   * WFA-006: anything the hosting canvas wants to say about the world outside
   * this graph — today, a cloud function's callers and its deploy button.
   *
   * A slot rather than a set of props on purpose: this bar is the shared
   * navigation surface for every canvas in the editor, and the one thing it must
   * not learn is what a workflow is. Nothing is rendered when it is absent, so an
   * ordinary component's trail takes the same code path it takes today.
   */
  statusSlot?: React.ReactNode;

  /**
   * TVW-006 — the structure lane's `All · Structure · Logic` filter.
   *
   * Absent on a canvas that has no lane to filter (and in every existing test), and the segmented
   * control is not rendered then. It is state the CANVAS owns, not this bar: the bar reads it and
   * reports a press, which is why it arrives as a value and a callback rather than as a hook.
   */
  laneFilter?: LaneFilter;
  onLaneFilterChange?: (filter: LaneFilter) => void;
}

/** §2: the three segments, in the order the mock's callout 5 draws them. */
const LANE_FILTERS: Array<{ value: LaneFilter; label: string; title: string }> = [
  { value: 'all', label: 'All', title: 'Show the whole graph' },
  { value: 'structure', label: 'Structure', title: 'Dim everything that is not the screen' },
  { value: 'logic', label: 'Logic', title: 'Dim the screen' }
];

/**
 * TVW-006 — the lane filter, at the right of the trail.
 *
 * ⚠️ The words are *dim*, never *hide* or *show only* (R-F). A label that said "Only structure"
 * would promise something the canvas deliberately does not do: a dimmed node is still there, still
 * clickable and still connectable, and someone who pressed a control labelled "only" and then
 * clicked a node that should not have been there would think the filter was broken.
 */
function LaneFilterControl({
  value,
  onChange
}: {
  value: LaneFilter;
  onChange: (filter: LaneFilter) => void;
}) {
  return (
    <div className={css['LaneFilter']} role="group" aria-label="Structure lane filter" data-test="lane-filter">
      {LANE_FILTERS.map((segment) => (
        <button
          key={segment.value}
          type="button"
          className={classNames(css['LaneFilterSegment'], value === segment.value && css['is-active'])}
          aria-pressed={value === segment.value}
          title={segment.title}
          data-test={`lane-filter-${segment.value}`}
          onClick={() => onChange(segment.value)}
        >
          {segment.label}
        </button>
      ))}
    </div>
  );
}

/**
 * PAR-003: the mock's bottom bar — component navigation as pill tabs, a "+"
 * bound to the existing new-component flow (same templates/popup as the
 * components panel), and an honest "Preview live" status bound to viewer
 * client presence. Navigation behavior is unchanged from the old trail.
 */
export function NodeGraphComponentTrail({
  componentTrail,

  canNavigateBack,
  canNavigateForward,

  onSwitchToComponent,
  onHistoryBack,
  onHistoryForward,

  runtimeType,
  readOnly,
  statusSlot,
  laneFilter,
  onLaneFilterChange
}: NodeGraphComponentTrailProps) {
  const trailRef = useRef<HTMLDivElement>(null);

  /**
   * SPR-005 — where this bar's "+" creates into.
   *
   * On a cloud function's canvas the menu offers **Cloud Function Component**, and the component it
   * creates has to land inside `#__cloud__`: a component with `noodl.cloud.request`/`response`
   * roots sitting *outside* it is not matched by `isCloudFunctionComponent`, so no backend is ever
   * sent it and no `call-function` step can resolve it. It looks like a cloud function in the tree
   * and is not one.
   *
   * TVW-001 (e): that used to be done with `useComponentActions({ sheetPrefix })`, which silently
   * prefixed every name the bar produced. `sheetPrefix` is gone with the sheets, so the destination
   * is now said out loud — as the create context's `parentPath`, the same field every other surface
   * uses to name where a new component lands.
   */
  const isCloudCanvas = runtimeType === RuntimeType.Cloud;
  const { handleAddComponent } = useComponentActions();

  /**
   * A workflow is not a component and is not stored in the project, so no
   * component template declares `runtimeTypes: ['workflow']` — the "+" opened an
   * empty menu on a workflow canvas. It is not rendered there now. That removes
   * a control that did nothing; what a workflow canvas *should* offer instead is
   * phase 43's (canvas identity and first-run), not this task's.
   */
  const canCreateComponents = runtimeType !== RuntimeType.Workflow;

  // Change the scroll direction to horizontal.
  function onScroll(event: React.WheelEvent<HTMLDivElement>) {
    if (trailRef.current) {
      event.preventDefault();
      trailRef.current.scrollLeft += event.deltaY + event.deltaX;
    }
  }

  // Same create menu as the components panel's empty-space context menu —
  // the existing new-component action, reachable from the bar. SPR-005 made
  // that literally the same builder rather than a second copy of it, so the
  // bar and the panel cannot offer different things or land them differently.
  const createContext = {
    // The bar creates at the root of the section the canvas belongs to, which is a folder context —
    // the same one the panel's empty space declares.
    forParentType: 'folder' as const,
    runtimeType: (isCloudCanvas ? 'cloud' : 'browser') as 'browser' | 'cloud',
    parentPath: isCloudCanvas ? CLOUD_CREATE_PARENT_PATH : undefined
  };

  function onNewComponentClick() {
    showContextMenuInPopup({
      title: createMenuTitle(createContext),
      // No `onAddFolder`: this bar has no folder tree to put one in.
      items: buildCreateMenuItems(createContext, { onAddComponent: handleAddComponent }),
      width: MenuDialogWidth.Default
    });
  }

  return (
    <div className={css['Root']}>
      <div className={css['HistoryControls']}>
        <IconButton
          icon={IconName.CaretLeft}
          onClick={onHistoryBack}
          variant={IconButtonVariant.OpaqueOnHover}
          isDisabled={!canNavigateBack}
          UNSAFE_className={css['HistoryButton']}
        />
        <IconButton
          icon={IconName.CaretRight}
          onClick={onHistoryForward}
          variant={IconButtonVariant.OpaqueOnHover}
          isDisabled={!canNavigateForward}
          UNSAFE_className={css['HistoryButton']}
        />
      </div>

      <div className={css['TrailContainer']}>
        <div ref={trailRef} className={css['Trail']} onWheel={onScroll}>
          {componentTrail.map((item) => {
            if (item.component)
              return <Item key={item.fullName} item={item} onSwitchToComponent={onSwitchToComponent} />;

            return (
              <Tooltip
                UNSAFE_triggerClassName={css['ItemTrigger']}
                content={'Has no graph'}
                key={item.fullName}
                isNotHiddenOnClick
              >
                <Item item={item} onSwitchToComponent={onSwitchToComponent} />
              </Tooltip>
            );
          })}
        </div>
      </div>

      {!readOnly && canCreateComponents && (
        /* SPR-005: the tooltip names the destination, so a "+" on a cloud
           function's canvas says it creates into Cloud Functions before it is
           clicked. */
        <Tooltip content={createMenuTitle(createContext)}>
          <button
            className={css['NewComponentButton']}
            aria-label={createMenuTitle(createContext)}
            title={createMenuTitle(createContext)}
            data-test="trail-new-component"
            onClick={onNewComponentClick}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            >
              <path d="M8 3v10M3 8h10" />
            </svg>
          </button>
        </Tooltip>
      )}

      <div className={css['Spacer']} />

      {laneFilter && onLaneFilterChange && (
        <LaneFilterControl value={laneFilter} onChange={onLaneFilterChange} />
      )}

      {statusSlot}

      <PreviewLiveStatus />
    </div>
  );
}

/**
 * "Preview live" (mock `.status`): shown only while at least one viewer client
 * is connected — bound to ViewerConnection client presence, updated on its
 * `viewerClientsChanged` notifications. Nothing is rendered otherwise.
 */
function PreviewLiveStatus() {
  const [isLive, setIsLive] = useState(() => Boolean(ViewerConnection.instance?.hasConnectedViewer));

  useEffect(() => {
    const connection = ViewerConnection.instance;
    if (!connection) return;

    const group = {};
    connection.on(
      'viewerClientsChanged',
      () => {
        setIsLive(connection.hasConnectedViewer);
      },
      group
    );

    return () => {
      connection.off(group);
    };
  }, []);

  if (!isLive) return null;

  return (
    <span className={css['Status']} data-test="preview-live-status">
      <i aria-hidden="true" />
      Preview live
    </span>
  );
}

interface ItemProps {
  item: ComponentTrailItem;
  onSwitchToComponent: NodeGraphComponentTrailProps['onSwitchToComponent'];
}

function Item({ item, onSwitchToComponent }: ItemProps) {
  let icon = getIconFromItem(item);
  const itemRef = useRef<HTMLDivElement>(null);

  // change a visual component icon to be a regular component icon in the trail
  // @ts-expect-error fix this when we refactor the component sidebar to not use the old HTML templates
  if (icon === 2) {
    icon = IconName.Component;
  }

  useEffect(() => {
    if (!itemRef.current || !item.isCurrent) return;

    itemRef.current.scrollIntoView();
  }, [itemRef.current, item.isCurrent]);

  /**
   * TVW-001 (e) — a legacy `#Sheet` crumb.
   *
   * Written as `name.substring(1, -1) === '#'` until slice 4, which reads as "the second character"
   * and is not: JS `substring` swaps a reversed range and clamps the negative to 0, so it returned
   * the *first* character. Right answer, by an expression nobody could check.
   *
   * The `#` is stripped here for the same reason the tree strips it — the two surfaces name the
   * same folder, and after slice 4 the tree calls it `Design`. `folderSegmentLabel` is the one rule
   * they share.
   */
  const isSheet = !item.component && item.name.startsWith('#');
  const name = isSheet ? folderSegmentLabel(item.name) : item.name;

  if (item.name === '#__cloud__') return null;

  const rootComponent = getDefaultComponent();
  let isRootComponent = false;

  if (rootComponent.id) {
    isRootComponent = rootComponent.id === item.id;
  } else {
    isRootComponent = rootComponent.name === item.fullName;
  }

  return (
    <div
      ref={itemRef}
      className={classNames(
        css['Item'],
        item.component ? css['is-component'] : css['is-folder'],
        item.isCurrent && css['is-current']
      )}
      aria-current={item.isCurrent ? 'page' : undefined}
      onClick={() => {
        if (!item.component || item.isCurrent) return;
        onSwitchToComponent(item.component, { pushHistory: true });
      }}
    >
      {/* Mock: only the current tab carries the component glyph. */}
      {icon && !isSheet && item.isCurrent && (
        <Icon icon={isRootComponent ? IconName.Home : icon} size={IconSize.Tiny} UNSAFE_className={css['Icon']} />
      )}
      <span className={css['Label']}>{name}</span>
      {item.component && Boolean(item.stateText) && <span className={css['StateText']}>({item.stateText})</span>}
    </div>
  );
}

function getIconFromItem(item: TSFixme): IconName {
  if (!item.component) return IconName.FolderClosed;

  const iconType = getComponentIconType(item.component);
  if (iconType) {
    // TODO: Typescript, ugly typings, is there a better way?
    return iconType as unknown as IconName;
  }

  return IconName.Component;
}
