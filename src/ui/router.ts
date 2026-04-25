// Mini "router" : monte l'écran correspondant à la phase courante.

import { store } from '../state/store';
import { renderEnd } from './screens/end';
import { renderGame } from './screens/game';
import { renderHome } from './screens/home';

export function mountRouter(root: HTMLElement) {
  const render = () => {
    const phase = store.state.phase;
    root.innerHTML = '';
    if (phase === 'home') renderHome(root);
    else if (phase === 'playing') renderGame(root);
    else renderEnd(root);
  };
  render();
  store.addEventListener('change', render);
}
