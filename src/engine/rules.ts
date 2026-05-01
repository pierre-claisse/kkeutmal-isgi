// Règles du 끝말잇기 : validation des coups + détection 한방단어.

import type { Dict } from '../dict/dict';
import { acceptableInitials, firstSyllable, isHangulOnly, lastSyllable } from './hangul';

export type ValidationResult =
  | { ok: true }
  | { ok: false; reason: ValidationError };

type ValidationError =
  | 'empty'
  | 'not-hangul'
  | 'too-short'
  | 'not-in-dict'
  | 'already-used'
  | 'wrong-initial';

interface ValidateContext {
  prevWord: string | null;     // null → premier coup, ou tour libre après 한방단어
  freeTurn: boolean;            // tour libre (après 한방단어 ou premier coup)
  dict: Dict;
  used: Set<string>;
}

export function validateMove(word: string, ctx: ValidateContext): ValidationResult {
  const w = word.trim();
  if (!w) return { ok: false, reason: 'empty' };
  if (!isHangulOnly(w)) return { ok: false, reason: 'not-hangul' };
  if (w.length < 2) return { ok: false, reason: 'too-short' };
  if (!ctx.dict.words.has(w)) return { ok: false, reason: 'not-in-dict' };
  if (ctx.used.has(w)) return { ok: false, reason: 'already-used' };
  if (!ctx.freeTurn && ctx.prevWord) {
    const tails = acceptableInitials(lastSyllable(ctx.prevWord));
    if (!tails.includes(firstSyllable(w))) {
      return { ok: false, reason: 'wrong-initial' };
    }
  }
  return { ok: true };
}

/**
 * Détermine si le mot est un 한방단어 dans le contexte de la partie : la
 * dernière syllabe (étendue par 두음 법칙) n'a aucun successeur jouable.
 *
 * Un successeur est exclu si :
 *  - c'est le mot lui-même (cas du self-loop comme 곧곧)
 *  - il a déjà été joué dans la partie (cas de l'épuisement, par ex.
 *    사이즈 quand 즈음 est déjà passé)
 *
 * Quand `used` est omis, le check est purement structurel (sur le
 * lexique uniquement).
 */
export function isHanbang(
  word: string,
  dict: Dict,
  used?: ReadonlySet<string>,
): boolean {
  const tails = acceptableInitials(lastSyllable(word));
  for (const t of tails) {
    const bucket = dict.byInitial.get(t);
    if (!bucket) continue;
    for (const w of bucket) {
      if (w === word) continue;
      if (used?.has(w)) continue;
      return false;
    }
  }
  return true;
}

export const ERROR_MESSAGES: Record<ValidationError, string> = {
  empty: '단어를 입력하세요.',
  'not-hangul': '한글만 입력 가능합니다.',
  'too-short': '두 글자 이상이어야 합니다.',
  'not-in-dict': '사전에 없는 단어입니다.',
  'already-used': '이미 사용된 단어입니다.',
  'wrong-initial': '앞 단어의 끝 글자로 시작해야 합니다.',
};
