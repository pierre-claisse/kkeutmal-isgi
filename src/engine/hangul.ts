// Utilitaires syllabiques Hangul + 두음 법칙 (initial sound rule).
//
// La règle s'applique au couple (initiale, voyelle) d'une syllabe en début
// de mot, indépendamment de la finale. On décompose donc la syllabe en
// jamos pour déterminer la transformation, plutôt qu'une table statique
// qui ne couvrirait que les syllabes sans finale (manquerait par exemple
// 력 → 역, 력 = ㄹ+ㅕ+ㄱ avec finale).

const HANGUL_RE = /^[가-힣]+$/;

// Indices Hangul (U+AC00 = base, syllable = base + cho*588 + jung*28 + jong).
const SYLLABLE_BASE = 0xac00;
const SYLLABLE_COUNT = 11172;
const CHO_NIEUN = 2; // ㄴ
const CHO_RIEUL = 5; // ㄹ
const CHO_IEUNG = 11; // ㅇ

// Voyelles (jung) devant lesquelles ㄴ se transforme en ㅇ : ㅕ ㅛ ㅠ ㅣ.
const NIEUN_DROPS_BEFORE = new Set([6, 12, 17, 20]);
// Voyelles devant lesquelles ㄹ se transforme en ㅇ : ㅑ ㅕ ㅖ ㅛ ㅠ ㅣ.
const RIEUL_TO_IEUNG_BEFORE = new Set([2, 6, 7, 12, 17, 20]);
// Voyelles devant lesquelles ㄹ se transforme en ㄴ : ㅏ ㅐ ㅗ ㅚ ㅜ ㅡ.
const RIEUL_TO_NIEUN_BEFORE = new Set([0, 1, 8, 11, 13, 18]);

export function isHangulOnly(s: string): boolean {
  return HANGUL_RE.test(s);
}

export function lastSyllable(word: string): string {
  return word.charAt(word.length - 1);
}

export function firstSyllable(word: string): string {
  return word.charAt(0);
}

/** Applique le 두음 법칙 à une syllabe (ou null si rien à transformer). */
function applyDuum(syllable: string): string | null {
  if (syllable.length !== 1) return null;
  const base = syllable.charCodeAt(0) - SYLLABLE_BASE;
  if (base < 0 || base >= SYLLABLE_COUNT) return null;
  const cho = Math.floor(base / 588);
  const rem = base % 588;
  const jung = Math.floor(rem / 28);
  const jong = rem % 28;

  let newCho: number | null = null;
  if (cho === CHO_NIEUN && NIEUN_DROPS_BEFORE.has(jung)) {
    newCho = CHO_IEUNG;
  } else if (cho === CHO_RIEUL) {
    if (RIEUL_TO_IEUNG_BEFORE.has(jung)) newCho = CHO_IEUNG;
    else if (RIEUL_TO_NIEUN_BEFORE.has(jung)) newCho = CHO_NIEUN;
  }
  if (newCho === null) return null;
  return String.fromCharCode(SYLLABLE_BASE + newCho * 588 + jung * 28 + jong);
}

/**
 * Renvoie l'ensemble des syllabes initiales acceptables pour un mot
 * succédant à un mot finissant par `tail`. Application unidirectionnelle
 * (on accepte la forme originelle ET sa transformation 두음, jamais
 * l'inverse) — le 두음 법칙 est toujours actif dans le jeu.
 */
export function acceptableInitials(tail: string): string[] {
  const mapped = applyDuum(tail);
  return mapped ? [tail, mapped] : [tail];
}
