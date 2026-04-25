// Point d'entrée : monte le router et lance la boucle de tick.

import { store } from './state/store';
import { mountRouter } from './ui/router';

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
mountRouter(root);

// Boucle de tick (mode temps).
let last = performance.now();
const tick = (now: number) => {
  const dt = now - last;
  last = now;
  if (store.state.phase === 'playing' && store.state.mode.kind === 'time') {
    store.tick(dt);
  }
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
