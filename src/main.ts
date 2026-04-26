// Point d'entrée : initialise le thème puis monte le router.

import { mountRouter } from './ui/router';
import { initTheme } from './ui/theme';

initTheme();

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
mountRouter(root);
