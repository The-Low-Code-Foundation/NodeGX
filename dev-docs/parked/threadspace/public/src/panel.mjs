// The panel on the right: the NodeGX half of the screen. Tabs change with where you are (in space, docked,
// boarding). Everything here reads the game's state and calls the game's verbs; nothing here touches three.js.
// A NodeGX app would own this panel: the same state, the same verbs, built in nodes.

import { el, fmtTime } from './util.mjs';
import { FACTIONS, GOODS, UPGRADES, PAINTS, ENGINE_COLORS, SECTORS, STATIONS, CREW, HIRE, FLEET_JOBS, HOSTILE_AT } from './data.mjs';

const TABS = {
  space: ['ship', 'nav', 'crew', 'missions', 'fleet', 'wire'],
  dock: ['missions', 'trade', 'yard', 'crew', 'nav', 'ship'],
  board: ['boarding', 'ship', 'crew']
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
    document.getElementById('phase-name').textContent = { walk: 'aboard', helm: 'at the helm', turret: 'in the turret', tactical: 'tactical', fighter: 'flying the Wren', eva: 'space walk', board: 'boarding', dock: 'docked', jump: 'in the thread', title: '', dead: 'lost' }[g.phase] ?? g.phase;
    document.getElementById('help-line').textContent = g.phase === 'walk' ? 'walk to a seat · E' : '';
    this.tabsEl.replaceChildren(
      ...tabs.map((t) => {
        const n = t === 'missions' ? g.state.missions.filter((m) => m.state !== 'turned').length : t === 'fleet' ? g.state.fleet.length : 0;
        return el('button', { class: t === this.tab ? 'on' : '', onclick: () => this.show(t) }, t[0].toUpperCase() + t.slice(1), n ? el('span', { class: 'n' }, n) : null);
      })
    );
    const fn = this[`tab_${this.tab}`];
    this.body.replaceChildren(...(fn ? fn.call(this) : []));
  }

  tick(dt) {
    this.lastRender += dt;
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
          el('div', { class: 'kv' }, el('span', {}, 'Speed'), el('span', {}, `${Math.round(k.speed)} / ${s.speedMax} m/s`), el('span', {}, 'Cargo'), el('span', {}, `${g.cargoUsed()} / ${s.cargoMax}`), el('span', {}, 'Wren'), el('span', {}, g.fighterOut ? 'out' : g.fighterEnt.alive ? 'in the bay' : 'lost'))
        )
      ),
      this.sec('Standing', null, el('div', {}, ...this.standing())),
      this.sec('Cargo hold', `${g.cargoUsed()} / ${s.cargoMax}`,
        cargo.length ? el('div', { class: 'kv' }, ...cargo.flatMap(([id, n]) => [el('span', {}, GOODS[id]?.name ?? id), el('span', {}, `×${n}`)])) : el('div', { class: 'hint' }, 'Empty. Walk aft and see for yourself.')
      ),
      this.sec('Fitted', null,
        g.state.upgrades.length ? el('div', {}, ...g.state.upgrades.map((u) => el('span', { class: 'chip accent' }, UPGRADES.find((x) => x.id === u)?.name ?? u))) : el('div', { class: 'hint' }, 'Stock. A shipyard sells more.')
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
      this.sec('Course', g.nav ? g.nav.name : 'none',
        el('div', { class: 'hint' }, g.crewAt('helm') ? `${CREW.find((c) => c.id === g.crewAt('helm')).name} has the helm: pick a course and she flies it.` : 'Nobody at the helm: she holds. Take the helm, or seat Vex there.'),
        ...list.map((c) => el('div', { class: `card ${g.nav === c.e ? 'on' : ''}` },
          el('div', { class: 't' }, el('b', {}, c.e.name), el('span', { class: 'muted price' }, c.d < 1000 ? `${Math.round(c.d)} m` : `${(c.d / 1000).toFixed(1)} km`)),
          el('div', { class: 'a' },
            el('button', { class: 'small', onclick: () => g.setNav(g.nav === c.e ? null : c.e) }, g.nav === c.e ? 'Clear course' : 'Set course'),
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
    const gunner = g.crewAt('turret') ? CREW.find((c) => c.id === g.crewAt('turret'))?.name ?? 'Your gunner' : null;
    return this.sec('Contacts', `${ships.filter((c) => c.hostile).length} hostile`,
      el('div', { class: 'hint' }, gunner ? `${gunner} has the turret: she fires on your target, or the nearest threat. Click a mark in the view, press T, or pick one here.` : 'Nobody on the turret. Seat Dag there on the Crew tab.'),
      ...ships.map(({ e, d, t, hostile }) => el('div', { class: `card ${g.target === e ? 'on' : ''}` },
        el('div', { class: 't' }, el('b', {}, e.name), el('span', { class: 'chip', style: `color:${t.color};border-color:${t.color}` }, hostile ? t.label : 'NEUTRAL'), el('span', { class: 'muted price' }, d < 1000 ? `${Math.round(d)} m` : `${(d / 1000).toFixed(1)} km`)),
        e.shieldsMax ? el('div', { class: 'kv' }, el('span', {}, 'Shields'), el('span', {}, `${Math.round(e.shields)} / ${e.shieldsMax}`)) : null,
        e.shieldsMax ? this.bar(e.shields / e.shieldsMax) : null,
        el('div', { class: 'kv' }, el('span', {}, 'Hull'), el('span', {}, `${Math.round(e.hull)} / ${e.hullMax}`)),
        this.bar(e.hull / e.hullMax, e.hull / e.hullMax < 0.3 ? 'bad' : 'good'),
        hostile ? el('div', { class: 'a' }, el('button', { class: `small ${g.target === e ? 'primary' : ''}`, onclick: () => (g.target === e ? ((g.target = null), this.refresh()) : g.select(e)) }, g.target === e ? (g.gunnerOn === e ? `Targeted · ${gunner ?? 'nobody'} firing` : 'Targeted') : 'Target')) : null
      )),
      !ships.length ? el('div', { class: 'hint' }, 'Nothing on the scope.') : null
    );
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
    const stations = g.phase === 'board' ? [] : ['helm', 'turret', 'idle'];
    const crew = CREW.concat(HIRE.filter((h) => g.state.hired.includes(h.id)));
    const docked = g.phase === 'dock' ? g.dockedAt : null;
    return [
      this.sec('Crew', `${crew.length} aboard`,
        ...crew.map((c) => el('div', { class: 'card' },
          el('div', { class: 't' }, el('b', {}, c.name), el('span', { class: 'muted' }, c.role)),
          el('div', { class: 'd' }, c.skill),
          stations.length && c.role !== 'marine' ? el('div', { class: 'a' }, ...stations.map((s) => el('button', { class: `small ${g.state.crew[c.id] === s ? 'primary' : ''}`, onclick: () => g.setCrew(c.id, s) }, s === 'helm' ? 'Helm' : s === 'turret' ? 'Turret' : 'Stand down'))) : c.role === 'marine' ? el('div', { class: 'a' }, el('span', { class: 'chip good' }, 'boards with you')) : null
        )),
        el('div', { class: 'hint' }, 'Take a seat yourself and whoever holds it stands aside; stand up and they take it back.')
      ),
      docked ? this.sec('For hire', docked.name,
        ...HIRE.filter((h) => h.at === docked.id).map((h) => el('div', { class: `card ${g.state.hired.includes(h.id) ? 'dim' : ''}` },
          el('div', { class: 't' }, el('b', {}, h.name), el('span', { class: 'price' }, `${h.cost} cr`)),
          el('div', { class: 'd' }, h.skill),
          el('div', { class: 'a' }, el('button', { class: 'small primary', disabled: g.state.hired.includes(h.id) || g.state.credits < h.cost, onclick: () => g.hire(h.id) }, g.state.hired.includes(h.id) ? 'Hired' : 'Hire'))
        ))
      ) : null,
      docked ? this.sec('The wire', null, el('div', { class: 'log' }, ...(g.wire ?? []).map((p) => el('div', {}, `${p.who}: ${p.text}`)), el('div', { class: 'hint' }, g.net.kind === 'local' ? 'Local wire: only your own news until a backend carries it.' : ''))) : null
    ];
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
        el('div', { class: 'card on' }, el('div', { class: 't' }, el('b', {}, 'Kestrel'), el('span', { class: 'muted' }, 'flagship · you')), el('div', { class: 'd' }, 'One fighter bay, one turret. Where you are.')),
        ...g.state.fleet.map((f) => el('div', { class: 'card' },
          el('div', { class: 't' }, el('b', {}, f.name), el('span', { class: 'muted' }, f.cls)),
          el('div', { class: 'd' }, f.job ? `On a job: ${FLEET_JOBS.find((j) => j.id === f.job.id).name} · back in ${fmtTime((f.job.endsAt - Date.now()) / 1000)}` : f.order === 'follow' ? 'Following the Kestrel.' : 'Holding position.'),
          this.bar(f.hull / f.hullMax, 'good'),
          !f.job ? el('div', { class: 'a' },
            el('button', { class: `small ${f.order === 'follow' ? 'primary' : ''}`, onclick: () => g.fleetOrder(f.id, 'follow') }, 'Follow'),
            el('button', { class: `small ${f.order === 'hold' ? 'primary' : ''}`, onclick: () => g.fleetOrder(f.id, 'hold') }, 'Hold'),
            ...FLEET_JOBS.map((j) => el('button', { class: 'small', title: j.blurb, onclick: () => g.fleetOrder(f.id, 'job', j) }, `${j.name} · ${j.minutes} min · ${j.reward} cr`))
          ) : null
        )),
        !g.state.fleet.length ? el('div', { class: 'hint' }, 'Only the Kestrel. Board a Rook ship and keep her, and she appears here with orders to give.') : null
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
      this.sec('Paint', 'free',
        el('div', { class: 'd', style: 'margin-bottom:4px' }, 'Hull'),
        el('div', { class: 'swatches' }, ...PAINTS.map((c) => el('div', { class: `swatch ${g.state.paint === c ? 'on' : ''}`, style: `background:${c}`, onclick: () => g.setPaint(c) }))),
        el('div', { class: 'd', style: 'margin:8px 0 4px' }, 'Engines and cannons'),
        el('div', { class: 'swatches' }, ...ENGINE_COLORS.map((c) => el('div', { class: `swatch ${g.state.engine === c ? 'on' : ''}`, style: `background:${c}`, onclick: () => g.setEngine(c) })))
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
          el('div', { class: 'd' }, ship.captured ? 'The bridge is yours.' : b.defendersLeft() ? 'Clear the hull. The bridge console is forward.' : 'Clear. Hold E at the bridge console.')
        )
      ),
      ship.captured ? this.sec('She is yours', null,
        el('div', { class: 'card' }, el('div', { class: 'd' }, `${ship.name}: ${ship.cls.cls}. Keep her and she follows the Kestrel and takes orders on the Fleet tab; or strip her and blow her.`),
          el('div', { class: 'a' }, el('button', { class: 'small primary', onclick: () => g.keepShip(ship) }, 'Add to the fleet'), el('button', { class: 'small', onclick: () => g.scuttleShip(ship) }, 'Loot and scuttle'))
        )
      ) : this.sec('Rifle', g.ship.rifleDamage === 25 ? 'standard' : 'boarding rifle II', el('div', { class: 'hint' }, `Hits for ${g.ship.rifleDamage}. Defenders take 60. ${g.ship.armour < 1 ? 'Armour halves what you take.' : 'No armour: a Rook hits for 8.'}`))
    ];
  }
}
