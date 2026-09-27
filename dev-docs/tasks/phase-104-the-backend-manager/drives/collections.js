    // ------------------------------------------------------- field editing --
    //
    // The editor's data browser had a form field per column type and edited a
    // cell where it sat. This page used to ask for the whole record as JSON,
    // which nobody who is not a developer can write. These helpers are that
    // form, in this page's own idiom, shared by Collections and Schema.

    var COLUMN_TYPES = ['String', 'Number', 'Boolean', 'Date', 'Object', 'Array', 'Pointer', 'Relation', 'File', 'GeoPoint'];
    var NAME_RULE = /^[a-zA-Z][a-zA-Z0-9_]*$/;
    var RESERVED_COLUMNS = ['objectId', 'createdAt', 'updatedAt', 'ACL'];
    /** The accounts table's columns belong to the server: shown, never renamed or retyped. */
    var ACCOUNT_OWNED = ['authData', 'email', 'username', 'emailVerified', 'password'];
    var JSON_TYPES = ['Object', 'Array', 'ACL', 'File', 'GeoPoint'];

    /** Written by the backend on every record; never offered for editing. */
    function isSystemField(name) {
      return name === 'objectId' || name === 'createdAt' || name === 'updatedAt';
    }

    function isServerOwned(table, name) {
      return isSystemField(name) || (table === '_User' && ACCOUNT_OWNED.indexOf(name) !== -1);
    }

    function validName(name, taken, what) {
      if (!name) return what + ' needs a name.';
      if (!NAME_RULE.test(name)) return '"' + name + '": start with a letter, then letters, digits or _ only.';
      if (RESERVED_COLUMNS.indexOf(name) !== -1) return '"' + name + '" is reserved by the backend.';
      if (taken && taken.indexOf(name) !== -1) return 'There is already a field called "' + name + '".';
      return null;
    }

    function typeBadge(col) {
      var text = col.type + (col.targetClass ? ' → ' + col.targetClass : '');
      return el('span.chip.type', { text: text });
    }

    /** The value a person edits: a Date envelope as its ISO string, a Pointer as its objectId. */
    function plain(value) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if (value.__type === 'Date') return value.iso;
        if (value.__type === 'Pointer' || value.__type === 'Object') return value.objectId;
      }
      return value;
    }

    /** And back again, in the shape the API expects for this column. */
    function toWire(col, value) {
      if (value === null || value === undefined) return value;
      if (col.type === 'Date') return { __type: 'Date', iso: value };
      if (col.type === 'Pointer') return { __type: 'Pointer', className: col.targetClass, objectId: value };
      return value;
    }

    function displayValue(value, type) {
      if (type === 'ACL' && (value === null || value === undefined)) return 'public';
      value = plain(value);
      if (value === null || value === undefined || value === '') return '';
      if (type === 'Boolean') return value ? '✓' : '✗';
      if (type === 'Date') return when(value);
      if (type === 'Pointer') return '→ ' + value;
      return cellText(value);
    }

    /** A `<input type=datetime-local>` value in the viewer's own timezone. */
    function toLocalInput(iso) {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return '';
      function p(n) { return (n < 10 ? '0' : '') + n; }
      return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes());
    }

    /**
     * One input for one column, chosen by its type. `read()` returns the plain
     * value, `undefined` for "left empty", or throws a sentence naming the field.
     */
    function fieldInput(col, value) {
      var v = plain(value);
      var input;
      switch (col.type) {
        case 'Boolean':
          input = el('input', { type: 'checkbox', checked: v === true });
          return { node: el('label.check', {}, input, 'Yes'), focus: input, read: function () { return input.checked; } };
        case 'Number':
          input = el('input', { type: 'number', step: 'any', value: v === null || v === undefined ? '' : String(v) });
          return {
            node: input, focus: input,
            read: function () {
              if (input.value.trim() === '') return undefined;
              var n = Number(input.value);
              if (isNaN(n)) throw new Error(col.name + ' must be a number.');
              return n;
            }
          };
        case 'Date':
          input = el('input', { type: 'datetime-local', value: v ? toLocalInput(v) : '' });
          return {
            node: input, focus: input,
            read: function () { return input.value ? new Date(input.value).toISOString() : undefined; }
          };
        case 'Pointer':
          return pointerInput(col, v);
        default:
          if (JSON_TYPES.indexOf(col.type) !== -1) {
            input = el('textarea', {
              rows: 4,
              spellcheck: 'false',
              placeholder: col.type === 'Array' ? '["first", "second"]' : col.type === 'ACL' ? '{ "*": { "read": true } }' : '{ "key": "value" }',
              value: v === null || v === undefined ? '' : JSON.stringify(v, null, 2)
            });
            var hint = col.type === 'ACL'
              ? el('span.hint', { text: 'Keys: * (everyone), a user objectId, or role:name. Empty makes the record public; {} grants nobody.' })
              : null;
            return {
              node: el('div', {}, input, hint), focus: input,
              read: function () {
                var text = input.value.trim();
                if (!text) return undefined;
                var parsed;
                try { parsed = JSON.parse(text); } catch (e) { throw new Error(col.name + ' is not valid JSON: ' + e.message); }
                if (col.type === 'Array' && !Array.isArray(parsed)) throw new Error(col.name + ' must be a list, written [ … ].');
                return parsed;
              }
            };
          }
          input = el('input', { type: 'text', value: v === null || v === undefined ? '' : String(v) });
          return { node: input, focus: input, read: function () { return input.value; } };
      }
    }

    /** A Pointer is chosen from the records it can point at, not typed as an id. */
    function pointerInput(col, current) {
      var select = el('select', {}, el('option', { value: '', text: '— none —' }));
      if (current) select.appendChild(el('option', { value: current, text: current, selected: true }));
      if (col.targetClass) {
        api('GET', '/api/' + encodeURIComponent(col.targetClass) + '?limit=200&sort=' + encodeURIComponent('["-createdAt"]'))
          .then(function (data) {
            (data.results || []).forEach(function (r) {
              if (r.objectId === current) return;
              select.appendChild(el('option', { value: r.objectId, text: recordLabel(r) }));
            });
          })
          .catch(function () { /* the id stays selectable; the list is a convenience */ });
      }
      return { node: select, focus: select, read: function () { return select.value || undefined; } };
    }

    /** A record's first readable text field, so a Pointer picker says "Ann", not a UUID. */
    function recordLabel(r) {
      var keys = Object.keys(r);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (isSystemField(k) || k === 'ACL') continue;
        if (typeof r[k] === 'string' && r[k]) return r[k] + '  (' + r.objectId.slice(0, 8) + ')';
      }
      return r.objectId;
    }

    function labelled(col, input) {
      return el('div.field', {},
        el('span.field-head', {},
          el('b', { text: col.name }),
          col.required ? el('span.req', { text: 'required' }) : null,
          typeBadge(col)),
        input.node);
    }

    // ---------------------------------------------------------- collections --

    view('collections', 'Collections', 'Data', 'collections', function (root) {
      var node = page('Collections', 'Browse and edit records. Click a cell to change it. Live updates arrive over the backend’s own SSE stream.');
      root.appendChild(node);

      var PAGE = 50;
      var columns = [];
      var selected = {};
      var rowsShown = [];

      var picker = el('select', { onchange: function () { selectCollection(picker.value); } });
      var search = el('input', { type: 'search', placeholder: 'Search text fields…', style: 'min-width:220px', value: S.ctx.search || '' });
      var whereInput = el('input', { type: 'text', placeholder: '{"status":"open"}', style: 'min-width:280px', value: S.ctx.where || '' });
      var liveToggle = el('input', { type: 'checkbox', checked: !!S.ctx.live });
      var bulk = el('span');
      var results = el('div');

      var toolbar = el('div.row', {},
        el('label.field', {}, 'Collection', picker),
        el('label.field', {}, 'Search', search),
        el('button.btn', { type: 'button', text: 'Refresh', onclick: function () { load(); } }));
      if (S.features.realtime) {
        toolbar.appendChild(el('label.check', {}, liveToggle, 'Live'));
        liveToggle.addEventListener('change', function () {
          S.ctx.live = liveToggle.checked;
          if (S.ctx.live) openLive(S.ctx.collection, load);
          else closeLive();
        });
      }
      toolbar.appendChild(el('span', { style: 'flex:1' }));
      toolbar.appendChild(bulk);
      toolbar.appendChild(el('button.btn', { type: 'button', text: 'Export CSV', onclick: exportCsv }));
      toolbar.appendChild(writeButton('New record', 'primary', function () { recordForm(null); }));
      node.appendChild(toolbar);
      // The JSON filter stays for anyone who wants it, one click away rather than in front.
      node.appendChild(disclosure('Advanced filter (JSON)', function () {
        whereInput.addEventListener('keydown', function (e) { if (e.key === 'Enter') { S.ctx.where = whereInput.value; S.ctx.skip = 0; load(); } });
        return el('div.row', {}, whereInput, el('span.hint', { text: 'Enter applies. Combined with the search above.' }));
      }));
      node.appendChild(el('div', { style: 'height:12px' }));
      node.appendChild(results);

      var searchTimer = null;
      search.addEventListener('input', function () {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(function () { S.ctx.search = search.value; S.ctx.skip = 0; load(); }, 250);
      });

      var schemaByName = {};
      api('GET', '/admin/schema')
        .then(function (data) {
          (data.tables || []).forEach(function (t) { schemaByName[t.name] = t; });
          var tables = Object.keys(schemaByName);
          if (!tables.length) {
            clear(results).appendChild(el('div.notice', {}, 'This backend has no collections yet. ',
              el('button.btn.tiny', { type: 'button', text: 'Create one in Schema', onclick: function () { location.hash = '#/schema'; } })));
            return;
          }
          // Schema's "Open records" names the collection it came from.
          if (S.openCollection) { S.ctx.collection = S.openCollection; S.openCollection = null; }
          if (!S.ctx.collection || tables.indexOf(S.ctx.collection) === -1) S.ctx.collection = tables[0];
          tables.forEach(function (name) {
            picker.appendChild(el('option', { value: name, text: name, selected: name === S.ctx.collection }));
          });
          if (S.ctx.live) openLive(S.ctx.collection, load);
          load();
        })
        .catch(fail);

      function selectCollection(name) {
        S.ctx.collection = name;
        S.ctx.skip = 0;
        selected = {};
        if (S.ctx.live) openLive(name, load);
        load();
      }

      /** Schema columns first, in schema order; the three system fields bracket them. */
      function columnsFor(collection, rows) {
        var t = schemaByName[collection] || { columns: [] };
        var out = [{ name: 'objectId', type: 'String' }];
        (t.columns || []).forEach(function (c) { if (!isSystemField(c.name) && c.name !== 'ACL') out.push(c); });
        var known = out.map(function (c) { return c.name; }).concat(['createdAt', 'updatedAt', 'ACL']);
        rows.forEach(function (row) {
          Object.keys(row).forEach(function (key) {
            if (known.indexOf(key) === -1) { known.push(key); out.push({ name: key, type: guessType(row[key]) }); }
          });
        });
        return out.concat([{ name: 'createdAt', type: 'Date' }, { name: 'updatedAt', type: 'Date' }, { name: 'ACL', type: 'ACL' }]);
      }

      function guessType(value) {
        if (typeof value === 'number') return 'Number';
        if (typeof value === 'boolean') return 'Boolean';
        if (Array.isArray(value)) return 'Array';
        if (value && typeof value === 'object') return 'Object';
        return 'String';
      }

      function whereClause(collection) {
        var clauses = [];
        var q = (S.ctx.search || '').trim();
        if (q) {
          var any = [{ objectId: { contains: q } }];
          ((schemaByName[collection] || {}).columns || []).forEach(function (c) {
            if (c.type === 'String' && !(collection === '_User' && c.name === 'password')) {
              var clause = {};
              clause[c.name] = { contains: q };
              any.push(clause);
            }
          });
          clauses.push({ $or: any });
        }
        var raw = (S.ctx.where || '').trim();
        if (raw) clauses.push(JSON.parse(raw));
        if (!clauses.length) return null;
        return clauses.length === 1 ? clauses[0] : { $and: clauses };
      }

      function load() {
        var collection = S.ctx.collection;
        if (!collection) return;
        var query = ['limit=' + PAGE, 'count=1', 'skip=' + (S.ctx.skip || 0), 'sort=' + encodeURIComponent('["-createdAt"]')];
        var where;
        try { where = whereClause(collection); } catch (e) {
          clear(results).appendChild(el('div.notice.bad', { text: 'The advanced filter is not valid JSON: ' + e.message }));
          return;
        }
        if (where) query.push('where=' + encodeURIComponent(JSON.stringify(where)));
        api('GET', '/api/' + encodeURIComponent(collection) + '?' + query.join('&'))
          .then(function (data) { renderRows(collection, data); })
          .catch(function (e) { clear(results).appendChild(el('div.notice.bad', { text: e.message })); });
      }

      function renderBulk() {
        clear(bulk);
        var ids = Object.keys(selected);
        if (!ids.length) return;
        bulk.appendChild(writeButton('Delete ' + ids.length + ' selected', 'danger', function () {
          confirmSimple('Delete ' + ids.length + ' record(s)', 'They are removed from ' + S.ctx.collection + ' permanently.', function () {
            var collection = S.ctx.collection;
            ids.reduce(function (chain, id) {
              return chain.then(function () { return api('DELETE', '/api/' + encodeURIComponent(collection) + '/' + encodeURIComponent(id)); });
            }, Promise.resolve())
              .then(function () { toast(ids.length + ' record(s) deleted.', 'ok'); })
              .catch(fail)
              .then(function () { selected = {}; load(); });
          });
        }));
      }

      function renderRows(collection, data) {
        var rows = data.results || [];
        rowsShown = rows;
        columns = columnsFor(collection, rows);
        Object.keys(selected).forEach(function (id) {
          if (!rows.some(function (r) { return r.objectId === id; })) delete selected[id];
        });
        renderBulk();
        clear(results);

        var total = data.count !== undefined ? data.count : rows.length;
        var skip = S.ctx.skip || 0;
        results.appendChild(
          el('div.row', {},
            chip(collection + ' · ' + total + ' record(s)', 'accent'),
            rows.length ? el('span.hint', { text: 'Showing ' + (skip + 1) + '–' + (skip + rows.length) }) : null,
            el('span', { style: 'flex:1' }),
            el('button.btn.tiny', { type: 'button', text: 'Prev', disabled: !(skip > 0), onclick: function () { S.ctx.skip = Math.max(0, skip - PAGE); load(); } }),
            el('button.btn.tiny', { type: 'button', text: 'Next', disabled: skip + rows.length >= total, onclick: function () { S.ctx.skip = skip + PAGE; load(); } })
          )
        );
        results.appendChild(el('div', { style: 'height:8px' }));

        if (!rows.length) {
          var empty = (S.ctx.search || S.ctx.where) ? 'No records match.' : 'No records yet.';
          results.appendChild(el('div.scroller', {}, el('div.empty', {}, empty + ' ',
            S.ctx.search || S.ctx.where ? null : writeButton('Add the first one', 'primary', function () { recordForm(null); }))));
          return;
        }

        var all = el('input', { type: 'checkbox', title: 'Select all on this page' });
        all.checked = rows.every(function (r) { return selected[r.objectId]; });
        all.addEventListener('change', function () {
          rows.forEach(function (r) { if (all.checked) selected[r.objectId] = true; else delete selected[r.objectId]; });
          renderRows(collection, data);
        });
        var head = el('tr', {}, el('th.pick', {}, all));
        columns.forEach(function (c) {
          head.appendChild(el('th', { title: c.type + (c.targetClass ? ' → ' + c.targetClass : '') }, c.name, ' ', el('span.th-type', { text: c.type })));
        });
        head.appendChild(el('th'));

        var body = el('tbody');
        rows.forEach(function (row) {
          var tick = el('input', { type: 'checkbox', checked: !!selected[row.objectId] });
          tick.addEventListener('change', function () {
            if (tick.checked) selected[row.objectId] = true; else delete selected[row.objectId];
            renderBulk();
          });
          var tr = el('tr', {}, el('td.pick', {}, tick));
          columns.forEach(function (c) { tr.appendChild(cell(collection, row, c)); });
          tr.appendChild(actionCell(
            writeButton('Edit', null, function () { recordForm(row); }),
            writeButton('Delete', 'danger', function () {
              confirmSimple('Delete record', 'This removes ' + collection + '/' + row.objectId + ' permanently.', function () {
                api('DELETE', '/api/' + encodeURIComponent(collection) + '/' + encodeURIComponent(row.objectId))
                  .then(function () { delete selected[row.objectId]; toast('Record deleted.', 'ok'); load(); })
                  .catch(fail);
              });
            })
          ));
          body.appendChild(tr);
        });
        results.appendChild(el('div.scroller', {}, el('table.grid', {}, el('thead', {}, head), body)));
      }

      /** One cell. Click to edit in place; Enter or leaving it saves, Esc cancels. */
      function cell(collection, row, col) {
        var td = el('td');
        var editable = !S.readonly && !isSystemField(col.name) && col.type !== 'Relation' &&
          !(collection === '_User' && col.name === 'authData');
        paint();
        if (!editable) { td.classList.add('locked'); return td; }
        td.classList.add('editable');
        td.addEventListener('click', function () { if (!td.classList.contains('cell-edit')) edit(); });
        return td;

        function paint() {
          clear(td);
          var text = displayValue(row[col.name], col.type);
          td.textContent = text;
          td.title = text;
          td.classList.toggle('shy', col.type === 'ACL' && (row.ACL === null || row.ACL === undefined));
        }

        function save(value) {
          var body = {};
          body[col.name] = value === undefined ? null : toWire(col, value);
          return api('PUT', '/api/' + encodeURIComponent(collection) + '/' + encodeURIComponent(row.objectId), body)
            .then(function (res) {
              row[col.name] = value === undefined ? null : value;
              if (res && res.updatedAt) row.updatedAt = res.updatedAt;
              toast(col.name + ' saved.', 'ok');
            });
        }

        function edit() {
          if (col.type === 'Boolean') {
            // A tick has two states; flipping it IS the edit.
            save(!(plain(row[col.name]) === true)).then(paint).catch(fail);
            return;
          }
          if (JSON_TYPES.indexOf(col.type) !== -1) {
            // Structured values get room to be written in.
            var f = fieldInput(col, row[col.name]);
            var ref = {};
            ref.ref = modal('Edit ' + col.name, [labelled(col, f)], [
              cancelButton(ref),
              el('button.btn.primary', {
                type: 'button', text: 'Save',
                onclick: function () {
                  var value;
                  try { value = f.read(); } catch (e) { return fail(e); }
                  save(value).then(function () { ref.ref.close(); paint(); }).catch(fail);
                }
              })
            ]);
            setTimeout(function () { f.focus.focus(); }, 0);
            return;
          }
          var input = fieldInput(col, row[col.name]);
          td.classList.add('cell-edit');
          clear(td).appendChild(input.node);
          var done = false;
          function finish(commit) {
            if (done) return;
            done = true;
            td.classList.remove('cell-edit');
            if (!commit) return paint();
            var value;
            try { value = input.read(); } catch (e) { fail(e); return paint(); }
            if (value === plain(row[col.name]) || (value === undefined && (row[col.name] === null || row[col.name] === undefined))) return paint();
            save(value).then(paint).catch(function (e) { fail(e); paint(); });
          }
          input.focus.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); finish(true); }
            else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
          });
          input.focus.addEventListener('blur', function () { finish(true); });
          if (input.focus.tagName === 'SELECT') input.focus.addEventListener('change', function () { finish(true); });
          setTimeout(function () { input.focus.focus(); if (input.focus.select) input.focus.select(); }, 0);
        }
      }

      /** Create (row = null) or edit a whole record, one labelled field per column. */
      function recordForm(row) {
        var collection = S.ctx.collection;
        var editing = !!row;
        var t = schemaByName[collection] || { columns: [] };
        var cols = (t.columns || []).filter(function (c) {
          return !isSystemField(c.name) && c.name !== 'ACL' && c.type !== 'Relation' &&
            !(collection === '_User' && (c.name === 'authData' || c.name === 'emailVerified'));
        });
        if (editing) cols = cols.concat([{ name: 'ACL', type: 'ACL' }]);
        var fields = cols.map(function (c) {
          var start = editing ? row[c.name] : c.defaultValue;
          return { col: c, input: fieldInput(c, start) };
        });
        var error = el('div.notice.bad.hidden');
        var bodyNodes = [];
        if (!cols.length) {
          bodyNodes.push(el('div.notice', {}, collection + ' has no fields yet. ',
            el('button.btn.tiny', { type: 'button', text: 'Add fields in Schema', onclick: function () { ref.ref.close(); location.hash = '#/schema'; } })));
        } else {
          if (editing) bodyNodes.push(el('p.sub', { text: 'objectId, createdAt and updatedAt are kept by the backend.' }));
          bodyNodes.push(el('div.form-grid', {}, fields.map(function (x) { return labelled(x.col, x.input); })));
        }
        bodyNodes.push(error);
        var ref = {};
        ref.ref = modal((editing ? 'Edit ' : 'New record in ') + collection, bodyNodes, [
          cancelButton(ref),
          el('button.btn.primary', {
            type: 'button', text: editing ? 'Save' : 'Create', disabled: !cols.length,
            onclick: function () {
              var data = {};
              try {
                fields.forEach(function (x) {
                  var value = x.input.read();
                  if (value === undefined || value === '') {
                    if (x.col.required && x.col.type !== 'Boolean') throw new Error(x.col.name + ' is required.');
                    if (value === '' && x.col.type === 'String' && editing) data[x.col.name] = '';
                    else if (editing && row[x.col.name] !== null && row[x.col.name] !== undefined) data[x.col.name] = null;
                    return;
                  }
                  data[x.col.name] = toWire(x.col, value);
                });
              } catch (e) {
                error.textContent = e.message;
                error.classList.remove('hidden');
                return;
              }
              var base = '/api/' + encodeURIComponent(collection);
              (editing ? api('PUT', base + '/' + encodeURIComponent(row.objectId), data) : api('POST', base, data))
                .then(function () { ref.ref.close(); toast(editing ? 'Record saved.' : 'Record created.', 'ok'); load(); })
                .catch(function (e) { error.textContent = e.message; error.classList.remove('hidden'); });
            }
          })
        ]);
        ref.ref.box.classList.add('wide');
        if (fields.length) setTimeout(function () { fields[0].input.focus.focus(); }, 0);
      }

      function exportCsv() {
        if (!rowsShown.length) return toast('Nothing to export on this page.', 'bad');
        function esc(v) {
          var s = v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        }
        var lines = [columns.map(function (c) { return esc(c.name); }).join(',')];
        rowsShown.forEach(function (r) { lines.push(columns.map(function (c) { return esc(r[c.name]); }).join(',')); });
        var url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
        var a = el('a', { href: url, download: S.ctx.collection + '.csv' });
        document.body.appendChild(a);
        a.click();
        a.parentNode.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
      }

      // Live updates: reuse BAK-001's SSE stream. The dashboard is just another
      // subscriber — no dashboard-specific realtime path exists.
      function openLive(collection, onChange) {
        closeLive();
        if (!collection || !S.features.realtime) return;
        var url = '/realtime?authToken=' + encodeURIComponent(S.token);
        var source = new EventSource(url);
        S.sse = source;
        setLiveChip('connecting');
        source.addEventListener('connected', function (e) {
          try { S.sseClientId = JSON.parse(e.data).clientId; } catch (err) { return; }
          api('POST', '/realtime/subscriptions', {
            clientId: S.sseClientId,
            subscriptions: [{ collection: collection }]
          }).then(function () { setLiveChip('live'); }).catch(function (err) { setLiveChip('off'); fail(err); });
        });
        var debounce = null;
        function bump() {
          if (debounce) clearTimeout(debounce);
          debounce = setTimeout(onChange, 180);
        }
        source.addEventListener('change', bump);
        source.addEventListener('resync', bump);
        source.addEventListener('error', function () { setLiveChip('reconnecting'); });
        S.sseCollection = collection;
      }
    });

    /** A plain yes/no for deleting records — typing a UUID back is not a safeguard anyone can use. */
    function confirmSimple(title, warning, onConfirm) {
      var ref = {};
      ref.ref = modal(title, [el('div.notice.bad', { text: warning })], [
        cancelButton(ref),
        el('button.btn.danger', { type: 'button', text: 'Delete', onclick: function () { ref.ref.close(); onConfirm(); } })
      ]);
    }

