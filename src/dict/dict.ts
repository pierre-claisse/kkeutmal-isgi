// Chargement et structures du dictionnaire embarqué.

import dictData from '../data/dict.json';

interface RawDict {
  w: string[];
  i: Record<string, number[]>;
}

export interface Dict {
  /** Toutes les mots, triés (référence directe au tableau du JSON). */
  all: readonly string[];
  /** Set pour validation O(1). */
  words: ReadonlySet<string>;
  /** Index par syllabe initiale → liste de mots. Buckets matérialisés à la demande. */
  byInitial: Map<string, readonly string[]>;
  /** Set des syllabes initiales pour lesquelles il existe au moins un mot (sert au calcul 한방단어). */
  validInitials: ReadonlySet<string>;
}

let cached: Dict | null = null;

export function getDict(): Dict {
  if (cached) return cached;
  const raw = dictData as RawDict;
  const words = new Set(raw.w);
  const byInitial = new Map<string, readonly string[]>();
  for (const [syl, idxs] of Object.entries(raw.i)) {
    byInitial.set(
      syl,
      idxs.map((i) => raw.w[i]!),
    );
  }
  const validInitials = new Set(byInitial.keys());
  cached = { all: raw.w, words, byInitial, validInitials };
  return cached;
}
