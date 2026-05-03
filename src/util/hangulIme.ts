// IME Hangul minimal : compose jamos en syllabes selon les règles 두벌식.
//
// Le composer maintient deux états :
//   - `committed` : chaîne de syllabes complètes
//   - `pending`   : la syllabe en cours { cho, jung, jong } indices
// `text()` retourne committed + assemblage de pending.

const CHO_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];
const JUNG_LIST = [
  'ㅏ', 'ㅐ', 'ㅑ', 'ㅒ', 'ㅓ', 'ㅔ', 'ㅕ', 'ㅖ', 'ㅗ', 'ㅘ',
  'ㅙ', 'ㅚ', 'ㅛ', 'ㅜ', 'ㅝ', 'ㅞ', 'ㅟ', 'ㅠ', 'ㅡ', 'ㅢ', 'ㅣ',
];
const JONG_LIST = [
  '', 'ㄱ', 'ㄲ', 'ㄳ', 'ㄴ', 'ㄵ', 'ㄶ', 'ㄷ', 'ㄹ', 'ㄺ',
  'ㄻ', 'ㄼ', 'ㄽ', 'ㄾ', 'ㄿ', 'ㅀ', 'ㅁ', 'ㅂ', 'ㅄ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
];

const CHO_INDEX = new Map(CHO_LIST.map((j, i) => [j, i] as const));
const JUNG_INDEX = new Map(JUNG_LIST.map((j, i) => [j, i] as const));
const JONG_INDEX = new Map(JONG_LIST.map((j, i) => [j, i] as const));

// Voyelles composées (typées au clavier 두벌식 : v1 puis v2).
const VOWEL_COMPOSITES: Record<string, string> = {
  'ㅗㅏ': 'ㅘ',
  'ㅗㅐ': 'ㅙ',
  'ㅗㅣ': 'ㅚ',
  'ㅜㅓ': 'ㅝ',
  'ㅜㅔ': 'ㅞ',
  'ㅜㅣ': 'ㅟ',
  'ㅡㅣ': 'ㅢ',
};

// Finales composées.
const JONG_COMPOSITES: Record<string, string> = {
  'ㄱㅅ': 'ㄳ',
  'ㄴㅈ': 'ㄵ',
  'ㄴㅎ': 'ㄶ',
  'ㄹㄱ': 'ㄺ',
  'ㄹㅁ': 'ㄻ',
  'ㄹㅂ': 'ㄼ',
  'ㄹㅅ': 'ㄽ',
  'ㄹㅌ': 'ㄾ',
  'ㄹㅍ': 'ㄿ',
  'ㄹㅎ': 'ㅀ',
  'ㅂㅅ': 'ㅄ',
};

// Décomposition d'une finale composée : [première_finale_simple, jamo_qui_devient_initiale_de_la_syllabe_suivante]
const JONG_DECOMPOSE: Record<string, [string, string]> = {};
for (const [combo, comp] of Object.entries(JONG_COMPOSITES)) {
  JONG_DECOMPOSE[comp] = [combo[0]!, combo[1]!];
}

// Backspace sur une voyelle composée : retombe sur la première.
const JUNG_BACKSPACE: Record<string, string> = {};
for (const [combo, comp] of Object.entries(VOWEL_COMPOSITES)) {
  JUNG_BACKSPACE[comp] = combo[0]!;
}

interface Comp {
  cho: number | null;
  jung: number | null;
  jong: number | null;
}
const empty = (): Comp => ({ cho: null, jung: null, jong: null });

function composeOne(c: Comp): string {
  if (c.cho !== null && c.jung !== null) {
    const code = 0xac00 + c.cho * 588 + c.jung * 28 + (c.jong ?? 0);
    return String.fromCharCode(code);
  }
  if (c.cho !== null) return CHO_LIST[c.cho]!;
  if (c.jung !== null) return JUNG_LIST[c.jung]!;
  return '';
}

export class HangulComposer {
  private committed = '';
  private pending: Comp = empty();

  text(): string {
    return this.committed + composeOne(this.pending);
  }

  reset() {
    this.committed = '';
    this.pending = empty();
  }

  private finalize() {
    this.committed += composeOne(this.pending);
    this.pending = empty();
  }

  inputJamo(jamo: string) {
    if (CHO_INDEX.has(jamo) || JONG_INDEX.has(jamo)) {
      this.handleConsonant(jamo);
    } else if (JUNG_INDEX.has(jamo)) {
      this.handleVowel(jamo);
    }
  }

  private handleConsonant(c: string) {
    const choIdx = CHO_INDEX.get(c);
    const jongIdx = JONG_INDEX.get(c);

    if (this.pending.cho === null) {
      if (choIdx !== undefined) this.pending.cho = choIdx;
      else if (jongIdx !== undefined && jongIdx > 0) {
        // jamo qui n'est pas une initiale valide (peu probable) : on commit tel quel
        this.committed += c;
      }
      return;
    }
    if (this.pending.jung === null) {
      // Initiale seule + autre consonne : on émet la première puis on recommence
      this.finalize();
      if (choIdx !== undefined) this.pending.cho = choIdx;
      return;
    }
    if (this.pending.jong === null) {
      if (jongIdx !== undefined && jongIdx > 0) {
        this.pending.jong = jongIdx;
      } else {
        this.finalize();
        if (choIdx !== undefined) this.pending.cho = choIdx;
      }
      return;
    }
    // Tente une finale composée
    const currentJong = JONG_LIST[this.pending.jong]!;
    const composite = JONG_COMPOSITES[currentJong + c];
    if (composite !== undefined) {
      this.pending.jong = JONG_INDEX.get(composite)!;
    } else {
      this.finalize();
      if (choIdx !== undefined) this.pending.cho = choIdx;
    }
  }

  private handleVowel(v: string) {
    const jungIdx = JUNG_INDEX.get(v)!;

    if (this.pending.cho === null) {
      // Voyelle isolée → commit en tant que jamo standalone
      this.committed += v;
      return;
    }
    if (this.pending.jung === null) {
      this.pending.jung = jungIdx;
      return;
    }
    if (this.pending.jong === null) {
      // Tente une voyelle composée
      const currentJung = JUNG_LIST[this.pending.jung]!;
      const composite = VOWEL_COMPOSITES[currentJung + v];
      if (composite !== undefined) {
        this.pending.jung = JUNG_INDEX.get(composite)!;
      }
      // Sinon : ignore (pas de combinaison valide)
      return;
    }
    // Finale présente : elle se détache et devient l'initiale d'une nouvelle syllabe
    const currentJong = JONG_LIST[this.pending.jong]!;
    const decomp = JONG_DECOMPOSE[currentJong];
    let movedChoJamo: string;
    if (decomp) {
      this.pending.jong = JONG_INDEX.get(decomp[0])!;
      movedChoJamo = decomp[1];
    } else {
      this.pending.jong = null;
      movedChoJamo = currentJong;
    }
    this.finalize();
    const movedChoIdx = CHO_INDEX.get(movedChoJamo);
    if (movedChoIdx !== undefined) this.pending.cho = movedChoIdx;
    this.pending.jung = jungIdx;
  }

  backspace() {
    if (this.pending.jong !== null) {
      const currentJong = JONG_LIST[this.pending.jong]!;
      const decomp = JONG_DECOMPOSE[currentJong];
      if (decomp) {
        this.pending.jong = JONG_INDEX.get(decomp[0])!;
      } else {
        this.pending.jong = null;
      }
      return;
    }
    if (this.pending.jung !== null) {
      const currentJung = JUNG_LIST[this.pending.jung]!;
      const back = JUNG_BACKSPACE[currentJung];
      if (back !== undefined) {
        this.pending.jung = JUNG_INDEX.get(back)!;
      } else {
        this.pending.jung = null;
      }
      return;
    }
    if (this.pending.cho !== null) {
      this.pending.cho = null;
      return;
    }
    if (this.committed.length > 0) {
      this.committed = this.committed.slice(0, -1);
    }
  }
}
