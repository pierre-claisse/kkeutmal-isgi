# 끝말잇기

> Le jeu coréen d'enchaînement de mots, en PWA. Sans backend, sans compte, sans pub. Juste vous, vos amis, et un dictionnaire de ~34 000 noms communs coréens dans la poche.

🎮 **[Jouer en ligne →](https://pierre-claisse.github.io/kkeutmal-isgi/)**

## Le jeu

끝말잇기 (« relier la dernière syllabe ») est un jeu de mots coréen : chaque joueur doit proposer un nom commun commençant par la **dernière syllabe** du mot précédent. Premier au score cible gagne.

- ✅ **두음 법칙 actif** — la règle phonologique coréenne est appliquée algorithmiquement (ex. `력` → `역`, `람` → `남`), avec décomposition par jamos (couvre les syllabes avec finale).
- ☠️ **Détection des 한방단어 contextuelle** — un mot est marqué « impasse » si aucun successeur valide ne reste, en tenant compte des mots déjà joués (pas seulement de la structure du lexique).
- 🤖 **IA solo** — stratégie *safe-first* : choisit dans le tiers supérieur des candidats par nombre de successeurs.
- ⌨️ **Clavier hangul virtuel** — disposition 두벌식, composition cho+jung+jong en temps réel. Pratique sur mobile et sur les claviers latins.

## Stack

- **TypeScript strict** + **Vite** + **vite-plugin-pwa** (mode `generateSW`).
- Aucune dépendance UI runtime — tout est en Vanilla TS.
- Le dictionnaire (~700 KB gzip) est précaché : l'app fonctionne **offline** dès la première visite.

## Démarrage rapide

```bash
npm install
npm run build:dict   # télécharge + filtre le dictionnaire (~10 s, idempotent)
npm run dev
```

Puis ouvrir http://localhost:5173.

## Build & déploiement

```bash
npm run build        # type-check + build Vite + génération du Service Worker
npm run preview      # preview du build local
```

Le déploiement vers GitHub Pages est automatique via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) à chaque push sur `main`. La variable `GITHUB_PAGES=true` ajuste le `base` Vite à `/kkeutmal-isgi/`.

## Architecture

```
src/
  engine/
    hangul.ts          syllabes Hangul + 두음 법칙 algorithmique
    rules.ts           validateMove + isHanbang contextuel
  state/store.ts       singleton + EventTarget de notifications
  ai/autoFind.ts       picker safe-first (cache WeakMap)
  dict/dict.ts         chargement du JSON + lookups par initiale
  ui/
    screens/           home, game, end
    components/
      pebbleChain.ts   serpentin de galets + courbes Bézier cross-row
      hangulKeyboard.ts  clavier 두벌식 virtuel
    theme.ts           palettes 단청 (clair/sombre, suit le système)
  util/
    hangulIme.ts       composition cho+jung+jong
    naverLink.ts       liens vers ko.dict.naver.com
  styles/main.css
scripts/
  build-dict.mjs       télécharge le CSV 표준국어대사전 → dict.json
  refine-dict.mjs      intersection avec OpenSubtitles → ~34k mots fréquents
  smoke-test.mjs       9 invariants vérifiés sur le dictionnaire
```

## Dictionnaire

Source : [korean-word-game/db](https://github.com/korean-word-game/db), basé sur le **표준국어대사전** (Institut National de la Langue Coréenne).

Pipeline (`build:dict`) :
1. Télécharge le ZIP, décompresse, parse le CSV.
2. Garde `명사 / 관형사·명사 / 의존명사` uniquement (~265k entrées).
3. Filtre Hangul moderne pur, ≥ 2 syllabes, dédoublonne.
4. **Affine** par intersection avec [OpenSubtitles ko](https://github.com/hermitdave/FrequencyWords) — élimine les entrées archaïques/dialectales/techniques que personne ne joue (ne reste que ~34k mots).
5. Sérialise en JSON compact `{ w: [...], i: { 가: [0,1,…], … } }` (buckets d'index par syllabe initiale, ~40 % de gain vs strings dupliquées).

## Style visuel

Inspiration **단청** (peinture décorative coréenne traditionnelle) — palette ocre/cinnabre/bleu cobalt, typographie serif coréenne. Mode clair/sombre suit le système, basculable manuellement. Les mots joués s'affichent en **chaîne serpentine** : galets adjacents reliés par des segments droits intra-rang et des courbes U-Bézier cross-row.

## Licence

Code sous MIT. Le dictionnaire dérive du 표준국어대사전 (domaine public — listes mot+POS).
