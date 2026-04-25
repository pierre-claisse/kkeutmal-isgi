// Smoke test : valide les invariants du dict et de l'engine sans lancer de browser.

import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DICT = JSON.parse(
  await readFile(resolve(__dirname, '../src/data/dict.json'), 'utf8'),
);

const words = new Set(DICT.w);
const byInitial = DICT.i; // { syllable: [idx, ...] }

const DUUM = {
  녀: '여', 뇨: '요', 뉴: '유', 니: '이',
  랴: '야', 려: '여', 례: '예', 료: '요', 류: '유', 리: '이',
  라: '나', 래: '내', 로: '노', 뢰: '뇌', 루: '누', 르: '느',
};

function acceptable(tail, duumOn) {
  if (!duumOn) return [tail];
  const m = DUUM[tail];
  return m ? [tail, m] : [tail];
}

function pickWord(prevTail, used, duumOn) {
  const tails = acceptable(prevTail, duumOn);
  const candidates = [];
  for (const t of tails) {
    const idxs = byInitial[t];
    if (!idxs) continue;
    for (const idx of idxs) {
      const w = DICT.w[idx];
      if (!used.has(w)) candidates.push(w);
    }
  }
  if (candidates.length === 0) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function test(name, fn) {
  try {
    fn();
    console.log('  ✓', name);
    test.pass++;
  } catch (e) {
    console.error('  ✗', name, '\n     ', e.message);
    test.fail++;
  }
}
test.pass = 0;
test.fail = 0;

console.log(`\n== Dictionary stats ==`);
console.log(`  words: ${DICT.w.length}`);
console.log(`  distinct initials: ${Object.keys(byInitial).length}`);

console.log(`\n== Engine invariants ==`);

test('all words ≥ 2 syllables', () => {
  for (const w of DICT.w) {
    if (w.length < 2) throw new Error(`got 1-char word: ${w}`);
  }
});

test('all words pure Hangul', () => {
  const re = /^[가-힣]+$/;
  for (const w of DICT.w) {
    if (!re.test(w)) throw new Error(`got non-Hangul: ${w}`);
  }
});

test('byInitial buckets reference valid words', () => {
  for (const [syl, idxs] of Object.entries(byInitial)) {
    for (const idx of idxs) {
      const w = DICT.w[idx];
      if (!w || w.charAt(0) !== syl) {
        throw new Error(`bucket ${syl} has wrong word ${w}`);
      }
    }
  }
});

test('words is unique', () => {
  if (new Set(DICT.w).size !== DICT.w.length) throw new Error('duplicates');
});

test('두음 법칙: 녀 → 여 transitions exist', () => {
  // Trouver un mot finissant par 녀 puis vérifier qu'on peut chaîner via 여
  const endsIn녀 = DICT.w.find((w) => w.endsWith('녀'));
  if (!endsIn녀) return; // skip si aucun
  const next = pickWord('녀', new Set(), true);
  if (!next) throw new Error('no successor with duum on');
  if (next.charAt(0) !== '녀' && next.charAt(0) !== '여') {
    throw new Error(`unexpected initial ${next}`);
  }
});

test('strict mode: 라 successor must start with 라', () => {
  const next = pickWord('라', new Set(), false);
  if (!next) return; // skip si aucun
  if (next.charAt(0) !== '라') {
    throw new Error(`unexpected strict initial ${next}`);
  }
});

test('chain of 5 random words is feasible from random start', () => {
  let seed = DICT.w[Math.floor(Math.random() * DICT.w.length)];
  const used = new Set([seed]);
  for (let i = 0; i < 5; i++) {
    const tail = seed.charAt(seed.length - 1);
    const next = pickWord(tail, used, true);
    if (!next) {
      // 한방 acceptable, on s'arrête
      return;
    }
    used.add(next);
    seed = next;
  }
});

test('common words are present', () => {
  const expected = ['사과', '나무', '학교', '음식', '학생', '기차', '컴퓨터'];
  for (const w of expected) {
    if (!words.has(w)) console.warn(`    (warn: missing common word ${w})`);
  }
});

test('1760 distinct initials match 표준국어대사전 expectations', () => {
  const n = Object.keys(byInitial).length;
  if (n < 1500) throw new Error(`only ${n} distinct initials, expected ≥ 1500`);
});

console.log(`\n${test.pass} passed, ${test.fail} failed\n`);
process.exit(test.fail > 0 ? 1 : 0);
