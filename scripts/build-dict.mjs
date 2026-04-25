// Build script: produit src/data/dict.json à partir du CSV
// 표준국어대사전 hébergé par korean-word-game/db (sur Google Drive).
//
// Pipeline :
//   1. Si .cache/kr_korean.csv existe → utilise.
//   2. Sinon : télécharge le ZIP depuis Google Drive, décompresse via adm-zip.
//   3. Parse, filtre les noms valides pour 끝말잇기, écrit dict.json.

import { mkdir, writeFile, readFile, stat } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CACHE_DIR = join(ROOT, '.cache');
const CSV_PATH = join(CACHE_DIR, 'kr_korean.csv');
const ZIP_PATH = join(CACHE_DIR, 'ko-KR.zip');
const OUT_PATH = join(ROOT, 'src', 'data', 'dict.json');

const ZIP_URL =
  'https://drive.usercontent.google.com/download?id=1PdzYubqcPKAIsHRtWZEFdQ1m4-fba6Oj&export=download';

const KEEP_POS = new Set(['명사', '관형사·명사', '의존명사']);

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureCsv() {
  if (await exists(CSV_PATH)) {
    console.log(`[build-dict] cache hit: ${CSV_PATH}`);
    return;
  }
  await mkdir(CACHE_DIR, { recursive: true });
  console.log(`[build-dict] downloading ZIP from Google Drive...`);
  const res = await fetch(ZIP_URL, { redirect: 'follow' });
  if (!res.ok) throw new Error(`download failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(ZIP_PATH, buf);
  console.log(`[build-dict] extracting ${ZIP_PATH}...`);
  const zip = new AdmZip(ZIP_PATH);
  const entry = zip.getEntries().find((e) => e.entryName.endsWith('.csv'));
  if (!entry) throw new Error('no csv inside zip');
  await writeFile(CSV_PATH, entry.getData());
  console.log(`[build-dict] extracted CSV: ${CSV_PATH}`);
}

function isHangulSyllable(ch) {
  const c = ch.charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3;
}

function isAllHangul(s) {
  if (s.length === 0) return false;
  for (const ch of s) if (!isHangulSyllable(ch)) return false;
  return true;
}

async function build() {
  await ensureCsv();
  console.log('[build-dict] reading CSV...');
  const raw = await readFile(CSV_PATH, 'utf8');
  const lines = raw.split('\n');

  const seen = new Set();
  let kept = 0;
  let total = 0;

  for (const lineRaw of lines) {
    const line = lineRaw.replace(/^﻿/, '').replace(/\r$/, '');
    if (!line) continue;
    total++;
    const idx = line.lastIndexOf(',');
    if (idx < 1) continue;
    const partRaw = line.slice(idx + 1);
    if (!KEEP_POS.has(partRaw)) continue;
    const wordRaw = line.slice(0, idx);
    // Nettoyage : retirer tirets/séparateurs morphologiques.
    const word = wordRaw.replace(/[-·⋅]/g, '');
    if (word.length < 2) continue; // 1 syllabe interdit en 끝말잇기
    if (!isAllHangul(word)) continue;
    if (seen.has(word)) continue;
    seen.add(word);
    kept++;
  }

  console.log(`[build-dict] read ${total} rows, kept ${kept} unique nouns`);

  // Tri pour stabilité du JSON entre builds
  const words = [...seen].sort();
  const wordToIdx = new Map();
  for (let i = 0; i < words.length; i++) wordToIdx.set(words[i], i);

  // Index par syllabe initiale → liste d'indices
  const byInitial = {};
  for (let i = 0; i < words.length; i++) {
    const first = words[i][0];
    (byInitial[first] ||= []).push(i);
  }

  // Sortie compacte (pas de pretty-print pour minimiser la taille)
  const payload = { w: words, i: byInitial };
  await mkdir(dirname(OUT_PATH), { recursive: true });
  await writeFile(OUT_PATH, JSON.stringify(payload), 'utf8');

  const initials = Object.keys(byInitial).length;
  const sizeKb = ((await stat(OUT_PATH)).size / 1024).toFixed(1);
  console.log(
    `[build-dict] wrote ${OUT_PATH} (${sizeKb} KB), ${words.length} words, ${initials} distinct initial syllables`,
  );
}

build().catch((err) => {
  console.error('[build-dict] FAILED:', err);
  process.exit(1);
});
