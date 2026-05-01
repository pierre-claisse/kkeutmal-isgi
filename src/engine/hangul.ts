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
 * succédant à un mot finissant par `tail`. Application unidirectionnelle
 * (on accepte la forme originelle ET sa transformation 두음, jamais
 * l'inverse) — le 두음 법칙 est toujours actif dans le jeu.
 */
export function acceptableInitials(tail: string): string[] {
  const mapped = DUUM_TABLE[tail];
  return mapped ? [tail, mapped] : [tail];
}
