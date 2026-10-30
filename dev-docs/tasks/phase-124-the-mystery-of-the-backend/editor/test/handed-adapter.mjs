// P127 BKO-009 — a hand-written adapter for the backend suite's read half (lib/handed.mjs), for the Riverside club
// (`phase-127-the-backend-in-the-open/day/lab.mjs`). It knows the club from its rules file, not from the kit: members
// and the moderator read the notices and the meetings, the moderator reads the queue and the directory, and
// `myStanding` / `myNotifySetting` answer a word and a yes/no, never a row. HANDED_MODE picks a control:
//   liar      Dev, still waiting, is shown the notices
//   naming    myNotifySetting is shown handing back the person's own directory row (it reads it; it hands a yes/no)
import { backend } from '@nodegx/backend-kit';

export default function handedAdapter(mode = process.env.HANDED_MODE ?? 'honest') {
  let be;
  const ids = async (table) => ((await be.get(`/api/${table}?limit=200`)).results ?? []).map((r) => r.objectId);
  return {
    name: mode === 'honest' ? 'a day in the life (hand-written)' : `a day in the life (the ${mode} control)`,
    open({ backend: url, token }) {
      be = backend(url, token);
    },
    async handed(p) {
      const moderator = p.roles.includes('admin');
      const member = moderator || p.roles.includes('member');
      const shows = member || (mode === 'liar' && p.email?.startsWith('dev@'));
      const day = [
        { fn: 'myStanding', args: {}, rows: {} },
        { table: 'Association', rows: { Association: await ids('Association') } },
        { table: 'Announcement', rows: { Announcement: shows ? await ids('Announcement') : [] } },
        { table: 'Meeting', rows: { Meeting: member ? await ids('Meeting') : [] } }
      ];
      if (member) {
        const own = ((await be.get('/api/Member?limit=200')).results ?? []).filter((m) => m.userId === p.id).map((m) => m.objectId);
        day.push({ fn: 'myNotifySetting', args: {}, rows: mode === 'naming' ? { Member: own } : {} });
      }
      if (moderator) {
        day.push({ table: 'MemberRequest', rows: { MemberRequest: await ids('MemberRequest') } });
        day.push({ table: 'Member', rows: { Member: await ids('Member') } });
      }
      return day;
    }
  };
}
