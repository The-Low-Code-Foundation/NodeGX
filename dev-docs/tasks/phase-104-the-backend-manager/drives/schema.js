    // -------------------------------------------------------------- schema --

    view('schema', 'Schema', 'Data', 'schema', function (root) {
      var node = page('Schema', 'Your collections and their fields. Click a field name to rename it, or its type to change it.');
      root.appendChild(node);
      var body = el('div');
      var tableNames = [];
      node.appendChild(el('div.row', {}, writeButton('New collection', 'primary', createTable), el('button.btn', { type: 'button', text: 'Refresh', onclick: load })));
      node.appendChild(el('div', { style: 'height:12px' }));
      node.appendChild(body);
      load();

      function load() {
        api('GET', '/admin/schema')
          .then(function (data) {
            clear(body);
            var tables = data.tables || [];
            tableNames = tables.map(function (t) { return t.name; });
            if (!tables.length) {
              return void body.appendChild(el('div.notice', {}, 'No collections yet. ',
                writeButton('Create the first one', 'primary', createTable)));
            }
            tables.forEach(function (t) { body.appendChild(tableCard(t)); });
          })
          .catch(fail);
      }

      function tableCard(t) {
        var card = el('div.card');
        var system = t.name.charAt(0) === '_';
        var columns = t.columns || [];
        card.appendChild(
          el('div.row', {},
            el('b', { text: t.name, style: 'color:#eef2f6' }),
            system ? chip('system', 'warn') : null,
            chip(columns.length + ' field(s)'),
            chip(declaredCount(t) + ' index(es)'),
            el('span', { style: 'flex:1' }),
            el('button.btn.tiny', { type: 'button', text: 'Open records', onclick: function () { S.openCollection = t.name; location.hash = '#/collections'; } }),
            writeButton('Add field', null, function () { addColumn(t); }),
            writeButton('Indexes', null, function () { editIndexes(t); }),
            system ? null : writeButton('Delete collection', 'danger', function () { deleteTable(t.name); })
          )
        );
        card.appendChild(el('div', { style: 'height:8px' }));

        var rows = [
          { name: 'objectId', type: 'String', note: 'unique id, set by the backend' },
          { name: 'createdAt', type: 'Date', note: 'set by the backend' },
          { name: 'updatedAt', type: 'Date', note: 'set by the backend' }
        ].concat(columns.filter(function (c) { return !isSystemField(c.name); }));
        card.appendChild(
          table(['Field', 'Type', 'Required', 'Default'], rows, function (c) {
            var owned = !!c.note || isServerOwned(t.name, c.name);
            var locked = owned || S.readonly;
            return el('tr', { class: owned ? 'sys' : null },
              el('td', {}, locked ? c.name : renameTrigger(t, c)),
              el('td', {}, locked || c.type === 'Relation' ? typeBadge(c) : typeTrigger(t, c)),
              el('td', { text: c.required ? '✓' : '' }),
              el('td.shy', { text: c.note || (c.defaultValue !== undefined && c.defaultValue !== null ? String(c.defaultValue) : '') })
            );
          })
        );
        if (!columns.filter(function (c) { return !isSystemField(c.name); }).length) {
          card.appendChild(el('div.row', { style: 'margin-top:8px' }, el('span.hint', { text: 'No fields of your own yet.' }),
            writeButton('+ Add a field', 'primary', function () { addColumn(t); })));
        }

        // FED-002. Listed beside the columns because that is where a person looks
        // for "what shape is this collection": an index is part of the shape,
        // and a `unique` one is a rule about what may be written.
        var indexes = t.indexes || [];
        if (indexes.length) {
          card.appendChild(el('div', { style: 'height:8px' }));
          card.appendChild(
            table(['Index', 'Fields', 'Unique', 'Order', 'State'], indexes, function (i) {
              return el('tr', {},
                el('td', { text: i.name }),
                el('td', { text: (i.fields || []).join(', ') }),
                el('td', { text: i.unique ? 'yes' : '' }),
                el('td', { text: i.order === 'desc' ? 'newest / largest first' : 'ascending' }),
                el('td', {}, i.declared === false
                  ? chip('not declared', 'warn')
                  : (i.built ? chip('built', 'ok') : chip('missing', 'bad')))
              );
            })
          );
        }
        return card;
      }

      /** The field name, as a button that turns into its own rename box. */
      function renameTrigger(t, c) {
        var button = el('button.inline-edit', { type: 'button', text: c.name, title: 'Rename ' + c.name });
        button.addEventListener('click', function () {
          var input = el('input', { type: 'text', value: c.name, style: 'width:160px' });
          var cellNode = button.parentNode;
          clear(cellNode).appendChild(input);
          input.focus();
          input.select();
          var done = false;
          function finish(commit) {
            if (done) return;
            done = true;
            var next = input.value.trim();
            if (!commit || next === c.name) return load();
            var taken = (t.columns || []).map(function (x) { return x.name; }).filter(function (n) { return n !== c.name; });
            var problem = validName(next, taken, 'The field');
            if (problem) { toast(problem, 'bad'); return load(); }
            api('POST', '/admin/schema', { action: 'renameColumn', table: t.name, oldName: c.name, newName: next })
              .then(function () { toast('Renamed ' + c.name + ' to ' + next + '. Update any app logic that uses the old name.', 'ok'); })
              .catch(fail)
              .then(load);
          }
          input.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); finish(true); }
            else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
          });
          input.addEventListener('blur', function () { finish(true); });
        });
        return button;
      }

      /** The type badge, as a dropdown. Changing it converts what is stored, so it asks first. */
      function typeTrigger(t, c) {
        var select = el('select.inline-type', { title: 'Change the type of ' + c.name });
        COLUMN_TYPES.forEach(function (type) {
          if (type === 'Relation' || (type === 'Pointer' && c.type !== 'Pointer')) return;
          select.appendChild(el('option', { value: type, text: type + (type === c.type && c.targetClass ? ' → ' + c.targetClass : ''), selected: type === c.type }));
        });
        select.addEventListener('change', function () {
          var next = select.value;
          select.value = c.type;
          var ref = {};
          ref.ref = modal('Change ' + c.name + ' to ' + next + '?', [
            el('p', { text: 'Values already stored in ' + t.name + '.' + c.name + ' are converted from ' + c.type + ' to ' + next + '.' }),
            el('div.notice.warn', { text: 'A conversion can lose information: text that is not a number becomes 0, and a list or object turned into text stays text.' })
          ], [
            cancelButton(ref),
            el('button.btn.primary', {
              type: 'button', text: 'Change type',
              onclick: function () {
                ref.ref.close();
                api('POST', '/admin/schema', { action: 'changeColumnType', table: t.name, column: c.name, type: next })
                  .then(function (r) {
                    var n = (r && r.convertedValues) || 0;
                    toast(c.name + ' is now ' + next + (n ? ' — ' + n + ' stored value(s) converted.' : '.'), 'ok');
                  })
                  .catch(fail)
                  .then(load);
              }
            })
          ]);
        });
        return select;
      }

      /** Declared indexes only — drift is listed but is not part of the count. */
      function declaredCount(t) {
        var declared = 0;
        (t.indexes || []).forEach(function (i) { if (i.declared !== false) declared++; });
        return declared;
      }

      /**
       * One editable line per field in a new-collection or add-field form:
       * name, type, what a Pointer points at, required, and a default.
       */
      function fieldLine(onRemove) {
        var name = el('input', { type: 'text', placeholder: 'fieldName' });
        var type = el('select');
        COLUMN_TYPES.forEach(function (x) { type.appendChild(el('option', { value: x, text: x })); });
        var target = el('select.hidden');
        tableNames.forEach(function (n) { target.appendChild(el('option', { value: n, text: '→ ' + n })); });
        var required = el('input', { type: 'checkbox' });
        var dflt = el('input', { type: 'text', placeholder: 'default (optional)' });
        function sync() {
          var pointy = type.value === 'Pointer' || type.value === 'Relation';
          target.classList.toggle('hidden', !pointy);
          dflt.classList.toggle('hidden', ['String', 'Number', 'Boolean'].indexOf(type.value) === -1);
          dflt.placeholder = type.value === 'Boolean' ? 'true or false' : 'default (optional)';
        }
        type.addEventListener('change', sync);
        sync();
        var line = el('div.field-line', {}, name, type, target, el('label.check', {}, required, 'Required'), dflt,
          onRemove ? el('button.btn.tiny', { type: 'button', text: '✕', title: 'Remove this field', onclick: function () { onRemove(line); } }) : null);
        line.read = function (taken) {
          var n = name.value.trim();
          var problem = validName(n, taken, 'Each field');
          if (problem) throw new Error(problem);
          var column = { name: n, type: type.value };
          if (type.value === 'Pointer' || type.value === 'Relation') {
            if (!target.value) throw new Error(n + ': choose the collection it points at.');
            column.targetClass = target.value;
          }
          if (required.checked) column.required = true;
          var d = dflt.value.trim();
          if (d && !dflt.classList.contains('hidden')) {
            if (type.value === 'Number') {
              if (isNaN(Number(d))) throw new Error(n + ': the default must be a number.');
              column.defaultValue = Number(d);
            } else if (type.value === 'Boolean') {
              if (d !== 'true' && d !== 'false') throw new Error(n + ': the default must be true or false.');
              column.defaultValue = d === 'true';
            } else column.defaultValue = d;
          }
          return column;
        };
        line.isBlank = function () { return !name.value.trim(); };
        line.focus = function () { name.focus(); };
        return line;
      }

      function createTable() {
        var ref = {};
        var name = el('input', { type: 'text', placeholder: 'e.g. Products, Orders, Members', style: 'width:100%' });
        var lines = el('div.form-grid');
        var error = el('div.notice.bad.hidden');
        function addLine() {
          var line = fieldLine(function (l) { lines.removeChild(l); });
          lines.appendChild(line);
          return line;
        }
        addLine();
        ref.ref = modal('New collection', [
          el('div.field', {}, el('b', { text: 'Name' }), name),
          el('div', { style: 'height:12px' }),
          el('div.field-head', {}, el('b', { text: 'Fields' }), el('span.hint', { text: 'More can be added later. objectId, createdAt and updatedAt come for free.' })),
          lines,
          el('button.btn.tiny', { type: 'button', text: '+ Add field', style: 'margin-top:8px', onclick: function () { addLine().focus(); } }),
          error
        ], [
          cancelButton(ref),
          el('button.btn.primary', {
            type: 'button', text: 'Create collection',
            onclick: function () {
              var tableName = name.value.trim();
              var columns = [];
              try {
                if (!tableName) throw new Error('The collection needs a name.');
                if (!NAME_RULE.test(tableName)) throw new Error('A collection name starts with a letter, then letters, digits or _ only.');
                if (tableNames.indexOf(tableName) !== -1) throw new Error('There is already a collection called ' + tableName + '.');
                Array.prototype.forEach.call(lines.children, function (line) {
                  if (line.isBlank()) return;
                  columns.push(line.read(columns.map(function (c) { return c.name; })));
                });
              } catch (e) {
                error.textContent = e.message;
                error.classList.remove('hidden');
                return;
              }
              api('POST', '/admin/schema', { action: 'createTable', table: tableName, columns: columns })
                .then(function () { ref.ref.close(); toast('Collection ' + tableName + ' created.', 'ok'); load(); })
                .catch(function (e) { error.textContent = e.message; error.classList.remove('hidden'); });
            }
          })
        ]);
        ref.ref.box.classList.add('wide');
        setTimeout(function () { name.focus(); }, 0);
      }

      function addColumn(t) {
        var ref = {};
        var line = fieldLine(null);
        var error = el('div.notice.bad.hidden');
        ref.ref = modal('Add a field to ' + t.name, [line, error], [
          cancelButton(ref),
          el('button.btn.primary', {
            type: 'button', text: 'Add field',
            onclick: function () {
              var column;
              try { column = line.read((t.columns || []).map(function (c) { return c.name; })); } catch (e) {
                error.textContent = e.message;
                error.classList.remove('hidden');
                return;
              }
              api('POST', '/admin/schema', { action: 'addColumn', table: t.name, column: column })
                .then(function () { ref.ref.close(); toast(column.name + ' added to ' + t.name + '.', 'ok'); load(); })
                .catch(function (e) { error.textContent = e.message; error.classList.remove('hidden'); });
            }
          })
        ]);
        ref.ref.box.classList.add('wide');
        setTimeout(line.focus, 0);
      }

      /**
       * FED-002 — the declaration, edited as rows. Names are derived, so there is
       * nothing to name here; the whole list is sent, so removing a row drops
       * its index.
       */
      function editIndexes(t) {
        var ref = {};
        var fields = (t.columns || []).map(function (c) { return c.name; })
          .filter(function (n) { return n !== 'createdAt' && n !== 'updatedAt'; });
        if (fields.indexOf('objectId') === -1) fields.unshift('objectId');
        var list = el('div.form-grid');
        var error = el('div.notice.bad.hidden');

        function fieldSelect(value, optional) {
          var s = el('select');
          if (optional) s.appendChild(el('option', { value: '', text: optional }));
          fields.forEach(function (f) { s.appendChild(el('option', { value: f, text: f, selected: f === value })); });
          return s;
        }

        function addRow(index) {
          index = index || { fields: [fields[0]] };
          var first = fieldSelect(index.fields[0]);
          var second = fieldSelect(index.fields[1], 'then… (optional)');
          var third = fieldSelect(index.fields[2], 'then… (optional)');
          var unique = el('input', { type: 'checkbox', checked: !!index.unique });
          var order = el('select', {},
            el('option', { value: 'asc', text: 'Ascending' }),
            el('option', { value: 'desc', text: 'Descending', selected: index.order === 'desc' }));
          var row = el('div.field-line', {}, first, second, third, el('label.check', {}, unique, 'Unique'), order,
            el('button.btn.tiny', { type: 'button', text: '✕', title: 'Drop this index', onclick: function () { list.removeChild(row); } }));
          row.read = function () {
            var picked = [first.value, second.value, third.value].filter(Boolean);
            if (picked.length !== picked.filter(function (v, i) { return picked.indexOf(v) === i; }).length) {
              throw new Error('An index lists each field once.');
            }
            var out = { fields: picked };
            if (unique.checked) out.unique = true;
            if (order.value === 'desc') out.order = 'desc';
            return out;
          };
          list.appendChild(row);
        }

        (t.indexes || []).filter(function (i) { return i.declared !== false; }).forEach(addRow);
        ref.ref = modal('Indexes on ' + t.name, [
          el('p.sub', {
            text: 'An index makes lookups on its fields fast. Unique also refuses a second record with the same values. ' +
              'createdAt and updatedAt are always indexed. Removing a row drops that index.'
          }),
          list,
          el('button.btn.tiny', { type: 'button', text: '+ Add index', style: 'margin-top:8px', onclick: function () { addRow(); } }),
          error
        ], [
          cancelButton(ref),
          el('button.btn.primary', {
            type: 'button', text: 'Apply',
            onclick: function () {
              var indexes;
              try { indexes = Array.prototype.map.call(list.children, function (r) { return r.read(); }); } catch (e) {
                error.textContent = e.message;
                error.classList.remove('hidden');
                return;
              }
              api('POST', '/admin/schema', { action: 'setIndexes', table: t.name, indexes: indexes })
                .then(function (result) {
                  ref.ref.close();
                  var created = (result && result.indexesCreated) || [];
                  var dropped = (result && result.indexesDropped) || [];
                  toast('Indexes applied: ' + created.length + ' created, ' + dropped.length + ' dropped.', 'ok');
                  load();
                })
                .catch(function (e) { error.textContent = e.message; error.classList.remove('hidden'); });
            }
          })
        ]);
        ref.ref.box.classList.add('wide');
      }

      // The spec's named item: `backend:deleteTable` existed as a handler with
      // no caller. This is the caller — behind a typed confirmation.
      function deleteTable(tableName) {
        confirmDestructive(
          'Delete collection ' + tableName,
          'Every record in "' + tableName + '" is destroyed along with the collection. Permissions and triggers that reference it are NOT removed and will start failing.',
          tableName,
          function () {
            api('POST', '/admin/schema', { action: 'deleteTable', table: tableName })
              .then(function (result) {
                if (result && result.deleted === false) toast('The backend reported that "' + tableName + '" was not deleted.', 'bad');
                else toast('Collection "' + tableName + '" deleted.', 'ok');
                load();
              })
              .catch(fail);
          }
        );
      }
    });

