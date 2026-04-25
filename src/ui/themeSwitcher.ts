// Bouton flottant pour basculer entre les thèmes dark/light.
// Masqué pendant une partie ('playing'), visible sur les écrans home / end.

import { store } from '../state/store';
import { getTheme, onThemeChange, toggleTheme } from './theme';

export function mountThemeSwitcher(parent: HTMLElement = document.body) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-switch';
  btn.setAttribute('aria-label', '테마 전환');
  btn.title = '테마 전환';

  const renderIcon = () => {
    // Affiche l'icône de ce vers quoi on bascule.
    btn.textContent = getTheme() === 'dark' ? '☀' : '☾';
  };
  const renderVisibility = () => {
    btn.hidden = store.state.phase === 'playing';
  };
  renderIcon();
  renderVisibility();

  btn.addEventListener('click', toggleTheme);
  onThemeChange(renderIcon);
  store.addEventListener('change', renderVisibility);

  parent.appendChild(btn);
  return btn;
}
