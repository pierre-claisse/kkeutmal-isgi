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

function detectInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const m = window.matchMedia('(prefers-color-scheme: light)');
  return m.matches ? 'light' : 'dark';
}

let current: Theme = detectInitialTheme();
const listeners = new Set<(t: Theme) => void>();

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[t]);
}

export function getTheme(): Theme {
  return current;
}

export function toggleTheme() {
  current = current === 'dark' ? 'light' : 'dark';
  applyTheme(current);
  for (const l of listeners) l(current);
}

export function onThemeChange(cb: (t: Theme) => void): void {
  listeners.add(cb);
}

export function initTheme() {
  applyTheme(current);
}
