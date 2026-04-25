// Couleurs joueurs (palette 단청 inspirée). Les hex définitifs sont dans
// styles/main.css par thème ; ici on retourne des références var(--pX)
// pour que les couleurs s'adaptent au switch dark/light.

export function colorFor(playerIdx: number): string {
  const n = (playerIdx % 6) + 1;
  return `var(--p${n})`;
}

// ==================== Theme management ====================

type Theme = 'dark' | 'light';

const THEME_COLORS: Record<Theme, string> = {
  dark: '#000000',
  light: '#f7f1e1',
};

const lightQuery =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;

function systemTheme(): Theme {
  return lightQuery?.matches ? 'light' : 'dark';
}

let current: Theme = systemTheme();
const listeners = new Set<(t: Theme) => void>();

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[t]);
}

function setCurrent(t: Theme) {
  current = t;
  applyTheme(t);
  for (const l of listeners) l(t);
}

// Si le thème du système change pendant la session, on suit.
lightQuery?.addEventListener('change', () => setCurrent(systemTheme()));

export function getTheme(): Theme {
  return current;
}

export function toggleTheme() {
  setCurrent(current === 'dark' ? 'light' : 'dark');
}

export function onThemeChange(cb: (t: Theme) => void): void {
  listeners.add(cb);
}

export function initTheme() {
  applyTheme(current);
}
