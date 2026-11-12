/**
 * EXP-022 S6 — adding a task and closing one, in both exports (P18-EXP022-S4-ADDREFUSED, -DIALOGREFUSED).
 *
 * S4's drive found the two writes neither export could make, both the plan's. Richard ruled them fixed before the reveal
 * (EXP-022 §9 S6). The plan now carries:
 *
 * §A the dialog: a States text a state leaves empty is the empty text (the runtime's own reading), so `Todo/Dialog flow`
 *    translates and every dialog opens;
 * §B a record's Id: inside a Create's or an Update's Done chain it is the answer's id (`verb-id`); a Function only verbs'
 *    Ids feed reads it at each run, from the verb whose Done runs it; a Create's Id into a placed component's input is a
 *    row written before the Done chain, so the component's pulse arrives with it;
 * §C a Set as Object written untouched where the value is never a string (a Function output only object literals write);
 * §D what still refuses, by name;
 * §E the dialog drawn over the page: its scrim's CSS Style read as the runtime reads it (React), the full-screen fixed
 *    scrim a full-screen cover (Swift) (P18-EXP022-S6-NOOVERLAY).
 *
 * Every row reads the printed text of both exports of the real todo-list template, or of a copy changed one fact at a
 * time. The drive that shows the writes reaching the backend is outside the suite (`exp-022/s6/`).
 */

import * as path from 'path';

import { loadCatalog } from '../src/catalog';
import { parseProject } from '../src/parse/parseProject';
import { emitApp } from '../src/emit/emitApp';
import { emitSwiftApp } from '../src/emit/swift/emitSwift';
import { readStyleCss } from '../src/emit/style';
import type { ExportIR, NodeIR, ConnectionIR } from '../src/ir/types';

const TODO = path.join(__dirname, '..', '..', '..', 'templates', 'todo-list');
const catalog = loadCatalog();
const todoIr = parseProject(TODO, catalog);
const web = emitApp(todoIr, catalog);
const phone = emitSwiftApp(todoIr, catalog);
const kit = 'Sources/TodoListKit';
const notes = web.notes.join('\n');

const clone = (): ExportIR => JSON.parse(JSON.stringify(todoIr)) as ExportIR;
const componentOf = (ir: ExportIR, p: string) => ir.components.find((c) => c.path === p)!;
const nodeOf = (ir: ExportIR, p: string, id: string): NodeIR => componentOf(ir, p).nodes.find((n) => n.id === id)!;
const notesOf = (ir: ExportIR): string => emitApp(ir, catalog).notes.join('\n');

describe('§A every dialog opens', () => {
  it('A1 Dialog flow’s switch translates, its texts empty in the state with no dialog, in both exports', () => {
    expect(notes).not.toContain('has no authored value');
    expect(web.files['src/components/DialogFlow.tsx']).toContain(
      "heading: { type: 'string', byState: { none: '', close: 'What happened?'"
    );
    expect(phone.files[`${kit}/Views/DialogFlowView.swift`]).toContain('"none": ["open": false, "heading": "", "help": "", "ok": "", "optional": false],');
  });

  it('A2 the switch hands the placed Note dialog its values (open, heading, help, OK, optional), read at render, in both', () => {
    const flow = web.files['src/components/DialogFlow.tsx'];
    for (const [prop, value] of [['open', 'open'], ['heading', 'heading'], ['help', 'help'], ['okLabel', 'ok'], ['optional', 'optional']]) {
      expect(flow).toContain(`${prop}={whatTheDialogIsAsking.values.${value}}`);
      expect(phone.files[`${kit}/Views/DialogFlowView.swift`]).toContain(`${prop}: Self.WHAT_THE_DIALOG_IS_ASKING_STATES[whatTheDialogIsAsking]?["${value}"]`);
    }
    expect(notes).not.toMatch(/Todo\/Dialog flow: wire dfMode:/);
  });
});

describe('§B a record’s Id', () => {
  it('B1 Add task: the new task’s id is the row the history line’s taskId reads, written before its pulse, in both', () => {
    const addTask = web.files['src/components/AddTask.tsx'];
    const lines = addTask.split('\n').map((l) => l.trim());
    const create = lines.findIndex((l) => l.startsWith('const addTheTaskRecord = await createTask({'));
    expect(create).toBeGreaterThan(-1);
    expect(lines.slice(create + 1, create + 3)).toEqual(['setAddTheTaskId(addTheTaskRecord.id);', 'setWriteTheHistoryLineDoPulses((v) => v + 1);']);
    expect(addTask).toContain('taskId: addTheTaskId,');

    const swift = phone.files[`${kit}/Logic/AddTaskLogic.swift`].split('\n').map((l) => l.trim());
    const call = swift.findIndex((l) => l.startsWith('let addTheTaskRecord = try await Scripts.shared.api("createTask", ['));
    expect(call).toBeGreaterThan(-1);
    expect(swift.slice(call + 1, call + 3)).toEqual(['addTheTaskId = JS.field(addTheTaskRecord, "id")', 'writeTheHistoryLineDoPulses += 1']);
    expect(notes).not.toMatch(/Commands\/Add task: .*Id output is consumed/);
  });

  it('B2 Write history: “Remember it” reads the Id of the write whose Done runs it — the new line’s, or the extended one’s', () => {
    const history = web.files['src/components/WriteHistory.tsx'];
    expect(history).toContain('const addTheLineRecord = await createEvent({');
    expect(history).toContain('id: addTheLineRecord.id }, rememberItToExtendNextTimeNode);');
    expect(history).toContain('const extendTheLastLineRecord = await updateEvent(');
    expect(history).toContain('id: extendTheLastLineRecord.id }, rememberItToExtendNextTimeNode);');
    // `pending` is what the deciding Function sent just before its pulse: that pulse's own values.
    expect(history.match(/\{ pending: aNewLineOrExtendTheLastOnePulse\.values\.pending, id: /g)).toHaveLength(2);

    const swift = phone.files[`${kit}/Logic/WriteHistoryLogic.swift`];
    expect(swift).toContain('"id": JS.field(addTheLineRecord, "id")])');
    expect(swift).toContain('"id": JS.field(extendTheLastLineRecord, "id")])');
    expect(notes).not.toContain('Logic/Write history:');
  });

  it('B3 a verb whose Done chain reads nothing of it binds nothing: the answer is dropped, as before', () => {
    const anyCall = Object.values(web.files).join('\n').match(/^\s*await update[A-Z]\w*\(/m);
    expect(anyCall).not.toBeNull();
  });
});

describe('§C Set as Object', () => {
  it('C1 a Function output only object literals write is stored untouched (the runtime converts only a string)', () => {
    expect(web.files['src/components/WriteHistory.tsx']).toContain('todoLastHistory.set(rememberItToExtendNextTimePulse.values.value);');
    expect(phone.files[`${kit}/Logic/WriteHistoryLogic.swift`]).toContain('variables.todoLastHistory = JS.field(rememberItToExtendNextTimePulse.values, "value")');
  });

  it('C2 an output the body can write a string into still refuses by name', () => {
    const ir = clone();
    const remember = nodeOf(ir, 'Logic/Write history', 'whRemember');
    const script = remember.parameters.find((p) => p.name === 'functionScript')!;
    script.value = { kind: 'script', source: 'Outputs.value = Inputs.id;\nOutputs.go();' };
    expect(notesOf(ir)).toContain('setWith "object" conversion is not translated in step 5');
  });
});

describe('§D what still refuses, by name', () => {
  it('D1 a Create’s Id read outside its Done chain (Add routine lifts it as an output)', () => {
    expect(notes).toContain(
      "Commands/Add routine: node AddroutineOut (Component Outputs) deferred: value output \"id\" is fed by NewDbModelProperties — its Id is read outside its Done chain"
    );
  });

  it('D2 a run of a Function a record’s Id feeds, from a trigger outside that record’s Done chain', () => {
    const ir = clone();
    const history = componentOf(ir, 'Logic/Write history');
    const wire: ConnectionIR = { key: 'whIn:do->whRemember:run', fromId: 'whIn', fromProperty: 'do', toId: 'whRemember', toProperty: 'run', kind: 'signal' };
    history.connections.push(wire);
    expect(notesOf(ir)).toContain("is a record's Id, and this run is not in that record's Done chain");
  });

  it('D3 a Delete’s Id consumed refuses as before', () => {
    const ir = clone();
    nodeOf(ir, 'Commands/Add task', 'AddtaskCreate').type = 'DeleteDbModelProperties';
    expect(notesOf(ir)).toMatch(/Commands\/Add task: .*its Id output is consumed — the record it names exists only inside the invoking chain/);
  });
});

describe('§E the dialog is drawn over the page (P18-EXP022-S6-NOOVERLAY)', () => {
  it('E1 React: the scrim’s CSS Style lands in its class, after the ports, so the fixed scrim sits at the top left and dims the page', () => {
    const css = web.files['src/components/NoteDialog.module.css'];
    const scrim = css.slice(css.indexOf('.ndScrim {'), css.indexOf('}', css.indexOf('.ndScrim {')));
    for (const line of ['position: fixed;', 'width: 100%;', 'height: 100%;', 'top: 0;', 'left: 0;', 'background-color: rgba(20, 22, 24, 0.45);']) {
      expect(scrim).toContain(line);
    }
    expect(notes).not.toContain('parameter styleCss on ndScrim');
  });

  it('E2 a CSS Style is read exactly as the runtime reads it: one error and none of it applies', () => {
    expect(readStyleCss('top: 0; left: 0; /* a note */ background-color: rgba(1, 2, 3, 0.5);')).toEqual({
      decls: [{ prop: 'top', value: '0' }, { prop: 'left', value: '0' }, { prop: 'background-color', value: 'rgba(1, 2, 3, 0.5)' }]
    });
    expect(readStyleCss('top: 0; left 0;')).toEqual({ error: 'Syntax error: left 0' });
    // A url's colon is a second colon: the runtime refuses the whole text, so does the export.
    expect(readStyleCss('background: url(http://x/y.png); top: 0')).toEqual({ error: 'Syntax error: background: url(http://x/y.png)' });
    // Only the first newline is dropped (`replace('\n', '')`): a second one inside a part is a missing semicolon.
    expect(readStyleCss('top: 0\nleft: 0\nright: 0')).toEqual({ error: 'Missing semicolon: top: 0left: 0' });
  });

  it('E3 a declaration that could close the stylesheet rule early is left out, and said', () => {
    const ir = clone();
    const scrim = nodeOf(ir, 'Todo/Note dialog', 'ndScrim');
    scrim.parameters.find((p) => p.name === 'styleCss')!.value = { kind: 'script', source: 'top: 0; color: red} .x {color' };
    const out = emitApp(ir, catalog);
    expect(out.files['src/components/NoteDialog.module.css']).not.toContain('red}');
    expect(out.notes.join('\n')).toContain('its CSS Style declaration "color: red} .x {color" is not a plain declaration');
  });

  it('E4 Swift: the full-screen fixed scrim is a full-screen cover, shown while the dialog is open, and no longer a lost look', () => {
    const view = phone.files[`${kit}/Views/NoteDialogView.swift`].split('\n').map((l) => l.trim());
    const open = view.indexOf('if JS.truthy(open) {');
    expect(view.slice(open + 1, open + 3)).toEqual(['Color.clear.frame(width: 0, height: 0)', '.fixedOverlay {']);
    expect(phone.files[`${kit}/Views/NoteDialogView.swift`]).toContain('.frame(maxWidth: .infinity, maxHeight: .infinity)');
    expect(phone.files[`${kit}/Views/NoteDialogView.swift`]).toContain('.background(Color(red: 0.078, green: 0.086, blue: 0.094, opacity: 0.45))');
    expect(phone.files[`${kit}/Support.swift`]).toContain('self.fullScreenCover(isPresented: .constant(true)) { content().presentationBackground(.clear) }');
    expect(phone.preflight.webOnly.filter((w) => w.nodes.includes('Todo/Note dialog#ndScrim'))).toEqual([]);
  });

  it('E5 a fixed element that is not the whole screen stays a named loss', () => {
    const ir = clone();
    const scrim = nodeOf(ir, 'Todo/Note dialog', 'ndScrim');
    scrim.parameters.find((p) => p.name === 'styleCss')!.value = { kind: 'script', source: 'top: 12px; left: 0;' };
    const out = emitSwiftApp(ir, catalog);
    expect(out.files[`${kit}/Views/NoteDialogView.swift`]).not.toContain('.fixedOverlay {');
    const lost = out.preflight.webOnly.filter((w) => w.nodes.includes('Todo/Note dialog#ndScrim')).map((w) => w.decl);
    expect(lost).toEqual(expect.arrayContaining(['position: fixed', 'top: 12px']));
  });
});
