// One edit, in the editor suite's vocabulary (@nodegx/project-contract/editor-suite), performed
// through the map's model: the same method the page's button for it calls. Plain ES module.

export function perform(model, edit) {
  const key = edit.component;
  switch (edit.edit) {
    case 'add_node': {
      const id = model.addNode(key, {
        type: edit.type,
        parent: edit.parent,
        index: edit.index,
        parameters: edit.parameters,
        label: edit.label,
        x: edit.x,
        y: edit.y
      });
      return { id };
    }
    case 'remove_node':
      model.removeNode(key, edit.id);
      return undefined;
    case 'connect':
      model.connect(key, edit.from, edit.to);
      return undefined;
    case 'disconnect':
      model.disconnect(key, edit.from, edit.to);
      return undefined;
    case 'set_parameter':
      model.setParameter(key, edit.id, edit.name, edit.value);
      return undefined;
    case 'move':
      model.move(key, edit.id, edit.x, edit.y);
      return undefined;
    case 'rename':
      model.rename(key, edit.id, edit.label);
      return undefined;
    case 'add_child':
      model.reparent(key, edit.id, edit.parent, edit.index);
      return undefined;
    default:
      throw new Error(`The map does not know the edit ${JSON.stringify(edit)}.`);
  }
}
