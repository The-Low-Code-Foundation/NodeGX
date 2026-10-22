import * as fs from 'fs';
import * as path from 'path';

import { Desk, Graph, RawNode, placeAll, writeDeskProject } from './root-desk';

/**
 * "Record Desk" (EXP-022 S3): the record verbs, a query and the session, the backend nodes todo-list is made of, on one
 * page, written with a backend declared. `the-same-graph-in-swift-s3.test.ts` §D drives it in the exported SwiftUI app and
 * in the React export, both answered by one fake Parse backend (`fake-parse-backend.js`, its record and user routes):
 * the same readings and the same wire, because both hosts run one client.
 *
 * The arms read every drawn Text in document order: signed, name, loginError, badError, then one title per row of the
 * For Each over the query's items (`/Row`).
 *
 * - **Load** sends the Query Records' Fetch (`Task`, sorted by title; its boxes unticked, so it asks only when sent).
 * - **Sign in** / **Wrong password**: a Log In with its own username and password; the wrong one's Error is drawn.
 * - **Add** creates a Task titled "Fourth"; **Rename** writes "Renamed" over t1; **Remove** deletes t3. Each one's Done
 *   sends Load's Fetch again, so the rows show what the backend now holds.
 * - **Bad** writes a Task whose Id is a Variable nothing sets: the runtime's "Missing Record Id", drawn from its Error.
 * - **Sign out** logs out. The User node's Authenticated and Username are drawn throughout.
 */

export const RECORD_DESK_APP_ID = 'record-desk';
export const RECORD_DESK_ENDPOINT = 'http://backend.test';

export const RECORD_DESK_BACKEND = {
  classes: {
    Task: [
      { objectId: 't1', title: 'First', done: false },
      { objectId: 't2', title: 'Second', done: true },
      { objectId: 't3', title: 'Third', done: false }
    ]
  },
  sessions: { 'tok-ann': { objectId: 'u1', name: 'Ann', role: 'admin' } },
  users: [{ objectId: 'u1', username: 'ann', password: 'pw', email: 'ann@x.test', sessionToken: 'tok-ann' }]
};

const button = (id: string, label: string): RawNode => ({ id, type: 'net.noodl.controls.button', label, parent: 'shell', parameters: { label } });
const text = (id: string, label: string): RawNode => ({ id, type: 'Text', label, parent: 'shell', parameters: {} });

const homeGraph = (): Graph => {
  const shell = ['loadBtn', 'signInBtn', 'wrongBtn', 'addBtn', 'renameBtn', 'removeBtn', 'badBtn', 'signOutBtn', 'signedText', 'nameText', 'loginErrorText', 'badErrorText', 'tasksEach'];
  const nodes: RawNode[] = [
    { id: 'page', type: 'Page', label: 'Home', parameters: { title: 'Record Desk', urlPath: 'home' }, children: ['shell'] },
    { id: 'shell', type: 'Group', label: 'Shell', parent: 'page', children: shell, parameters: { flexDirection: 'column' } },
    button('loadBtn', 'Load'),
    button('signInBtn', 'Sign in'),
    button('wrongBtn', 'Wrong password'),
    button('addBtn', 'Add'),
    button('renameBtn', 'Rename'),
    button('removeBtn', 'Remove'),
    button('badBtn', 'Bad'),
    button('signOutBtn', 'Sign out'),
    text('signedText', 'Signed in?'),
    text('nameText', 'Name'),
    text('loginErrorText', 'Login error'),
    text('badErrorText', 'Bad error'),
    { id: 'tasksEach', type: 'For Each', label: 'One row per task', parent: 'shell', parameters: { template: '/Row' } },
    {
      id: 'tasks',
      type: 'DbCollection2',
      label: 'The tasks',
      parameters: {
        collectionName: 'Task',
        'runOnChange-collectionName': false,
        'runOnChange-querySettings': false,
        storageEnableLimit: true,
        storageLimit: 100,
        visualSort: [{ property: 'title', order: 'ascending' }]
      }
    },
    { id: 'logIn', type: 'net.noodl.user.LogIn', label: 'Sign in', parameters: { username: 'ann', password: 'pw' } },
    { id: 'logInWrong', type: 'net.noodl.user.LogIn', label: 'Sign in wrongly', parameters: { username: 'ann', password: 'nope' } },
    { id: 'logOut', type: 'net.noodl.user.LogOut', label: 'Sign out', parameters: {} },
    { id: 'user', type: 'net.noodl.user.User', label: 'Who is signed in', parameters: {} },
    { id: 'add', type: 'NewDbModelProperties', label: 'Add a task', parameters: { collectionName: 'Task', 'prop-title': 'Fourth', 'prop-done': false } },
    { id: 'rename', type: 'SetDbModelProperties', label: 'Rename the first', parameters: { collectionName: 'Task', idSource: 'explicit', modelId: 't1', 'prop-title': 'Renamed' } },
    { id: 'remove', type: 'DeleteDbModelProperties', label: 'Remove the third', parameters: { collectionName: 'Task', idSource: 'explicit', modelId: 't3' } },
    { id: 'bad', type: 'SetDbModelProperties', label: 'Write with no id', parameters: { collectionName: 'Task', idSource: 'explicit', 'prop-title': 'x' } },
    { id: 'pickVar', type: 'Variable2', label: 'pick', parameters: { name: 'pick' } }
  ];
  return {
    nodes: placeAll(nodes),
    connections: [
      { fromId: 'loadBtn', fromProperty: 'onClick', toId: 'tasks', toProperty: 'storageFetch' },
      { fromId: 'signInBtn', fromProperty: 'onClick', toId: 'logIn', toProperty: 'login' },
      { fromId: 'wrongBtn', fromProperty: 'onClick', toId: 'logInWrong', toProperty: 'login' },
      { fromId: 'logInWrong', fromProperty: 'error', toId: 'loginErrorText', toProperty: 'text' },
      { fromId: 'addBtn', fromProperty: 'onClick', toId: 'add', toProperty: 'store' },
      { fromId: 'add', fromProperty: 'done', toId: 'tasks', toProperty: 'storageFetch' },
      { fromId: 'renameBtn', fromProperty: 'onClick', toId: 'rename', toProperty: 'store' },
      { fromId: 'rename', fromProperty: 'done', toId: 'tasks', toProperty: 'storageFetch' },
      { fromId: 'removeBtn', fromProperty: 'onClick', toId: 'remove', toProperty: 'store' },
      { fromId: 'remove', fromProperty: 'done', toId: 'tasks', toProperty: 'storageFetch' },
      { fromId: 'badBtn', fromProperty: 'onClick', toId: 'bad', toProperty: 'store' },
      { fromId: 'pickVar', fromProperty: 'value', toId: 'bad', toProperty: 'modelId' },
      { fromId: 'bad', fromProperty: 'error', toId: 'badErrorText', toProperty: 'text' },
      { fromId: 'signOutBtn', fromProperty: 'onClick', toId: 'logOut', toProperty: 'login' },
      { fromId: 'user', fromProperty: 'authenticated', toId: 'signedText', toProperty: 'text' },
      { fromId: 'user', fromProperty: 'username', toId: 'nameText', toProperty: 'text' },
      { fromId: 'tasks', fromProperty: 'items', toId: 'tasksEach', toProperty: 'items' }
    ]
  };
};

/** A row: the task's title on a Text. */
const rowGraph = (): Graph => ({
  nodes: placeAll([
    { id: 'rwRoot', type: 'Group', label: 'Row', children: ['rwTitle'], parameters: {} },
    { id: 'rwTitle', type: 'Text', label: 'Title', parent: 'rwRoot', parameters: {} },
    { id: 'rwIn', type: 'Component Inputs', label: 'Inputs', parameters: {}, ports: [{ name: 'title', plug: 'output', type: 'string' }] }
  ]),
  connections: [{ fromId: 'rwIn', fromProperty: 'title', toId: 'rwTitle', toProperty: 'text' }]
});

export const recordDesk = (): Desk => ({ components: { 'Pages/Home': homeGraph(), Row: rowGraph() } });

/** The desk written as a v2 project with its backend and its `Task` schema declared. */
export const writeRecordDesk = (edit?: (d: Desk) => void, opts: { dir?: string } = {}): { dir: string; desk: Desk } => {
  const desk = recordDesk();
  edit?.(desk);
  const dir = writeDeskProject(desk, { name: 'Record Desk', idBase: 'c9e31f00-0000-4000-8000-0000000030', prefix: 'record-desk-' }, opts.dir);
  const file = path.join(dir, 'nodegx.project.json');
  const project = JSON.parse(fs.readFileSync(file, 'utf-8'));
  project.metadata = {
    cloudservices: { endpoint: RECORD_DESK_ENDPOINT, appId: RECORD_DESK_APP_ID },
    dbCollections: [{ name: 'Task', columns: [{ name: 'title', type: 'String' }, { name: 'done', type: 'Boolean' }] }]
  };
  fs.writeFileSync(file, JSON.stringify(project, null, 2) + '\n');
  return { dir, desk };
};
