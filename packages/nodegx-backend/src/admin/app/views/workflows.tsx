/**
 * Workflows — WF-001 step DAGs, ported as-is from the vanilla page (BMG-001
 * §3.1). Run and cancel here; author them in the editor.
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode } from '../api';
import { EmptyState } from '../composers';
import { cellText } from '../format';
import { Btn, Dialog, Gap, Page, Row, Sub, Table, WriteBtn, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

interface Workflow {
  id: string;
  name?: unknown;
  entry?: unknown;
  steps?: unknown[];
}

export function WorkflowsView(_props: ViewProps) {
  const [list, setList] = useState<Workflow[] | null>(null);

  function load() {
    api<{ workflows?: Workflow[]; definitions?: Workflow[] }>('GET', '/admin/workflow-defs')
      .then((d) => setList((d && (d.workflows || d.definitions)) || []))
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  function run(workflow: Workflow) {
    openModal((close) => <RunDialog workflow={workflow} close={close} />);
  }

  return (
    <Page title="Workflows" subtitle="WF-001 step DAGs. Run and cancel here; author them in the editor.">
      <Row>
        <Btn onClick={load}>Refresh</Btn>
      </Row>
      <Gap />
      {list ? (
        <Table
          columns={['Id', 'Name', 'Entry', 'Steps', '']}
          rows={list}
          empty={
            <EmptyState icon="⇶" action={{ label: 'Refresh', onClick: load, write: false }}>
              No workflows yet. Workflows are authored in the editor.
            </EmptyState>
          }
          renderRow={(w) => (
            <tr key={w.id}>
              <td>{w.id}</td>
              <td>{cellText(w.name)}</td>
              <td>{cellText(w.entry)}</td>
              <td>{String((w.steps || []).length)}</td>
              <td class="actions">
                <WriteBtn tiny kind="primary" onClick={() => run(w)}>
                  Run
                </WriteBtn>
              </td>
            </tr>
          )}
        />
      ) : null}
    </Page>
  );
}

function RunDialog({ workflow, close }: { workflow: Workflow; close: () => void }) {
  const [payload, setPayload] = useState('{}');

  function go() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch (e) {
      return fail(new Error('Not valid JSON: ' + (e as Error).message));
    }
    api<{ status?: string }>('POST', '/admin/workflow-defs/' + encode(workflow.id) + '/run', { payload: parsed })
      .then((result) => {
        close();
        toast('Run finished: ' + (result && result.status ? result.status : 'see Runs') + '.', 'ok');
      })
      .catch(fail);
  }

  return (
    <Dialog
      title={'Run ' + workflow.id}
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <Btn kind="primary" onClick={go}>
            Run
          </Btn>
        </>
      }
    >
      <Sub>Run payload (JSON) — becomes each step’s base input.</Sub>
      <textarea value={payload} aria-label="Run payload (JSON)" onInput={(e) => setPayload((e.currentTarget as HTMLTextAreaElement).value)} />
    </Dialog>
  );
}
