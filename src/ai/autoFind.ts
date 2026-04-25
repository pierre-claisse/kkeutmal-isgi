// IA "safe-first" : choisit un mot pour continuer la chaîne.

import type { Dict } from '../dict/dict';
import { acceptableInitials, lastSyllable } from '../engine/hangul';

const successorCache = new WeakMap<Dict, Map<string, number>>();

function successorCount(dict: Dict, word: string, duumOn: boolean): number {
  let cache = successorCache.get(dict);
  if (!cache) {
    cache = new Map();
    successorCache.set(dict, cache);
  }
  const key = `${duumOn ? '1' : '0'}|${word}`;
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const tails = acceptableInitials(lastSyllable(word), duumOn);
  let n = 0;
  for (const t of tails) n += dict.byInitial.get(t)?.length ?? 0;
  cache.set(key, n);
  return n;
}

interface PickOptions {
  /** Mode IA : choisir prudemment (max successeurs). Sinon : random pour 'help'. */
  strategy: 'safe-first' | 'random';
}

/**
 * Trouve un mot non-utilisé qui poursuit valablement la chaîne, ou null.
 *
 * @param prevWord  mot précédent (la dernière syllabe sert de pivot).
 *                  null = premier coup ou tour libre → on tire un mot au hasard.
 * @param dict      dictionnaire embarqué.
 * @param used      mots déjà joués dans la partie.
 * @param duumOn    règle 두음 법칙.
 * @param opts      stratégie de sélection.
 */
export function pickWord(
  prevWord: string | null,
  dict: Dict,
  used: ReadonlySet<string>,
  duumOn: boolean,
  opts: PickOptions,
): string | null {
  let candidates: string[];
  if (prevWord === null) {
    candidates = filterUnused(dict.all, used);
  } else {
    const tails = acceptableInitials(lastSyllable(prevWord), duumOn);
    const merged: string[] = [];
    for (const t of tails) {
      const bucket = dict.byInitial.get(t);
      if (bucket) for (const w of bucket) if (!used.has(w)) merged.push(w);
    }
    candidates = merged;
  }
  if (candidates.length === 0) return null;
  if (opts.strategy === 'random') {
    return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
  }
  // safe-first : conserver le tiers supérieur en termes de successeurs, puis random.
  const scored = candidates.map((w) => ({ w, s: successorCount(dict, w, duumOn) }));
  scored.sort((a, b) => b.s - a.s);
  const cutoff = Math.max(1, Math.floor(scored.length / 3));
  const top = scored.slice(0, cutoff);
  return top[Math.floor(Math.random() * top.length)]!.w;
}

function filterUnused(all: readonly string[], used: ReadonlySet<string>): string[] {
  // Pour le premier coup, on peut piocher dans tous les mots (sauf déjà joués).
  // Échantillonnage par réservoir simple pour éviter d'allouer un grand tableau.
  // Mais en pratique used est petit (≤ centaines), donc filter direct OK.
  const out: string[] = [];
  for (const w of all) if (!used.has(w)) out.push(w);
  return out;
}
