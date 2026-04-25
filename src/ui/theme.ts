// Couleurs joueurs néon (haute saturation, contraste max sur AMOLED noir).

export const PLAYER_COLORS = ['#00f0ff', '#ff2ec4', '#a4ff3d', '#ff8a1f'] as const;

export function colorFor(playerIdx: number): string {
  return PLAYER_COLORS[playerIdx % PLAYER_COLORS.length]!;
}
