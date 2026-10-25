// NPMAUDIT-BACKENDMAPSCREENS: an app that reads and writes records from its pages, with no cloud
// function, has screens on the map. Before, `analyseProject` found screens only through CloudFunction2
// calls, so the todo template (every read and write on its pages) had `screens: []`. Read-only: the
// template is opened in place and nothing is written.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyseProject, openProject } from '../lib/project.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const TODO = path.resolve(here, '..', '..', '..', '..', '..', 'templates', 'todo-list');

const app = analyseProject(openProject(TODO), ['Task', 'Action', 'Event', 'Routine', 'RoutineCheck']);
assert.deepEqual(app.calls, [], 'the todo template calls no cloud function (the premise)');
assert.deepEqual(app.screens, ['Pages/Todo'], 'its page is a screen');

const on = (table, how) => app.uses.filter((u) => u.screen === 'Pages/Todo' && u.table === table && u.how === how);
assert.ok(on('Task', 'reads').length >= 1, 'the page reads Task');
assert.equal(on('Task', 'reads')[0].trigger.kind, 'open', 'a query with nothing wired into it runs when the screen opens');
assert.ok(on('Task', 'creates').length >= 1, 'the page creates a Task (Add task)');
assert.ok(on('Action', 'changes').length >= 1, 'the page changes an Action');
for (const u of app.uses) assert.ok(u.inside === null || typeof u.inside === 'string', 'each use says which component it sits in');
console.log(`PASS — ${app.uses.length} reads and writes on ${app.screens.length} screen(s), no function between`);
