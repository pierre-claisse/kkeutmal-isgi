// Point d'entrée : initialise le thème puis monte le router.

import { mountRouter } from './ui/router';
import { initTheme } from './ui/theme';
import { mountThemeSwitcher } from './ui/themeSwitcher';

initTheme();
mountThemeSwitcher();

const root = document.getElementById('app');
if (!root) throw new Error('#app not found');
mountRouter(root);
