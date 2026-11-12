// A deliberately wrong adapter, to prove the suite can fail: it shows Dev (in no group) the announcements a member
// gets, and hides one announcement from Ben. The suite must say FAIL.
import real from '../adapter.mjs';

export default function () {
  const ed = real();
  return {
    ...ed,
    name: 'A day in the life (broken on purpose)',
    async handed(person) {
      const steps = await ed.handed(person);
      if (person.email === 'dev@riverside.test') steps.push({ table: 'Announcement', rows: { Announcement: ['df4db8b6-b2af-4e9b-9a7e-5f63ba794113', '7ebf2541-c040-4f3c-bb7e-b891936ecf5d'] } });
      if (person.email === 'ben@riverside.test') {
        const s = steps.find((x) => x.table === 'Announcement');
        if (s) s.rows.Announcement = s.rows.Announcement.slice(1);
      }
      return steps;
    }
  };
}
