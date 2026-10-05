/**
 * P109 ISL-005 — the Scripts section of the Components panel (the mockup's first screen).
 *
 * The project's script files, `scripts/**.js`, under their own heading below the component sections:
 * folders as they are on disk, each file opening in the script view (`ScriptFileDocument`), and a
 * "New script" row. Drawn with the tree's own row classes so a script row and a component row are the
 * same height, inset and hover.
 *
 * Its own small list rather than a fourth kind of `TreeNode`: a script is not a component — it cannot
 * be dragged into a folder of components, made home or placed — and the tree's drag, rename and filter
 * machinery is all about components. The filter does reach it: a script whose path matches shows.
 */

import classNames from 'classnames';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { ProjectModel } from '@noodl-models/projectmodel';

import { Icon, IconName, IconSize } from '@noodl-core-ui/components/common/Icon';

import { normalizeScriptPath } from '@noodl/runtime/src/scriptfiles';

import { scriptUsageIndex } from '../../../../models/ScriptFiles/scriptUsers';
import { openScriptFile } from '../../../documents/ScriptFileDocument';
import { ToastLayer } from '../../../ToastLayer/ToastLayer';
import css from '../ComponentsPanel.module.scss';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const PopupLayer = require('@noodl-views/popuplayer').default;

const EVENT_GROUP = 'ComponentsPanel.ScriptsSection';

interface ScriptFolder {
  name: string;
  path: string;
  folders: ScriptFolder[];
  files: string[];
}

function folderTree(paths: string[]): ScriptFolder {
  const root: ScriptFolder = { name: '', path: '', folders: [], files: [] };
  for (const p of paths) {
    const parts = p.split('/');
    let at = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const path = parts.slice(0, i + 1).join('/');
      let next = at.folders.find((f) => f.path === path);
      if (!next) {
        next = { name: parts[i], path, folders: [], files: [] };
        at.folders.push(next);
      }
      at = next;
    }
    at.files.push(p);
  }
  const sort = (f: ScriptFolder) => {
    f.folders.sort((a, b) => a.name.localeCompare(b.name));
    f.files.sort();
    f.folders.forEach(sort);
  };
  sort(root);
  return root;
}

/** Ask for a name and create an empty script there; opens it. */
export function promptNewScript(folder = ''): void {
  const popup = new PopupLayer.StringInputPopup({
    label: 'New script file',
    okLabel: 'Create',
    cancelLabel: 'Cancel',
    placeholder: folder ? `${folder}/tiles.js` : 'e.g. engine/tiles.js',
    onOk: (typed: string) => {
      const project = ProjectModel.instance;
      const path = normalizeScriptPath(folder && !typed.includes('/') ? `${folder}/${typed}` : typed);
      if (!project || path === undefined) {
        ToastLayer.showError('Name the file inside scripts/, e.g. engine/tiles.js');
        return;
      }
      if (project.getScript(path) !== undefined) {
        ToastLayer.showError(`scripts/${path} already exists`);
        return;
      }
      project.setScript(path, `// scripts/${path}\n\nexports.example = function () {\n  return true;\n};\n`);
      PopupLayer.instance.hidePopup();
      openScriptFile(path);
    }
  });
  popup.render();
  PopupLayer.instance.showPopup({ content: popup, position: 'screen-center', isBackgroundDimmed: true, hasDynamicHeight: true });
}

export interface ScriptsSectionProps {
  /** The panel's filter text; a script shows when its path contains it. Empty: every script. */
  filterQuery?: string;
  /** The script open in the editor, highlighted like the active component. */
  activePath?: string;
}

export function ScriptsSection({ filterQuery = '', activePath }: ScriptsSectionProps) {
  const project = ProjectModel.instance;
  const [generation, setGeneration] = useState(0);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!project) return;
    project.on(['scriptsChanged', 'parametersChanged', 'componentAdded', 'componentRemoved'], () => setGeneration((g) => g + 1), EVENT_GROUP);
    return () => {
      project.off(EVENT_GROUP);
    };
  }, [project]);

  const query = filterQuery.trim().toLowerCase();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const paths = useMemo(() => (project ? project.getScriptPaths() : []), [project, generation]);
  const shown = useMemo(() => (query ? paths.filter((p) => p.toLowerCase().includes(query)) : paths), [paths, query]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const users = useMemo(() => scriptUsageIndex(project), [project, generation]);
  const tree = useMemo(() => folderTree(shown), [shown]);

  const toggle = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  if (query && shown.length === 0) return null;

  const renderFolder = (folder: ScriptFolder, level: number): React.ReactNode[] => {
    const rows: React.ReactNode[] = [];
    for (const sub of folder.folders) {
      const open = query !== '' || !collapsed.has(sub.path);
      rows.push(
        <div
          key={'d:' + sub.path}
          className={classNames(css['TreeItem'], css['IsFolder'])}
          style={{ '--level': String(level) } as React.CSSProperties}
          data-test="script-tree-folder"
          title={`scripts/${sub.path}`}
          onClick={() => toggle(sub.path)}
        >
          <div className={classNames(css['Caret'], { [css['Expanded']]: open })}>
            <Icon icon={IconName.CaretRight} size={IconSize.Tiny} />
          </div>
          <div className={css['ItemContent']}>
            <div className={classNames(css['Icon'], css['Cat-default'])}>
              <Icon icon={open ? IconName.FolderOpen : IconName.FolderClosed} size={IconSize.Small} />
            </div>
            <div className={css['Label']}>{sub.name}</div>
          </div>
        </div>
      );
      if (open) rows.push(...renderFolder(sub, level + 1));
    }
    for (const file of folder.files) {
      const count = users.get(file)?.length ?? 0;
      rows.push(
        <div
          key={'f:' + file}
          className={classNames(css['TreeItem'], { [css['Selected']]: file === activePath })}
          style={{ '--level': String(level) } as React.CSSProperties}
          data-test="script-tree-item"
          data-path={file}
          title={`scripts/${file}${count > 0 ? ` · used by ${count} Function${count === 1 ? '' : 's'}` : ''}`}
          onClick={() => openScriptFile(file)}
        >
          <div className={css['CaretSlot']} />
          <div className={css['ItemContent']}>
            <div className={classNames(css['Icon'], css['Cat-javascript'])}>
              <Icon icon={IconName.Code} size={IconSize.Small} />
            </div>
            <div className={css['Label']}>{file.substring(file.lastIndexOf('/') + 1)}</div>
            {count > 0 && <span className={css['ScriptUses']}>{count}</span>}
          </div>
        </div>
      );
    }
    return rows;
  };

  return (
    <>
      <div className={css['Section']} data-test="component-tree-section" data-section="scripts" role="heading" aria-level={2}>
        <span className={css['SectionLabel']}>Scripts</span>
        <span className={css['SectionCount']}>{paths.length}</span>
      </div>
      {paths.length === 0 && (
        <div className={css['SectionEmpty']}>Shared code for Functions. Each file is one copy, used by any Function that lists it.</div>
      )}
      {renderFolder(tree, 0)}
      {!query && (
        <div
          className={css['TreeItem']}
          style={{ '--level': '0' } as React.CSSProperties}
          data-test="script-tree-new"
          role="button"
          tabIndex={0}
          onClick={() => promptNewScript()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') promptNewScript();
          }}
        >
          <div className={css['CaretSlot']} />
          <div className={css['ItemContent']}>
            <div className={classNames(css['Icon'], css['ScriptNewIcon'])}>
              <Icon icon={IconName.Plus} size={IconSize.Small} />
            </div>
            <div className={classNames(css['Label'], css['ScriptNewLabel'])}>New script</div>
          </div>
        </div>
      )}
    </>
  );
}
