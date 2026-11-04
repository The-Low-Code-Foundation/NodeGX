// The panel on the right: the NodeGX half of the screen. Tabs change with where you are (in space, docked,
// boarding). Everything here reads the game's state and calls the game's verbs; nothing here touches three.js.
// A NodeGX app would own this panel: the same state, the same verbs, built in nodes.

import { el, fmtTime } from './util.mjs';
import { FACTIONS, GOODS, UPGRADES, PAINTS, ENGINE_COLORS, SECTORS, STATIONS, HIRE, FLEET_JOBS, HOSTILE_AT, STATS, POSTS, WREN_COST } from './data.mjs';
import { niceName } from './orders.mjs';
import { LOOKS, randomLook } from './people.mjs';

const TABS = {
  space: ['ship', 'nav', 'crew', 'missions', 'fleet', 'wire'],
  dock: ['missions', 'trade', 'yard', 'crew', 'nav', 'ship'],
  board: ['boarding', 'ship', 'crew'],
  wardrobe: ['you']
};

export class Panel {
  constructor(game) {
    this.game = game;
    this.tab = 'ship';
    this.body = document.getElementById('panel-body');
    this.tabsEl = document.getElementById('tabs');
    this.lastRender = 0;
  }

  group() {
    const p = this.game.phase;
    if (p === 'wardrobe') return 'wardrobe';
    if (p === 'dock') return 'dock';
    if (p === 'board') return 'board';
    return 'space';
  }

  show(tab) {
    this.tab = tab;
    this.refresh();
  }

  /** Rebuilds the panel. Called when something changes, and twice a second for the live numbers. */
  refresh() {
    const g = this.game;
    const tabs = TABS[this.group()];
    if (!tabs.includes(this.tab)) this.tab = tabs[0];
    document.getElementById('credits').textContent = `${g.state.credits.toLocaleString()} cr`;
    document.getElementById('sector-name').textContent = g.world.sector ? g.world.sector.name : '—';
    document.getElementById('phase-name').textContent = g.command.open ? (g.command.paused ? 'paused · command map' : 'command map') : { walk: 'aboard', helm: 'at the helm', turret: 'in the turret', tactical: 'command map', fighter: 'flying the Wren', eva: 'space walk', board: 'boarding', dock: 'docked', jump: 'in the thread', title: '', dead: 'lost', wardrobe: 'your locker' }[g.phase] ?? g.phase;
    document.getElementById('help-line').textContent = g.command.open ? 'Tab back · P pause/run' : g.phase === 'walk' ? 'E use · V view · Tab map' : ['helm', 'fighter', 'turret', 'eva', 'board'].includes(g.phase) ? 'Tab: pause and command' : '';
    this.tabsEl.replaceChildren(
      ...tabs.map((t) => {
        const n = t === 'missions' ? g.state.missions.filter((m) => m.state !== 'turned').length : t === 'fleet' ? g.state.fleet.length : 0;
        return el('button', { class: t === this.tab ? 'on' : '', onclick: () => this.show(t) }, t[0].toUpperCase() + t.slice(1), n ? el('span', { class: 'n' }, n) : null);
      })
    );
    const fn = this[`tab_${this.tab}`];
    this.body.replaceChildren(...(fn ? fn.call(this) : []).filter(Boolean)); // a null section would print as "null"
  }

  tick(dt) {
    this.lastRender += dt;
    if (this.tab === 'you') return; // nothing live on it, and a rebuild would take the name box from under your typing
    if (this.lastRender > 0.5) {
      this.lastRender = 0;
      this.refresh();
    }
  }

  // --- pieces ----------------------------------------------------------------------------------

  sec(title, right, ...children) {
    return el('div', { class: 'sec' }, el('h3', {}, title, right ? el('span', { class: 'right' }, right) : null), ...children);
  }

  bar(k, cls = '') {
    return el('div', { class: `bar ${cls}` }, el('i', { style: `width:${Math.round(Math.max(0, Math.min(1, k)) * 100)}%` }));
  }

  standing() {
    const s = this.game.state.standing;
    return Object.values(FACTIONS).map((f) => {
      const v = Math.round(s[f.id]);
      const cls = v <= HOSTILE_AT ? 'bad' : v >= 30 ? 'good' : '';
      return el('span', { class: `chip ${cls}`, title: f.blurb }, `${f.name} ${v > 0 ? '+' : ''}${v}`);
    });
  }

  // --- tabs ------------------------------------------------------------------------------------

  tab_ship() {
    const g = this.game;
    const k = g.player;
    const s = g.ship;
    const cargo = Object.entries(g.state.cargo).filter(([, n]) => n > 0);
    return [
      this.sec('Kestrel', `${SECTORS[g.world.sector?.id]?.name ?? ''}`,
        el('div', { class: 'card' },
          el('div', { class: 'kv' }, el('span', {}, 'Hull'), el('span', {}, `${Math.round(k.hull)} / ${k.hullMax}`)), this.bar(k.hull / k.hullMax, k.hull / k.hullMax < 0.3 ? 'bad' : 'good'),
          el('div', { class: 'kv' }, el('span', {}, 'Shields'), el('span', {}, `${Math.round(k.shields)} / ${k.shieldsMax}`)), this.bar(k.shields / k.shieldsMax),
          el('div', { class: 'kv' }, el('span', {}, 'Speed'), el('span', {}, `${Math.round(k.speed)} / ${s.speedMax} m/s`), el('span', {}, 'Cargo'), el('span', {}, `${g.cargoUsed()} / ${s.cargoMax}`), el('span', {}, 'Wren'), el('span', {}, g.state.wren === 'lost' ? 'lost · a yard builds another' : g.fighterOut ? 'out' : 'in the bay'))
        )
      ),
      this.sec('Standing', null, el('div', {}, ...this.standing())),
      this.sec('Cargo hold', `${g.cargoUsed()} / ${s.cargoMax}`,
        cargo.length ? el('div', { class: 'kv' }, ...cargo.flatMap(([id, n]) => [el('span', {}, GOODS[id]?.name ?? id), el('span', {}, `×${n}`)])) : el('div', { class: 'hint' }, 'Empty. Walk aft and see for yourself.')
      ),
      this.sec('Fitted', null,
        g.state.upgrades.length ? el('div', {}, ...g.state.upgrades.map((u) => el('span', { class: 'chip accent' }, UPGRADES.find((x) => x.id === u)?.name ?? u))) : el('div', { class: 'hint' }, 'Stock. A shipyard sells more.')
      ),
      this.sec('Design', 'the shipyard',
        g.designWaiting
          ? el('div', { class: 'card on' },
              el('div', { class: 't' }, el('b', {}, 'A new design is waiting')),
              el('div', { class: 'd' }, g.canRefit() ? 'Refitting works like Continue: the game saves, and you are back aboard in this sector.' : 'Get back aboard the Kestrel to refit her.'),
              el('div', { class: 'a' }, el('button', { class: 'small primary', disabled: !g.canRefit(), onclick: () => g.refit() }, 'Refit her now')))
          : el('div', { class: 'hint', style: 'margin-bottom:6px' }, 'Her hull, wings, drives, detail and every room’s colours are a design you can change. Save it in the shipyard, come back here, and refit her.'),
        el('div', { class: 'row' }, el('button', { class: 'small', onclick: () => (g.input.unlock(), window.open('/shipyard.html', 'threadspace-shipyard')) }, 'Open the shipyard ↗'))
      ),
      this.sec('Game', null,
        el('div', { class: 'row' }, el('button', { class: 'small', onclick: () => g.save(true) }, 'Save'), el('button', { class: 'small', onclick: () => g.input.unlock() }, 'Release mouse'), el('button', { class: 'small', onclick: () => g.newGame(true) }, 'New captain')),
        el('div', { class: 'hint', style: 'margin-top:6px' }, 'Saved on every dock and jump.')
      ),
      this.sec('Log', null, el('div', { class: 'log' }, ...g.state.log.slice(-30).reverse().map((l) => el('div', { class: l.cls ?? '' }, l.text))))
    ];
  }

  tab_nav() {
    const g = this.game;
    const list = g.navCandidates();
    const claims = g.claims ?? {};
    const map = this.threadMap(claims);
    const here = g.world.sector;
    return [
      this.contacts(),
      this.sec('The threads', here?.name, map, el('div', { class: 'hint', style: 'margin-top:6px' }, here?.blurb ?? '')),
      this.sec('Orders', g.orders.fireLabel('kestrel'),
        el('div', { class: 'card' },
          el('div', { class: 'd' }, `Now: ${g.helmStatus ?? 'holding'}`),
          ...g.orders.plan('kestrel').steps.map((st, i) => el('div', { class: 'd' }, `${i + 1}. ${g.orders.label(st)}`)),
          el('div', { class: 'a' }, el('button', { class: 'small primary', onclick: () => g.openCommand() }, 'Command map (Tab)'), g.orders.plan('kestrel').steps.length ? el('button', { class: 'small', onclick: () => g.setNav(null) }, 'Clear the plan') : null)
        ),
        el('div', { class: 'hint' }, 'Tab pauses the game and opens the map: pick a contact, chain orders (fly to, dock, attack, keep away, pick me up) and set when the guns fire.')
      ),
      this.sec('Course', g.nav ? g.nav.name : 'none',
        el('div', { class: 'hint' }, g.crewAt('helm') ? `${g.crewName(g.crewAt('helm'))} has the helm: pick a course and she flies it.` : 'Nobody at the helm: she holds. Take the helm, or seat someone there (Crew).'),
        ...list.map((c) => el('div', { class: `card ${g.nav === c.e ? 'on' : ''}` },
          el('div', { class: 't' }, el('b', {}, c.e.name), el('span', { class: 'muted price' }, c.d < 1000 ? `${Math.round(c.d)} m` : `${(c.d / 1000).toFixed(1)} km`)),
          el('div', { class: 'a' },
            el('button', { class: 'small', onclick: () => g.setNav(g.nav === c.e ? null : c.e) }, g.nav === c.e ? 'Clear course' : 'Set course'),
            el('button', { class: 'small', onclick: () => this.orders(c.e) }, 'Orders…'),
            c.e.kind === 'gate' && g.canJump() === c.e ? el('button', { class: 'small primary', onclick: () => g.jump(c.e) }, `Jump → ${SECTORS[c.e.to].name}`) : null,
            c.e.kind === 'station' && g.canDock() ? el('button', { class: 'small primary', onclick: () => g.dock() }, 'Dock') : null
          )
        ))
      ),
      this.sec('Claim', null,
        claims[here?.id] ? el('div', { class: 'card' }, el('div', { class: 't' }, el('b', {}, `Held by ${claims[here.id].captain}`), el('span', { class: 'muted' }, claims[here.id].faction ?? ''))) : el('div', { class: 'hint' }, 'Nobody holds this sector.'),
        el('div', { class: 'a', style: 'margin-top:6px' }, el('button', { class: 'small', disabled: !g.canClaim(), onclick: () => g.claimSector() }, 'Lay claim · 2,000 cr'), el('span', { class: 'hint' }, g.canClaim() ? 'Clear of hostiles, a fleet ship present.' : 'Needs: no hostiles in the sector, a ship of your fleet here, 2,000 cr.'))
      )
    ];
  }

  /** Every armed or hostile ship on the scope: what she has left, how dangerous she is, and a button to target her. */
  contacts() {
    const g = this.game;
    const body = g.playerBody();
    const ships = g.world.entities
      .filter((e) => e.alive && e.hittable && e.hullMax && e !== g.player && e !== g.fighterEnt && e.side !== 'player')
      .map((e) => ({ e, d: e.obj.position.distanceTo(body.obj.position), t: g.threatOf(e), hostile: g.hostile('player', e.side) }))
      .sort((a, b) => b.hostile - a.hostile || a.d - b.d);
    const gunner = g.crewAt('turret') ? g.crewName(g.crewAt('turret')) : null;
    return this.sec('Contacts', `${ships.filter((c) => c.hostile).length} hostile`,
      el('div', { class: 'hint' }, gunner ? `${gunner} has the turret: she fires on your target, or the nearest threat. Click a mark in the view, press T, or pick one here.` : 'Nobody on the turret. Seat Dag there on the Crew tab.'),
      ...ships.map(({ e, d, t, hostile }) => el('div', { class: `card ${g.target === e ? 'on' : ''}` },
        el('div', { class: 't' }, el('b', {}, e.name), el('span', { class: 'chip', style: `color:${t.color};border-color:${t.color}` }, hostile ? t.label : 'NEUTRAL'), el('span', { class: 'muted price' }, d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`)),
        e.shieldsMax ? el('div', { class: 'kv' }, el('span', {}, 'Shields'), el('span', {}, `${Math.round(e.shields)} / ${e.shieldsMax}`)) : null,
        e.shieldsMax ? this.bar(e.shields / e.shieldsMax) : null,
        el('div', { class: 'kv' }, el('span', {}, 'Hull'), el('span', {}, `${Math.round(e.hull)} / ${e.hullMax}`)),
        this.bar(e.hull / e.hullMax, e.hull / e.hullMax < 0.3 ? 'bad' : 'good'),
        hostile ? el('div', { class: 'a' },
          el('button', { class: `small ${g.target === e ? 'primary' : ''}`, onclick: () => (g.target === e ? ((g.target = null), this.refresh()) : g.select(e)) }, g.target === e ? (g.gunnerOn === e ? `Targeted · ${gunner ?? 'nobody'} firing` : 'Targeted') : 'Target'),
          el('button', { class: 'small', onclick: () => this.orders(e) }, 'Orders…'),
          g.wontShoot(e) ? el('span', { class: 'chip warn' }, 'SPARED') : null
        ) : null
      )),
      !ships.length ? el('div', { class: 'hint' }, 'Nothing on the scope.') : null
    );
  }

  /** Opens the command map, paused, with `e` picked. */
  orders(e) {
    const g = this.game;
    g.openCommand();
    g.command.select(e);
  }

  threadMap(claims) {
    const g = this.game;
    const pos = { haven: [40, 85], drift: [150, 60], cinder: [260, 110] };
    const lines = [];
    const seen = new Set();
    for (const s of Object.values(SECTORS)) for (const t of s.threads) {
      const key = [s.id, t].sort().join('-');
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push(`<line x1="${pos[s.id][0]}" y1="${pos[s.id][1]}" x2="${pos[t][0]}" y2="${pos[t][1]}" stroke="#b48cff" stroke-width="1.5" stroke-dasharray="4 3"/>`);
    }
    const nodes = Object.values(SECTORS).map((s) => {
      const [x, y] = pos[s.id];
      const here = g.world.sector?.id === s.id;
      const st = s.station ? STATIONS[s.station] : null;
      const col = st ? FACTIONS[st.faction].color : '#8a93a3';
      const claim = claims[s.id];
      return `<circle cx="${x}" cy="${y}" r="${here ? 9 : 6}" fill="${here ? col : '#1c2027'}" stroke="${col}" stroke-width="2"/>
        <text x="${x}" y="${y + 24}" fill="#e6e9ee" font-size="11" text-anchor="middle" font-family="ui-monospace,Menlo,monospace">${s.name}</text>
        ${claim ? `<text x="${x}" y="${y + 36}" fill="#39d27a" font-size="9" text-anchor="middle">${claim.captain}</text>` : ''}
        ${s.pirates ? `<text x="${x}" y="${y - 14}" fill="#ff5540" font-size="9" text-anchor="middle">☠ ${s.pirates}</text>` : ''}`;
    });
    return el('div', { class: 'map', html: `<svg viewBox="0 0 300 150">${lines.join('')}${nodes.join('')}</svg>` });
  }

  tab_crew() {
    const g = this.game;
    const crew = g.roster();
    const docked = g.phase === 'dock' ? g.dockedAt : null;
    const aboard = g.phase !== 'board';
    return [
      this.sec('Crew', `${crew.length} signed on`,
        ...crew.map((c) => this.crewCard(c, { posts: aboard })),
        el('div', { class: 'hint' }, 'Each post reads one stat: the helm Piloting, the turret Gunnery, the engines Engineering, the boarding party Combat. Take a seat yourself and whoever holds it stands aside; stand up and they take it back.')
      ),
      docked ? this.sec('For hire', docked.name,
        ...HIRE.filter((h) => h.at === docked.id).map((h) => this.crewCard(h, { hire: true })),
        !HIRE.some((h) => h.at === docked.id) ? el('div', { class: 'hint' }, 'Nobody looking for a berth here.') : null
      ) : null,
      docked ? this.sec('The wire', null, el('div', { class: 'log' }, ...(g.wire ?? []).map((p) => el('div', {}, `${p.who}: ${p.text}`)), el('div', { class: 'hint' }, g.net.kind === 'local' ? 'Local wire: only your own news until a backend carries it.' : ''))) : null
    ];
  }

  /** A crew member's card: their four stats as bars (the one their post reads lit), what that comes to at the post, and
   *  the posts to put them on; or, for hire, the price. */
  crewCard(c, { posts = false, hire = false } = {}) {
    const g = this.game;
    const post = g.state.crew[c.id] ?? 'idle';
    const hired = g.state.hired.includes(c.id);
    const prize = post.startsWith('prize:') ? g.state.fleet.find((f) => f.id === post.slice(6)) : null;
    const where = prize ? `flying the ${prize.name}` : post === 'transfer' ? 'out in a suit, crossing' : POSTS.find((p) => p.id === post)?.name.toLowerCase() ?? post;
    const reads = STATS.find((s) => s.post === (prize ? 'helm' : post))?.id;
    const best = Object.entries(c.stats).sort((a, b) => b[1] - a[1])[0];
    return el('div', { class: `card ${hire && hired ? 'dim' : ''}` },
      el('div', { class: 't' }, el('span', { class: 'face', style: `background:${LOOKS.shirt[c.look?.shirt ?? 0] ?? '#3d5a80'}` }), el('b', {}, c.name), el('span', { class: 'muted' }, c.role), hire ? el('span', { class: 'price' }, `${c.cost} cr`) : el('span', { class: 'chip' }, where)),
      el('div', { class: 'd' }, c.skill),
      el('div', { class: 'stats' }, ...STATS.flatMap((s) => [
        el('span', { class: reads === s.id ? 'on' : '', title: s.blurb }, s.name),
        el('div', { class: `bar ${reads === s.id ? 'good' : ''}`, title: s.blurb }, el('i', { style: `width:${c.stats[s.id] * 10}%` })),
        el('span', { class: reads === s.id ? 'on' : '' }, String(c.stats[s.id]))
      ])),
      !hire && reads ? el('div', { class: 'd fx' }, this.effectText(c.id, prize ? 'prize' : post)) : hire ? el('div', { class: 'd fx' }, `Best at ${STATS.find((s) => s.id === best[0]).name.toLowerCase()} (${best[1]}): ${this.effectText(c.id, STATS.find((s) => s.id === best[0]).post, c)}`) : null,
      posts && !prize && post !== 'transfer' ? el('div', { class: 'a' }, ...POSTS.map((p) => el('button', { class: `small ${post === p.id ? 'primary' : ''}`, title: p.id === 'idle' ? '' : `${p.name}: reads ${STATS.find((s) => s.post === p.id)?.name}`, onclick: () => g.setCrew(c.id, p.id) }, p.name))) : null,
      hire ? el('div', { class: 'a' }, el('button', { class: 'small primary', disabled: hired || g.state.credits < c.cost, onclick: () => g.hire(c.id) }, hired ? 'Hired' : 'Hire')) : null
    );
  }

  /** What a stat comes to at a post, in words and numbers. */
  effectText(id, post, info = null) {
    const g = this.game;
    const fx = info ? effectOf(g, info, post) : g.crewEffect(id, post);
    const deg = (r) => ((r * 180) / Math.PI).toFixed(1);
    if (post === 'helm' || post === 'prize') return `At the helm she swings onto a course at ${Math.round((fx.turn / 1.1) * 100)}% of the best, brakes at ${fx.brake.toFixed(1)} m/s², and slips ${Math.round(fx.evade * 100)}% of the bolts thrown at her.`;
    if (post === 'turret') return `On the turret: shots group within ${deg(fx.spread)}°, the gun swings ${fx.swing.toFixed(1)} rad/s, opens fire ${fx.react.toFixed(1)} s after a new target, leads ${Math.round(fx.lead * 100)}% of a mover.`;
    if (post === 'engine') return `At the engines: shields back at ${fx.shields.toFixed(1)}/s (nobody there: 2), and the hull patched at ${fx.patch.toFixed(1)}/s out of a fight, up to 80%.`;
    if (post === 'party') return `Boarding: ${fx.hp} hp, hits for ${Math.round(fx.damage)} every ${fx.every.toFixed(1)} s.`;
    return '';
  }

  tab_missions() {
    const g = this.game;
    const docked = g.phase === 'dock' ? g.dockedAt : null;
    const active = g.state.missions.filter((m) => m.state !== 'turned');
    const offers = docked ? g.offers() : [];
    return [
      this.sec(docked ? `${docked.name} board` : 'Your missions', `${active.length} taken`,
        ...active.map((m) => {
          const t = m.tpl;
          const canTurn = docked && m.state === 'done' && (t.to ?? t.at) === docked.id;
          return el('div', { class: `card ${m.state === 'done' ? 'on' : ''}` },
            el('div', { class: 't' }, el('b', {}, t.title), el('span', { class: 'price' }, `${t.reward} cr`)),
            el('div', { class: 'd' }, g.missionStatus(m)),
            el('div', { class: 'a' },
              canTurn ? el('button', { class: 'small primary', onclick: () => g.turnIn(m) }, 'Turn in') : null,
              m.state !== 'done' ? el('button', { class: 'small', onclick: () => g.abandon(m) }, 'Abandon') : null,
              el('span', { class: `chip ${m.state === 'done' ? 'good' : ''}` }, m.state === 'done' ? `done · turn in at ${STATIONS[t.to ?? t.at].name}` : FACTIONS[t.giver].name)
            )
          );
        }),
        !active.length ? el('div', { class: 'hint' }, docked ? 'Take one below.' : 'None. The boards are on the stations.') : null
      ),
      docked ? this.sec('On offer', FACTIONS[docked.faction].name,
        ...offers.map((t) => el('div', { class: 'card' },
          el('div', { class: 't' }, el('b', {}, t.title), el('span', { class: 'price' }, `${t.reward} cr`)),
          el('div', { class: 'd' }, t.blurb),
          el('div', { class: 'd' }, ...Object.entries(t.standing).map(([f, v]) => el('span', { class: `chip ${v > 0 ? 'good' : 'bad'}` }, `${FACTIONS[f].name} ${v > 0 ? '+' : ''}${v}`))),
          el('div', { class: 'a' }, el('button', { class: 'small primary', onclick: () => g.accept(t) }, 'Accept'))
        )),
        !offers.length ? el('div', { class: 'hint' }, 'Nothing new. Come back after a job.') : null
      ) : null
    ];
  }

  tab_fleet() {
    const g = this.game;
    return [
      this.sec('Fleet', `${g.state.fleet.length + 1} ships`,
        el('div', { class: 'card on' }, el('div', { class: 't' }, el('b', {}, 'Kestrel'), el('span', { class: 'muted' }, 'flagship · you')), el('div', { class: 'd' }, `One fighter bay, one turret. ${g.helmStatus ?? ''}`)),
        ...g.state.fleet.map((f) => {
          const e = g.world.entities.find((x) => x.fleetId === f.id);
          const d = e ? e.obj.position.distanceTo(g.player.obj.position) : null;
          const crossing = g.transfers.find((t) => t.fleetId === f.id);
          const near = d !== null && d < g.TRANSFER_RANGE;
          const free = g.roster().filter((c) => !String(g.state.crew[c.id]).startsWith('prize') && g.state.crew[c.id] !== 'transfer');
          const status = f.job ? `On a job: ${FLEET_JOBS.find((j) => j.id === f.job.id).name} · back in ${fmtTime((f.job.endsAt - Date.now()) / 1000)}` : !e ? `Left adrift in ${SECTORS[f.at]?.name ?? 'another sector'}.` : !f.crew ? (crossing ? `${crossing.name} is crossing to her in a suit.` : 'Adrift: nobody aboard to fly her.') : `${g.crewName(f.crew)} has her: ${e.status ?? 'holding'}.`;
          return el('div', { class: `card ${!f.crew && !f.job ? 'warnc' : ''}` },
            el('div', { class: 't' }, el('b', {}, f.name), el('span', { class: 'muted' }, f.cls), d !== null ? el('span', { class: 'muted price' }, d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`) : null),
            el('div', { class: 'd' }, status),
            this.bar(f.hull / f.hullMax, 'good'),
            e && !f.crew && !f.job && !crossing ? el('div', { class: 'a' },
              el('span', { class: 'hint' }, near ? 'Send someone over:' : `Bring the Kestrel within ${g.TRANSFER_RANGE} m to send someone over.`),
              ...free.map((c) => el('button', { class: 'small', disabled: !near, title: `Piloting ${c.stats.pilot}, gunnery ${c.stats.gunnery}`, onclick: () => g.sendCrew(c.id, f.id) }, `${c.name} · pilot ${c.stats.pilot}`)),
              !near ? el('button', { class: 'small primary', onclick: () => (g.orders.now('kestrel', { move: 'goto', target: e }), g.toast(`Kestrel: fly to the ${f.name}.`, 'good'), this.refresh()) }, `Fly the Kestrel to her`) : null
            ) : null,
            f.crew && e && !f.job ? el('div', { class: 'a' },
              el('button', { class: `small ${g.orders.current(f.id)?.move === 'follow' ? 'primary' : ''}`, onclick: () => g.fleetOrder(f.id, 'follow') }, 'Follow'),
              el('button', { class: `small ${!g.orders.current(f.id) || g.orders.current(f.id)?.move === 'hold' ? 'primary' : ''}`, onclick: () => g.fleetOrder(f.id, 'hold') }, 'Hold'),
              el('button', { class: 'small', onclick: () => this.orders(e) }, 'Orders…'),
              ...FLEET_JOBS.map((j) => el('button', { class: 'small', title: j.blurb, onclick: () => g.fleetOrder(f.id, 'job', j) }, `${j.name} · ${j.minutes} min · ${j.reward} cr`)),
              el('button', { class: 'small', disabled: !near, title: near ? '' : `Within ${g.TRANSFER_RANGE} m of the Kestrel`, onclick: () => g.recallCrew(f.id) }, `Recall ${g.crewName(f.crew)}`)
            ) : null
          );
        }),
        !g.state.fleet.length ? el('div', { class: 'hint' }, 'Only the Kestrel. Board a Rook ship and keep her; send a crew member over in a suit to fly her, and she takes orders here and on the map.') : null
      )
    ];
  }

  tab_wire() {
    const g = this.game;
    return [
      this.sec('The wire', g.net.kind,
        el('div', { class: 'log' }, ...(g.wire ?? []).map((p) => el('div', { class: p.kind === 'claim' ? 'good' : '' }, `${new Date(p.t).toLocaleTimeString()} · ${p.who}: ${p.text}`)), !(g.wire ?? []).length ? el('div', {}, 'Quiet.') : null),
        el('div', { class: 'hint', style: 'margin-top:8px' }, 'Every captain flies their own universe. The wire carries news, claims and factions between them: a NodeGX backend will, when this prototype grows into one. For now it is local.')
      )
    ];
  }

  tab_trade() {
    const g = this.game;
    const st = g.dockedAt;
    const rows = Object.values(GOODS).filter((x) => !x.illegal || st.faction === 'rooks' || g.state.cargo[x.id] > 0);
    return [
      this.sec('Market', st.name, el('div', { class: 'hint' }, st.greeting)),
      this.sec('Goods', `hold ${g.cargoUsed()} / ${g.ship.cargoMax}`,
        ...rows.map((x) => {
          const have = g.state.cargo[x.id] ?? 0;
          const sells = st.sells.includes(x.id);
          return el('div', { class: 'card' },
            el('div', { class: 't' }, el('b', {}, x.name), el('span', { class: 'price' }, `buy ${sells ? g.priceAt(x.id, true) : '—'} · sell ${g.priceAt(x.id, false)}`)),
            el('div', { class: 'd' }, `You hold ×${have}${x.illegal ? ' · contraband: Concord confiscates it' : ''}${x.size > 1 ? ` · ${x.size} units each` : ''}`),
            el('div', { class: 'a' },
              el('button', { class: 'small', disabled: !sells || g.state.credits < g.priceAt(x.id, true) || g.cargoUsed() + x.size > g.ship.cargoMax, onclick: () => g.buy(x.id, 1) }, 'Buy 1'),
              el('button', { class: 'small', disabled: !sells || g.state.credits < g.priceAt(x.id, true) * 5 || g.cargoUsed() + x.size * 5 > g.ship.cargoMax, onclick: () => g.buy(x.id, 5) }, 'Buy 5'),
              el('button', { class: 'small', disabled: !have, onclick: () => g.sell(x.id, 1) }, 'Sell 1'),
              el('button', { class: 'small', disabled: !have, onclick: () => g.sell(x.id, have) }, 'Sell all')
            )
          );
        })
      )
    ];
  }

  tab_yard() {
    const g = this.game;
    return [
      this.sec('Repairs', null, el('div', { class: 'card' }, el('div', { class: 't' }, el('b', {}, 'Hull and Wren'), el('span', { class: 'price' }, `${g.repairCost()} cr`)), el('div', { class: 'a' }, el('button', { class: 'small primary', disabled: !g.repairCost() || g.state.credits < g.repairCost(), onclick: () => g.repair() }, g.repairCost() ? 'Repair' : 'Nothing to fix')))),
      g.state.wren === 'lost' ? this.sec('A new Wren', 'the bay is empty', el('div', { class: 'card on' }, el('div', { class: 't' }, el('b', {}, 'Wren light fighter'), el('span', { class: 'price' }, `${WREN_COST.toLocaleString()} cr`)), el('div', { class: 'd' }, 'Built to the old one’s lines, on the pad in your bay before you undock.'), el('div', { class: 'a' }, el('button', { class: 'small primary', disabled: g.state.credits < WREN_COST, onclick: () => g.buyWren() }, 'Buy')))) : null,
      this.sec('Upgrades', null,
        ...UPGRADES.map((u) => {
          const have = g.state.upgrades.includes(u.id);
          return el('div', { class: `card ${have ? 'dim' : ''}` },
            el('div', { class: 't' }, el('b', {}, u.name), el('span', { class: 'price' }, `${u.cost} cr`)),
            el('div', { class: 'd' }, u.blurb),
            el('div', { class: 'a' }, el('button', { class: 'small primary', disabled: have || g.state.credits < u.cost, onclick: () => g.buyUpgrade(u.id) }, have ? 'Fitted' : 'Fit'))
          );
        })
      ),
      this.sec('Design her yourself', null, el('div', { class: 'card' }, el('div', { class: 'd' }, 'Her shape, her detail, her rooms: the shipyard editor. Save there, then refit her from the Ship tab.'), el('div', { class: 'a' }, el('button', { class: 'small', onclick: () => (g.input.unlock(), window.open('/shipyard.html', 'threadspace-shipyard')) }, 'Open the shipyard ↗')))),
      this.sec('Paint', 'free · over the shipyard’s colours',
        el('div', { class: 'd', style: 'margin-bottom:4px' }, 'Hull'),
        el('div', { class: 'swatches' }, ...PAINTS.map((c) => el('div', { class: `swatch ${g.state.paint === c ? 'on' : ''}`, style: `background:${c}`, onclick: () => g.setPaint(c) }))),
        el('div', { class: 'd', style: 'margin:8px 0 4px' }, 'Engines and cannons'),
        el('div', { class: 'swatches' }, ...ENGINE_COLORS.map((c) => el('div', { class: `swatch ${g.state.engine === c ? 'on' : ''}`, style: `background:${c}`, onclick: () => g.setEngine(c) })))
      )
    ];
  }

  /** Your locker: the mirror is the view. Every pick shows on you at once. */
  tab_you() {
    const g = this.game;
    const look = g.look();
    const swatches = (key, label) => el('div', { class: 'look-row' }, el('div', { class: 'd' }, label),
      el('div', { class: 'swatches' }, ...LOOKS[key].map((c, i) => el('div', { class: `swatch ${look[key] === i ? 'on' : ''}`, style: `background:${c}`, title: c, onclick: () => g.setLook(key, i) }))));
    const choices = (key, label) => el('div', { class: 'look-row' }, el('div', { class: 'd' }, label),
      el('div', { class: 'row wrap' }, ...LOOKS[key].map((v) => el('button', { class: `small ${look[key] === v ? 'primary' : ''}`, onclick: () => g.setLook(key, v) }, v))));
    return [
      this.sec('You', g.wardrobeFirst ? 'a new captain' : 'your locker',
        el('div', { class: 'look-row' }, el('div', { class: 'd' }, 'Name'),
          el('input', { class: 'name', value: g.state.captain, maxlength: 28, oninput: (e) => (g.state.captain = e.target.value || 'Captain') })),
        swatches('skin', 'Skin'),
        swatches('hair', 'Hair'),
        swatches('eyes', 'Eyes'),
        choices('hairStyle', 'Hair style'),
        choices('face', 'Face'),
        swatches('shirt', 'Jacket'),
        swatches('pants', 'Trousers'),
        swatches('accent', 'Trim'),
        el('div', { class: 'row', style: 'margin-top:10px' },
          el('button', { class: 'small', onclick: () => ((g.state.look = randomLook()), g.dressAvatar(), this.refresh()) }, 'Surprise me'),
          el('button', { class: 'primary', onclick: () => g.closeWardrobe() }, g.wardrobeFirst ? 'Board the Kestrel' : 'Done')
        ),
        el('div', { class: 'hint', style: 'margin-top:8px' }, 'Drag the view to turn round. V shows you in the third person anywhere aboard, on a station, boarding, or out in your suit. Your locker is in your quarters.')
      )
    ];
  }

  tab_boarding() {
    const g = this.game;
    const b = g.boarding;
    const ship = b.ship;
    return [
      this.sec('Boarding', ship.name,
        el('div', { class: 'card' },
          el('div', { class: 'kv' }, el('span', {}, 'You'), el('span', {}, `${Math.max(0, Math.round(b.hp))} / 100`)), this.bar(b.hp / 100, b.hp < 30 ? 'bad' : 'good'),
          el('div', { class: 'kv' }, el('span', {}, 'Defenders'), el('span', {}, `${b.defendersLeft()} of ${b.defenders.length}`)), this.bar(1 - b.defendersLeft() / Math.max(1, b.defenders.length), 'bad'),
          ...b.party.flatMap((m) => [el('div', { class: 'kv' }, el('span', {}, m.name), el('span', {}, m.hp > 0 ? `${Math.round(m.hp)} / ${m.hpMax}` : 'down')), this.bar(m.hp / m.hpMax, m.hp < m.hpMax * 0.3 ? 'bad' : 'good')]),
          g.state.wren === 'lost' || !g.fighterOut ? el('div', { class: 'd' }, 'No Wren on her hull: you leave by the airlock in your suit.') : null,
          el('div', { class: 'd' }, ship.captured ? 'The bridge is yours.' : b.defendersLeft() ? 'Clear the hull. The bridge console is forward.' : 'Clear. Hold E at the bridge console.')
        )
      ),
      ship.captured ? this.sec('She is yours', null,
        el('div', { class: 'card' }, el('div', { class: 'd' }, `${ship.name}: ${ship.cls.cls}. Keep her and she is yours, adrift: send a crew member over from the Kestrel in a suit to fly her (she then follows and takes orders). Or strip her and blow her.`),
          el('div', { class: 'a' }, el('button', { class: 'small primary', onclick: () => g.keepShip(ship) }, 'Add to the fleet'), el('button', { class: 'small', onclick: () => g.scuttleShip(ship) }, 'Loot and scuttle'))
        )
      ) : this.sec('Rifle', g.ship.rifleDamage === 25 ? 'standard' : 'boarding rifle II', el('div', { class: 'hint' }, `Hits for ${g.ship.rifleDamage}. Defenders take 60. ${g.ship.armour < 1 ? 'Armour halves what you take.' : 'No armour: a Rook hits for 8.'}`))
    ];
  }
}

/** The effect of a hire's stats before they are hired (crewEffect reads the roster). */
function effectOf(g, info, post) {
  const was = g.state.hired;
  g.state.hired = was.concat([info.id]);
  const fx = g.crewEffect(info.id, post);
  g.state.hired = was;
  return fx;
}
