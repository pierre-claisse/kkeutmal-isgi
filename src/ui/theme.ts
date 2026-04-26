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

const darkQuery =
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null;

// Le thème suit toujours le réglage système. Clair par défaut si
// l'information n'est pas disponible.
function systemTheme(): Theme {
  return darkQuery?.matches ? 'dark' : 'light';
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[t]);
}

export function initTheme() {
  applyTheme(systemTheme());
  darkQuery?.addEventListener('change', () => applyTheme(systemTheme()));
}
