(() => {
  const P = window.__wreq('./src/editor/src/models/projectmodel.ts').ProjectModel.instance;
  const find = (comp, id) => { let hit; P.getComponentWithName(comp).graph.forEachNode((n) => { if (n.id === id) { hit = n; return true; } }); return hit; };
  const script = find('/Components/PhraseRow', 'play_audio').parameters.functionScript || '';
  const lessons = find('/Components/Data/Lessons', 'lessons_data').parameters.json || '';
  const tts = find('/#__cloud__/Cloud Functions/Speak Phrase', 'tts_call');
  const actions = find('/Pages/Lesson', 'actions_row');
  return { dir: P._retainedProjectDirectory, wavGuard: script.includes('isWav'), merciBeaucoup: lessons.includes('Merci beaucoup'),
    voice: (/voiceName\s*:\s*"([^"]*)"/.exec(tts && tts.parameters.functionScript || '') || [])[1], borderTopStyle: actions && actions.parameters.borderTopStyle };
})()
