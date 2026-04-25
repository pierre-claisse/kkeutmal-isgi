// Utilitaires syllabiques Hangul + table 두음 법칙 (initial sound rule).

const DUUM_TABLE: Record<string, string> = {
  녀: '여',
  뇨: '요',
  뉴: '유',
  니: '이',
  랴: '야',
  려: '여',
  례: '예',
  료: '요',
  류: '유',
  리: '이',
  라: '나',
  래: '내',
  로: '노',
  뢰: '뇌',
  루: '누',
  르: '느',
};

const HANGUL_RE = /^[가-힣]+$/;

export function isHangulOnly(s: string): boolean {
  return HANGUL_RE.test(s);
}

export function lastSyllable(word: string): string {
  return word.charAt(word.length - 1);
}

export function firstSyllable(word: string): string {
  return word.charAt(0);
}

/**
 * Renvoie l'ensemble des syllabes initiales acceptables pour un mot
 * succédant à un mot finissant par `tail`.
 *
 * - duumOn=false → [tail] uniquement (jeu strict).
 * - duumOn=true  → [tail, transformée 두음 법칙] si applicable.
 *
 * Application unidirectionnelle : on accepte la forme originelle ET sa
 * transformation, mais pas l'inverse.
 */
export function acceptableInitials(tail: string, duumOn: boolean): string[] {
  if (!duumOn) return [tail];
  const mapped = DUUM_TABLE[tail];
  return mapped ? [tail, mapped] : [tail];
}
