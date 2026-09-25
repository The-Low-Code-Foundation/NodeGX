/**
 * Secrets — the values cloud functions read through a Secret node (BMG-011
 * §3.3), over `GET/PUT/DELETE /admin/secrets`. Names only ever come back;
 * a value is typed once, write-only, and the page says so once. The name
 * rules are the server's (`secretsModel.ts`).
 */
import { useEffect, useState } from 'preact/hooks';

import { api, encode, useSession } from '../api';
import { EmptyState } from '../composers';
import { SecretListing, canSaveSecret, describeDeleteOutcome, environmentOnlyVariables, envNameForSecret, secretNameProblem } from '../secretsModel';
import { ActionCell, Btn, Card, Chip, Dialog, Field, Gap, Hint, Notice, Page, Row, Spacer, Sub, Table, WriteBtn, confirmDestructive, fail, openModal, toast } from '../ui';
import type { ViewProps } from './index';

interface SecretsData {
  namespace: string;
  secrets: SecretListing[];
  environment: string[];
  readable: boolean;
  envPrefix: string;
}

export function SecretsView(_props: ViewProps) {
  const { readonly } = useSession();
  const [data, setData] = useState<SecretsData | null>(null);

  function load() {
    api<SecretsData>('GET', '/admin/secrets')
      .then(setData)
      .catch(fail);
  }
  useEffect(() => {
    load();
  }, []);

  function add() {
    openModal((close) => <SecretDialog close={close} taken={(data && data.secrets.map((s) => s.name)) || []} onSaved={load} />);
  }

  function replace(s: SecretListing) {
    openModal((close) => <SecretDialog close={close} fixedName={s.name} taken={[]} onSaved={load} />);
  }

  function remove(s: SecretListing) {
    confirmDestructive(
      'Delete secret ' + s.name + '?',
      'Every Secret node asking for "' + s.name + '" fires its failure output from the next run. This cannot be undone: the value is not kept anywhere else.',
      s.name,
      () => {
        api<{ name: string; existed: boolean; stillResolvesFromEnvironment: boolean; envName: string }>('DELETE', '/admin/secrets/' + encode(s.name))
          .then((outcome) => {
            const said = describeDeleteOutcome(outcome);
            toast(said.message, said.severity);
            load();
          })
          .catch(fail);
      }
    );
  }

  const envOnly = data ? environmentOnlyVariables(data.secrets, data.environment) : [];

  return (
    <Page title="Secrets" subtitle="Keys and passwords your cloud functions read with a Secret node. A value is typed once and never shown again.">
      {data ? (
        <div>
          <Row>
            <Spacer />
            <WriteBtn tiny kind="primary" id="add-secret" onClick={add}>
              Add secret
            </WriteBtn>
          </Row>
          <Gap />
          <Table
            columns={['Name', 'In a function', 'Also in the environment', '']}
            rows={data.secrets}
            renderRow={(s) => (
              <tr key={s.name} data-secret={s.name}>
                <td>
                  <b>{s.name}</b>
                </td>
                <td>
                  <span class="hint">{'Secret node → ' + s.name}</span>
                </td>
                <td>
                  {s.alsoInEnvironment ? (
                    <Chip kind="warn" title={s.envName + ' is set where this backend runs; the stored value wins while it exists.'}>
                      {'yes — ' + s.envName}
                    </Chip>
                  ) : (
                    <span class="hint">no</span>
                  )}
                </td>
                <ActionCell>
                  <WriteBtn tiny disabled={readonly} onClick={() => replace(s)}>
                    Set a new value
                  </WriteBtn>
                  <WriteBtn tiny kind="danger" disabled={readonly} onClick={() => remove(s)}>
                    Delete
                  </WriteBtn>
                </ActionCell>
              </tr>
            )}
            empty={<EmptyState action={{ label: 'Add secret', onClick: add }}>No secrets yet. A function that needs an API key or a password reads it from here, never from its code.</EmptyState>}
          />
          {envOnly.length ? (
            <div style="margin-top:12px">
              <Notice>
                {'Set in the environment this backend runs in, not here: '}
                {envOnly.map((v, i) => (
                  <span key={v}>
                    {i ? ', ' : ''}
                    <code>{v}</code>
                  </span>
                ))}
                {'. A function resolves those too; to change one, change the environment and restart.'}
              </Notice>
            </div>
          ) : null}
          <Sub style="margin-top:10px">Values stay in this backend's secrets.json and are never sent back to a browser, an agent or a log — this page cannot show one, and neither can anything else.</Sub>
        </div>
      ) : null}
    </Page>
  );
}

function SecretDialog({ close, fixedName, taken, onSaved }: { close: () => void; fixedName?: string; taken: string[]; onSaved: () => void }) {
  const [name, setName] = useState(fixedName || '');
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problem = secretNameProblem(name) || (!fixedName && taken.indexOf(name) !== -1 ? 'There is already a secret called "' + name + '". Set a new value on it instead.' : null);
  const ready = canSaveSecret({ name, value, busy }) && !problem;

  function save() {
    if (!ready) return;
    setBusy(true);
    api<{ created: boolean }>('PUT', '/admin/secrets/' + encode(name), { value })
      .then((r) => {
        toast((r.created ? 'Stored ' : 'Replaced ') + name + '. Functions read the new value from their next run.', 'ok');
        close();
        onSaved();
      })
      .catch((e) => {
        setBusy(false);
        setError((e as Error).message);
      });
  }

  return (
    <Dialog
      title={fixedName ? 'Set a new value for ' + fixedName : 'Add a secret'}
      actions={
        <>
          <Btn onClick={close}>Cancel</Btn>
          <WriteBtn kind="primary" id="secret-save" disabled={!ready} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </WriteBtn>
        </>
      }
    >
      {fixedName ? null : (
        <Field label="Name — what a Secret node asks for">
          <input type="text" id="secret-name" value={name} placeholder="STRIPE_KEY" autocomplete="off" spellcheck={false} onInput={(e) => setName((e.currentTarget as HTMLInputElement).value)} />
        </Field>
      )}
      {problem ? <Hint>{problem}</Hint> : name ? <div class="hint">{'Also read from the environment as ' + envNameForSecret(name)}</div> : null}
      <Gap h={8} />
      <Field label="Value">
        <input type="password" id="secret-value" value={value} autocomplete="new-password" onInput={(e) => setValue((e.currentTarget as HTMLInputElement).value)} onKeyDown={(e) => e.key === 'Enter' && save()} />
      </Field>
      <div class="hint">Shown once, here, as you type it. After Save nothing can read it back — not this page, not an agent, not a log.</div>
      {error ? <Notice kind="bad">{error}</Notice> : null}
    </Dialog>
  );
}
