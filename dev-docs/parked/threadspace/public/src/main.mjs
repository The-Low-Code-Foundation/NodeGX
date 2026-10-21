import { Game } from './game.mjs';

const game = new Game();
window.__game = game;
const btnContinue = document.getElementById('btn-continue');
btnContinue.hidden = !game.hasSave();
btnContinue.addEventListener('click', () => game.load());
document.getElementById('btn-new').addEventListener('click', () => game.newGame());
game.frame();

// For the drive and the console: shortcuts past the walking.
game.debug = {
  use: (id) => game.doUse(id),
  phase: (p, opts) => game.setPhase(p, opts),
  go: (kind, offset = 150) => {
    const e = game.world.entities.find((x) => x.kind === kind && x.alive);
    if (!e) return null;
    const p = e.kind === 'station' ? e.obj.localToWorld(e.obj.userData.dock.clone()) : e.obj.position.clone();
    const dir = p.clone().sub(game.player.obj.position).normalize();
    game.player.obj.position.copy(p).addScaledVector(dir, -offset);
    game.player.obj.lookAt(p);
    game.player.obj.updateMatrixWorld();
    return e.name;
  },
  credits: (n) => (game.state.credits += n),
  killHostiles: () => game.hostiles().forEach((e) => e.damage(99999, e.obj.position.clone(), 'player', game.player)),
  assist: (on) => (game.assist = on),
  stats: () => game.stats()
};
