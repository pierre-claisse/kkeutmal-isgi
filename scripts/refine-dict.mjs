// Refine src/data/dict.json en gardant les 150 000 noms les plus fréquemment
// utilisés en coréen contemporain.
//
// Source de fréquence : OpenSubtitles ko (hermitdave/FrequencyWords).
// Pour chaque noun N de notre dictionnaire, on somme la fréquence de ses
// formes de surface (N suivi de particules courantes : 가, 은, 를, 의, 에…).
//
// Tri : fréquence décroissante, puis longueur croissante, puis alphabétique.

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CACHE_DIR = join(ROOT, '.cache');
const FREQ_PATH = join(CACHE_DIR, 'ko_freq.txt');
const DICT_PATH = join(ROOT, 'src', 'data', 'dict.json');
const FREQ_URL =
  'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/ko/ko_full.txt';

// On ne garde que les noms attestés dans le corpus OpenSubtitles
// (score > 0). OpenSubtitles ne couvre que ~34k de nos 265k entrées,
// pas 150k — mais c'est précisément ce qu'il faut pour éliminer
// les mots dialectaux/archaïques/techniques que le user trouvait
// incompréhensibles.

// Particules nominales courantes. Suffixées au nom pour matcher les formes
// de surface en corpus. La forme nue ('' = bare) est aussi testée.
const PARTICLES = [
  '',
  '가', '이',                    // sujet
  '은', '는',                    // topic
  '을', '를',                    // objet
  '의',                          // génitif
  '에', '에서', '에게', '한테', '께', // locatif/datif
  '도', '만',                    // additif/restrictif
  '로', '으로',                  // instrumental
  '와', '과',                    // et / avec
  '까지', '부터', '마다',         // bornes
  '처럼', '보다',                 // comparaison
  '들',                          // pluriel
  '입니다', '이에요', '예요',     // copule polie
  '이야', '야', '아',             // copule cas / vocatif
];

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureFreq() {
  if (await exists(FREQ_PATH)) {
    console.log(`[refine] cache hit: ${FREQ_PATH}`);
    return;
  }
  await mkdir(CACHE_DIR, { recursive: true });
  console.log('[refine] downloading frequency list...');
  const res = await fetch(FREQ_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const text = await res.text();
  await writeFile(FREQ_PATH, text, 'utf8');
  console.log(`[refine] saved ${FREQ_PATH}`);
}

async function loadFreq() {
  await ensureFreq();
  const raw = await readFile(FREQ_PATH, 'utf8');
  const map = new Map();
  let total = 0;
  for (const line of raw.split('\n')) {
    if (!line) continue;
    const sp = line.indexOf(' ');
    if (sp < 0) continue;
    const word = line.slice(0, sp);
    const freq = Number(line.slice(sp + 1));
    if (!word || !Number.isFinite(freq)) continue;
    map.set(word, freq);
    total++;
  }
  console.log(`[refine] loaded ${total} frequency entries`);
  return map;
}

async function main() {
  const dictRaw = JSON.parse(await readFile(DICT_PATH, 'utf8'));
  const words = dictRaw.w;
  console.log(`[refine] current dict: ${words.length} words`);

  const freq = await loadFreq();

  // Score chaque noun
  console.log('[refine] scoring...');
  const scored = new Array(words.length);
  let nonZero = 0;
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    let score = 0;
    for (const p of PARTICLES) {
      score += freq.get(w + p) ?? 0;
    }
    if (score > 0) nonZero++;
    scored[i] = { w, score };
  }
  console.log(
    `[refine] ${nonZero} words with score > 0 (${((100 * nonZero) / words.length).toFixed(1)}%)`,
  );

  // Tri : score desc, longueur asc, alphabétique
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (a.w.length !== b.w.length) return a.w.length - b.w.length;
    return a.w < b.w ? -1 : a.w > b.w ? 1 : 0;
  });

  const kept = scored.filter((s) => s.score > 0).map((s) => s.w);
  console.log(`[refine] keeping ${kept.length} words with score > 0`);
  console.log(`[refine] sample top: ${kept.slice(0, 10).join(' ')}`);
  console.log(`[refine] sample bottom: ${kept.slice(-10).join(' ')}`);

  // Tri alpha pour stabilité
  kept.sort();
  const wordToIdx = new Map(kept.map((w, i) => [w, i]));

  const byInitial = {};
  for (let i = 0; i < kept.length; i++) {
    const first = kept[i][0];
    (byInitial[first] ||= []).push(i);
  }

  const payload = { w: kept, i: byInitial };
  await writeFile(DICT_PATH, JSON.stringify(payload), 'utf8');

  const sizeKb = ((await stat(DICT_PATH)).size / 1024).toFixed(1);
  console.log(
    `[refine] wrote ${DICT_PATH} (${sizeKb} KB), ${kept.length} words, ${Object.keys(byInitial).length} initials`,
  );
  void wordToIdx;
}

main().catch((err) => {
  console.error('[refine] FAILED:', err);
  process.exit(1);
});
