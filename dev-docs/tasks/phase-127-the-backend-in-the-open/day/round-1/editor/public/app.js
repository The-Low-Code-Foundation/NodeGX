// A day in the life — the page. It asks this tool's own server; it never holds the backend's credential.

const $ = (sel) => document.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;

async function api(path) {
  const r = await fetch(path);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `The tool’s server said ${r.status}.`);
  return j;
}

let current = null;

async function start() {
  try {
    const a = await api('/api/app');
    $('#appName').textContent = a.app;
    document.title = `A day in the life — ${a.app}`;
    $('#where').textContent = `The app in ${a.folder}; its backend at ${a.backend}.`;
    $('#people').innerHTML = a.people
      .map(
        (p) => `<li><button class="person" data-id="${esc(p.id)}" aria-pressed="false">
          <span class="name">${esc(p.name)}</span>
          <span class="small muted">${esc(p.email ?? '')}</span>
          <span class="small">${esc(p.groups)}${p.disabled ? ' · switched off' : ''}</span>
        </button></li>`
      )
      .join('');
    for (const b of document.querySelectorAll('.person')) b.addEventListener('click', () => play(b.dataset.id));
    const wanted = new URLSearchParams(location.search).get('person');
    if (wanted && a.people.some((p) => p.id === wanted)) play(wanted);
  } catch (e) {
    $('#people').innerHTML = `<li class="error">${esc(e.message)}</li>`;
  }
}

async function play(id) {
  current = id;
  for (const b of document.querySelectorAll('.person')) b.setAttribute('aria-pressed', String(b.dataset.id === id));
  history.replaceState(null, '', `?person=${encodeURIComponent(id)}`);
  $('#day').innerHTML = `<p class="loading">Playing their day on the backend… (each function runs as them, through a short-lived key the tool deletes when it’s done)</p>`;
  try {
    const day = await api(`/api/day?person=${encodeURIComponent(id)}`);
    if (current !== id) return;
    $('#day').innerHTML = summary(day) + `<ol class="timeline">${day.pages.map((p, i) => stop(p, i === day.pages.length - 1)).join('')}</ol>`;
  } catch (e) {
    if (current === id) $('#day').innerHTML = `<p class="error">${esc(e.message)}</p>`;
  }
}

function summary(day) {
  const p = day.person;
  const tables = day.tables
    .map((t) => {
      const cls = t.got ? 'some' : 'none';
      const pct = t.total ? Math.round((100 * t.got) / t.total) : 0;
      return `<div class="tbl ${cls}">
        <span class="small muted">${esc(t.table)}</span>
        <span class="count">${t.got} <span class="small muted">of ${t.total}</span></span>
        <div class="bar" aria-hidden="true"><span style="width:${pct}%"></span></div>
        <span class="small muted">${t.got ? `first on step ${t.firstPage}` : 'never handed to them'}</span>
        <span class="small muted">Reading it: ${esc(t.rule)}</span>
      </div>`;
    })
    .join('');
  return `<section class="summary">
    <h2>${esc(p.name)}’s day</h2>
    <p class="small muted">${esc(p.email ?? '')} · ${esc(p.groups)} · name taken from ${esc(p.from)} · played ${esc(new Date(day.at).toLocaleString())}</p>
    <p>Over ${plural(day.pages.length, 'page')}, the app handed ${esc(p.name)} these rows. Each count is what came back to them, not what the app’s code mentions.</p>
    <div class="tables">${tables}</div>
    <div class="legend"><span><span class="chip got">handed rows</span> rows reached them</span><span><span class="chip answer">an answer</span> a reply, but no row in it</span><span><span class="chip no">refused</span> the backend said no</span></div>
  </section>`;
}

function stop(p, last) {
  const touches = p.touches.length
    ? `<ul class="touches">${p.touches.map(touch).join('')}</ul>`
    : `<p class="quiet">This page asks the backend for nothing${p.signedIn ? '' : ' (no one is signed in yet)'}.</p>`;
  const sent = p.sentOn.length ? `<p class="note">The page sent them on to ${p.sentOn.map((s) => `“${esc(s.title)}” (${esc(s.by)})`).join(', ')}.</p>` : '';
  const offers = p.offers.length
    ? `<div class="offers"><h4>Here they could also… (the tool never presses these: they change data)</h4><ul>${p.offers
        .map(
          (o) =>
            `<li>${esc(o.how)}, which ${esc(o.touches)}: ${o.allowed ? '<strong>the backend would let them</strong>' : 'the backend would refuse them'}${o.shown === false ? ' · <em>not on their screen</em>' : ''}</li>`
        )
        .join('')}</ul></div>`
    : '';
  const notes = p.notes.map((n) => `<p class="note">${esc(n)}</p>`).join('');
  return `<li class="stop ${p.signedIn ? '' : 'out'}">
    <div class="rail"><span class="dot">${p.n}</span>${last ? '' : '<span class="line"></span>'}</div>
    <article class="page">
      <header><h3>${esc(p.title)}</h3><span class="url">${esc(p.url)}</span>${p.signedIn ? '' : '<span class="chip answer">not signed in yet</span>'}</header>
      <p class="arrived">Got here by ${esc(p.arrivedBy)}.</p>
      ${touches}${sent}${offers}${notes}
    </article>
  </li>`;
}

function touch(t) {
  const count = (t.items ?? []).length;
  const where = t.inside ? ` <span class="small muted">(in the ${esc(t.inside.split('/').pop())} part)</span>` : '';
  let what;
  let cls;
  let chip;
  if (t.kind === 'function') {
    what = `Ran <code>${esc(t.fn)}</code> as them${Object.keys(t.args ?? {}).length ? ` with <code>${esc(JSON.stringify(t.args))}</code>` : ''}`;
    if (t.status === 'ran') {
      cls = count ? 'got' : 'answer';
      chip = count ? `<span class="chip got">handed ${plural(count, 'row')}</span>` : `<span class="chip answer">an answer, no rows</span>`;
    } else if (t.status === 'not-run') {
      cls = 'answer';
      chip = `<span class="chip warn">not run</span>`;
    } else {
      cls = 'no';
      chip = `<span class="chip no">${t.status === 'not-allowed' ? 'not theirs to call' : 'refused'}</span>`;
    }
  } else {
    const verb = t.kind === 'record' ? `Opened one ${esc(t.table)} row by its id` : `Read the ${esc(t.table)} table`;
    what = `${verb}${where}`;
    if (t.status === 'read') {
      cls = count ? 'got' : 'answer';
      chip = count ? `<span class="chip got">handed ${plural(count, 'row')}</span>` : `<span class="chip answer">nothing to hand</span>`;
    } else if (t.status === 'narrow') {
      cls = 'answer';
      chip = `<span class="chip warn">can’t tell row by row</span>`;
    } else {
      cls = 'no';
      chip = `<span class="chip no">refused</span>`;
    }
  }
  if (t.kind === 'function') what += where;
  const extra = [];
  extra.push(`because of ${esc(t.why ?? 'the page')}`);
  if (t.status !== 'read' && t.status !== 'ran' && t.why) extra.length = 0, extra.push(esc(t.why));
  if (t.filter) extra.push(`the page keeps only rows where ${esc(t.filter)}`);
  if (t.allowedButFiltered) extra.push(`${plural(t.allowedButFiltered, 'more row')} they may read ${t.allowedButFiltered === 1 ? 'was' : 'were'} left out by that filter`);
  if (t.filterUnknown) extra.push(esc(t.filterUnknown));
  if (t.sort) extra.push(`in order of ${esc(t.sort)}`);
  if (t.status === 'read' && t.rule) extra.push(`reading ${esc(t.table)}: ${esc(t.rule)}`);
  const value = t.kind === 'function' && t.status === 'ran' ? `<pre class="value">${esc(JSON.stringify(t.value, null, 1)).slice(0, 1200)}</pre>` : '';
  const rows = count ? `<ul class="rows">${t.items.map(rowItem).join('')}</ul>` : '';
  return `<li class="touch ${cls}"><span class="what">${what}${chip}</span><span class="why">${extra.join(' · ')}</span>${value}${rows}</li>`;
}

function rowItem(r) {
  const fields = Object.entries(r.fields ?? {})
    .map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v === null ? '—' : v)}</dd>`)
    .join('');
  return `<li><details><summary>${esc(r.table)} · ${esc(r.label)}</summary><dl><dt>id</dt><dd><code>${esc(r.id)}</code></dd>${fields}</dl></details></li>`;
}

start();
