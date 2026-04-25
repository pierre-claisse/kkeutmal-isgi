// Couleurs joueurs néon (haute saturation, contraste max sur AMOLED noir).

export const PLAYER_COLORS = [
  '#00f0ff', // cyan
  '#ff2ec4', // magenta
  '#a4ff3d', // lime
  '#ff8a1f', // orange
  '#ffe600', // yellow
  '#b95dff', // purple
] as const;

export function colorFor(playerIdx: number): string {
  return PLAYER_COLORS[playerIdx % PLAYER_COLORS.length]!;
}
