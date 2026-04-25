// Bouton flottant pour basculer entre les thèmes dark/light.

import { getTheme, onThemeChange, toggleTheme } from './theme';

export function mountThemeSwitcher(parent: HTMLElement = document.body) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-switch';
  btn.setAttribute('aria-label', '테마 전환');
  btn.title = '테마 전환';

  const render = () => {
    // Affiche l'icône de ce vers quoi on bascule.
    btn.textContent = getTheme() === 'dark' ? '☀' : '☾';
  };
  render();

  btn.addEventListener('click', toggleTheme);
  onThemeChange(render);

  parent.appendChild(btn);
  return btn;
}
