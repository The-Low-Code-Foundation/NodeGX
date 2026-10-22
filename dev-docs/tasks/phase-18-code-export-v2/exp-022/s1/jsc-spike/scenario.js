// One scenario, both hosts: the client's own members, as a Function's script would call them.
(async function () {
  const { noodl, client } = NodegxClient;
  const out = [];
  const step = async (name, f) => { try { out.push([name, 'ok', await f()]); } catch (e) { out.push([name, 'threw', e instanceof Error ? 'Error: ' + e.message : e]); } };
  await step('who (signed out)', async () => (await noodl.CloudFunctions.run('whoAmI', {})).me);
  await step('open tasks', async () => (await noodl.Records.query('Task', { done: { equalTo: false } }, { plain: true })).map((r) => [r.objectId, r.title, r.owner, r.due, typeof r.id].join('|')));
  localStorage['Parse/noodl-desk/currentUser'] = JSON.stringify({ objectId: 'u1', sessionToken: 'tok-ann', username: 'ann', email: 'ann@x.test' });
  await step('who (Ann)', async () => (await noodl.CloudFunctions.run('whoAmI', {})).me);
  await step('Users.Current', async () => { const c = noodl.Users.Current; return c && [c.id, c.username, c.email]; });
  await step('add', async () => noodl.CloudFunctions.run('addTask', { title: 'From the phone' }));
  await step('open tasks again', async () => (await noodl.Records.query('Task', { done: { equalTo: false } }, { plain: true })).map((r) => r.title));
  await step('record verb query', async () => (await client.query('Task', { where: { done: true } })).map((r) => [r.id, r.title]));
  await step('locked', async () => noodl.Records.query('Locked', {}, { plain: true }));
  await step('refused fn', async () => noodl.CloudFunctions.run('locked', {}));
  await step('sign', async () => (await noodl.Files.sign('photo.png')).url);
  __report(JSON.stringify(out, null, 1));
})();
