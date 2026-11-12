// The wire: the seam for asynchronous multiplayer. Every captain plays in their own universe; what crosses
// the network is news (kills, captures, claims), sector claims and faction membership, never a live ship.
// This is the local stand-in: it keeps the wire in localStorage and answers like a backend would, so the
// game is written against the interface and a NodeGX backend can replace this file (see README §Network).

const KEY = 'threadspace-wire';

export class LocalNet {
  constructor() {
    this.ready = true;
    this.kind = 'local';
  }

  read() {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? '{"posts":[],"claims":{}}');
    } catch {
      return { posts: [], claims: {} };
    }
  }

  write(w) {
    try {
      localStorage.setItem(KEY, JSON.stringify(w));
    } catch {}
  }

  /** News from every captain, newest first. Here: only yours. */
  async feed(limit = 20) {
    return this.read().posts.slice(-limit).reverse();
  }

  /** Something worth telling the other captains. */
  async post(captain, text, kind = 'news') {
    const w = this.read();
    w.posts.push({ t: Date.now(), who: captain, text, kind });
    if (w.posts.length > 200) w.posts.splice(0, w.posts.length - 200);
    this.write(w);
  }

  /** Who holds each sector. A claim is a name and a time; the newest claim wins, as another captain could take it back. */
  async claims() {
    return this.read().claims;
  }

  async claim(sector, captain, faction = null) {
    const w = this.read();
    w.claims[sector] = { captain, faction, t: Date.now() };
    this.write(w);
    await this.post(captain, `laid claim to ${sector}`, 'claim');
    return w.claims[sector];
  }
}
