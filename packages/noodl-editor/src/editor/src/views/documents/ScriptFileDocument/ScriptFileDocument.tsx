/**
 * P109 ISL-005 — a project script file, open in the editor (the mockup's third screen).
 *
 * `scripts/engine/stepper.js` opens here from the Scripts list: the code on the left, and beside it
 * what the file **gives** (its `exports`), what it **uses** (its `use()` lines), the Functions that
 * **use it**, and where it **runs**.
 *
 * ## Why this is not `CodeFileDocument`
 *
 * `CodeFileDocument` edits a file on disk directly. A script file is part of the project
 * (`ProjectModel.scripts`): the saver writes it with the same moved-on-disk guard as every other
 * project file, the preview hears `scriptsChanged` and re-runs the Functions using it, and an agent's
 * write comes back through the file watcher. Editing the disk from here as well would be a second
 * writer racing the first. So this document reads and writes the project, and the project the disk.
 *
 * ## Saving
 *
 * Cmd-S (or Save) puts the text on the project: the preview re-runs at once and the autosave writes
 * the file. Dirty is derived (`draft !== null && draft !== saved`), as `CodeFileDocument` derives it.
 * An outside write while the text is unsaved is not taken over the person's text: it is reported, and
 * the saver's own guard refuses to write over the file until they choose.
 *
 * @module noodl-editor/views/documents/ScriptFileDocument
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { AppRegistry, IDocumentProvider } from '@noodl-models/app_registry';
import { ProjectModel } from '@noodl-models/projectmodel';
import { NodeGraphContextTmp } from '@noodl-contexts/NodeGraphContext/NodeGraphContext';

import { IconName } from '@noodl-core-ui/components/common/Icon';
import { JavaScriptEditor } from '@noodl-core-ui/components/code-editor';
import { PrimaryButton, PrimaryButtonSize, PrimaryButtonVariant } from '@noodl-core-ui/components/inputs/PrimaryButton';
import { Label } from '@noodl-core-ui/components/typography/Label';
import { Text, TextType } from '@noodl-core-ui/components/typography/Text';

import { scriptAlias, scriptGives, scriptUses } from '@noodl/runtime/src/scriptfiles';

import { scriptUsersOf, type ScriptUser } from '../../../models/ScriptFiles/scriptUsers';
import codeCss from '../CodeFileDocument/CodeFileDocument.module.scss';
import { EditorDocumentProvider } from '../EditorDocument';
import css from './ScriptFileDocument.module.scss';

const EVENT_GROUP = 'ScriptFileDocument';

export interface ScriptFileDocumentProps {
  /** As the project names it: relative to `scripts/`, e.g. `engine/stepper.js`. */
  path: string;
}

/** Open a script file in the editor. */
export function openScriptFile(path: string): void {
  AppRegistry.instance.openDocument(ScriptFileDocumentProvider.ID, { path });
}

/** Back to the canvas, on the component a Function lives in, with the Function selected. */
function openUser(user: ScriptUser): void {
  const component = ProjectModel.instance?.getComponentWithName(user.component);
  if (!component) return;
  AppRegistry.instance.openDocument(EditorDocumentProvider.ID);
  const node = component.graph.findNodeWithId(user.nodeId);
  NodeGraphContextTmp.switchToComponent(component, { node: node ?? undefined, pushHistory: true });
}

export function ScriptFileDocument({ path }: ScriptFileDocumentProps) {
  const project = ProjectModel.instance;
  const [saved, setSaved] = useState<string | undefined>(() => project?.getScript(path));
  const [draft, setDraft] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Bumped when the project's scripts or Functions change, so "Used by" is read again.
  const [generation, setGeneration] = useState(0);

  const dirty = draft !== null && draft !== saved;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;

  useEffect(() => {
    setSaved(project?.getScript(path));
    setDraft(null);
    setNotice(null);
  }, [project, path]);

  useEffect(() => {
    if (!project) return;
    const onScripts = (event?: { path?: string; paths?: string[]; fromDisk?: boolean }) => {
      setGeneration((g) => g + 1);
      const touched = !event || (event.path === undefined && event.paths === undefined) || event.path === path || event.paths?.includes(path);
      if (!touched) return;
      const now = project.getScript(path);
      if (event?.fromDisk && dirtyRef.current) {
        setNotice(
          `scripts/${path} changed on disk while you were editing. Your unsaved text is still here; ` +
            'the project keeps the file on disk until you save or discard.'
        );
        return;
      }
      setSaved(now);
      if (!event?.fromDisk) return;
      setDraft(null);
    };
    project.on('scriptsChanged', onScripts, EVENT_GROUP);
    // A Function gaining or losing this file in its Uses changes "Used by".
    project.on(['parametersChanged', 'componentAdded', 'componentRemoved'], () => setGeneration((g) => g + 1), EVENT_GROUP);
    return () => {
      project.off(EVENT_GROUP);
    };
  }, [project, path]);

  const save = useCallback(
    (value?: string) => {
      const next = value ?? draft;
      if (!project || next === null || next === undefined) return;
      project.setScript(path, next);
      setSaved(next);
      setDraft(null);
      setNotice(null);
    },
    [project, path, draft]
  );

  const discard = useCallback(() => {
    setSaved(project?.getScript(path));
    setDraft(null);
    setNotice(null);
  }, [project, path]);

  const close = useCallback(() => AppRegistry.instance.openDocument(EditorDocumentProvider.ID), []);

  const text = draft ?? saved ?? '';
  const gives = useMemo(() => scriptGives(text), [text]);
  const uses = useMemo(() => scriptUses(text), [text]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const users = useMemo(() => scriptUsersOf(project, path), [project, path, generation]);

  const folder = path.includes('/') ? path.substring(0, path.lastIndexOf('/')) : '';
  const name = path.substring(path.lastIndexOf('/') + 1);

  return (
    <div className={codeCss.Root}>
      <div className={codeCss.Topbar}>
        <Label hasLeftSpacing>{name}</Label>
        <div className={codeCss.Identity}>
          <Text textType={TextType.Shy}>
            scripts/{path}
            {dirty ? ' — unsaved' : ''}
          </Text>
        </div>
        <div className={codeCss.Actions}>
          <PrimaryButton
            label={dirty ? 'Save' : 'Saved'}
            icon={IconName.Check}
            size={PrimaryButtonSize.Small}
            variant={PrimaryButtonVariant.MutedOnLowBg}
            isDisabled={!dirty}
            onClick={() => save()}
            testId="script-file-save"
          />
          <PrimaryButton
            label="Close"
            icon={IconName.ArrowLineLeft}
            size={PrimaryButtonSize.Small}
            variant={PrimaryButtonVariant.MutedOnLowBg}
            onClick={close}
            testId="script-file-close"
          />
        </div>
      </div>

      {saved === undefined && (
        <div className={codeCss.Notice} data-test="script-file-missing">
          The project has no script file scripts/{path}. Saving creates it.
        </div>
      )}

      {notice && (
        <div className={codeCss.Notice} data-test="script-file-notice">
          <span>{notice}</span>
          <span className={codeCss.NoticeSpacer} />
          <PrimaryButton
            label="Discard mine and reload"
            size={PrimaryButtonSize.Small}
            variant={PrimaryButtonVariant.MutedOnLowBg}
            onClick={discard}
            testId="script-file-discard"
          />
        </div>
      )}

      <div className={css.Body}>
        <div className={codeCss.Surface} data-test="script-file-surface">
          <JavaScriptEditor
            value={text}
            onChange={setDraft}
            onSave={(value) => save(value)}
            validationType="scriptfile"
            subject="file"
            width="100%"
            height="100%"
          />
        </div>

        <aside className={css.Facts} aria-label={`About scripts/${path}`} data-test="script-file-facts">
          <section className={css.Group}>
            <h3 className={css.GroupHeading}>In a Function</h3>
            <code className={css.Alias}>Scripts.{scriptAlias(path)}</code>
            <p className={css.Help}>
              {folder ? `scripts/${folder}` : 'scripts'} · a Function that lists this file under Uses reaches it by this
              name.
            </p>
          </section>

          <section className={css.Group}>
            <h3 className={css.GroupHeading}>Gives</h3>
            {gives.length > 0 ? (
              <div className={css.Pills}>
                {gives.map((g) => (
                  <code key={g} className={css.Pill}>
                    {g}
                  </code>
                ))}
              </div>
            ) : (
              <p className={css.Help}>Nothing yet. A file offers a value with exports.name = …</p>
            )}
          </section>

          <section className={css.Group}>
            <h3 className={css.GroupHeading}>Uses</h3>
            {uses.length > 0 ? (
              uses.map((u) => (
                <button key={u} type="button" className={css.LinkRow} onClick={() => openScriptFile(u)}>
                  <span className={css.FileName}>{u}</span>
                </button>
              ))
            ) : (
              <p className={css.Help}>No other files. A file reaches another with use(&apos;engine/world&apos;).</p>
            )}
          </section>

          <section className={css.Group}>
            <h3 className={css.GroupHeading}>
              Used by <span className={css.Count}>{users.length === 1 ? '1 Function' : `${users.length} Functions`}</span>
            </h3>
            {users.length > 0 ? (
              users.map((u) => (
                <button
                  key={u.component + '#' + u.nodeId}
                  type="button"
                  className={css.LinkRow}
                  onClick={() => openUser(u)}
                  title={`Open ${u.component}`}
                >
                  <span className={css.FileName}>{u.component.replace(/^\//, '')}</span>
                  <span className={css.RowMeta}>{u.label}</span>
                </button>
              ))
            ) : (
              <p className={css.Help}>No Function uses this file yet. Add it under a Function&apos;s Uses.</p>
            )}
          </section>

          <section className={css.Group}>
            <h3 className={css.GroupHeading}>Runs in</h3>
            <dl className={css.Runs}>
              <dt>Browser</dt>
              <dd className={css.Yes}>Yes</dd>
              <dt>Server render</dt>
              <dd className={css.Yes}>Yes</dd>
              <dt>Cloud functions</dt>
              <dd className={css.NotYet}>Not yet</dd>
            </dl>
            <p className={css.Help}>Inside a file there is no Noodl, window or document. Calls into the app stay in the Function.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

export class ScriptFileDocumentProvider implements IDocumentProvider {
  public static ID = 'ScriptFileDocumentProvider';

  getComponent() {
    return ScriptFileDocument;
  }
}
