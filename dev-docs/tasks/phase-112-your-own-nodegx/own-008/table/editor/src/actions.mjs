// The one door every change comes through: the page posts these objects to /api/action, and the
// suite's adapter hands the same objects here. One JSON object per thing a person does.
import { CellRefusal } from './session.mjs';

export function applyAction(session, a) {
  const c = a.component;
  switch (a.action) {
    case 'addNode':
      return { id: session.addNode(c, { type: a.type, parent: a.parent, index: a.index, label: a.label, x: a.x, y: a.y }) };
    case 'removeNode':
      return { removed: session.removeNode(c, a.node) };
    case 'setCell':
      return { value: session.setCell(c, a.node, a.column, a.text) };
    case 'clearCell':
      session.clearCell(c, a.node, a.column);
      return {};
    case 'connect':
      session.connect(c, a.from, a.to);
      return {};
    case 'disconnect':
      session.disconnect(c, a.from, a.to);
      return {};
    case 'revert':
      session.revert(c);
      return {};
    default:
      throw new CellRefusal(`There is no action "${a.action}".`);
  }
}
