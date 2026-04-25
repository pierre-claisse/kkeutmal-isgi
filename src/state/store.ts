// Singleton de state du jeu : mutations + EventTarget de notifications.

import { pickWord } from '../ai/autoFind';
import { getDict } from '../dict/dict';
import { isHanbang, validateMove, type ValidationResult } from '../engine/rules';
import { colorFor } from '../ui/theme';

export type Mode =
  | { kind: 'time'; seconds: number }
  | { kind: 'score'; target: number };

export interface Player {
  id: number; // 0..5 (jusqu'à 6 joueurs ; 6e slot = IA en mode 1 joueur)
  name: string;
  color: string;
  score: number;
  isAI: boolean;
}

export interface Move {
  word: string;
  playerId: number;
  auto: boolean;       // mot trouvé via le bouton "trouver auto" (0 point)
  isHanbang: boolean;  // ce mot tue la chaîne → tour suivant libre
  ts: number;
}

export type Phase = 'home' | 'playing' | 'end';

export interface GameState {
  phase: Phase;
  players: Player[];
  currentPlayerIdx: number;
  chain: Move[];
  usedWords: Set<string>;
  duumOn: boolean;
  mode: Mode;
  freeNextTurn: boolean;
  startedAt: number | null;
  remainingMs: number | null;
  winnerId: number | null;
}

export interface StartConfig {
  playerNames: string[]; // 1..6 ; en mode 1 joueur, l'IA est ajoutée d'office
  duumOn: boolean;
  mode: Mode;
}

const initial = (): GameState => ({
  phase: 'home',
  players: [],
  currentPlayerIdx: 0,
  chain: [],
  usedWords: new Set(),
  duumOn: true,
  mode: { kind: 'score', target: 10 },
  freeNextTurn: false,
  startedAt: null,
  remainingMs: null,
  winnerId: null,
});

class Store extends EventTarget {
  private s: GameState = initial();

  get state(): Readonly<GameState> {
    return this.s;
  }

  private emit() {
    this.dispatchEvent(new CustomEvent('change'));
  }

  reset() {
    this.s = initial();
    this.emit();
  }

  startGame(cfg: StartConfig) {
    const dict = getDict();
    const players: Player[] = cfg.playerNames.map((name, i) => ({
      id: i,
      name: name.trim() || `플레이어 ${i + 1}`,
      color: colorFor(i),
      score: 0,
      isAI: false,
    }));
    if (players.length === 1) {
      // Mode 1 joueur ⇒ adversaire IA d'office (sinon, contre qui ?).
      players.push({
        id: 1,
        name: 'AI',
        color: colorFor(1),
        score: 0,
        isAI: true,
      });
    }
    const firstWord = pickWord(null, dict, new Set(), cfg.duumOn, { strategy: 'random' });
    const used = new Set<string>();
    const chain: Move[] = [];
    if (firstWord) {
      used.add(firstWord);
      chain.push({
        word: firstWord,
        playerId: -1,             // -1 = système (mot d'amorce)
        auto: true,
        isHanbang: isHanbang(firstWord, dict, cfg.duumOn),
        ts: Date.now(),
      });
    }
    this.s = {
      phase: 'playing',
      players,
      currentPlayerIdx: 0,
      chain,
      usedWords: used,
      duumOn: cfg.duumOn,
      mode: cfg.mode,
      freeNextTurn: chain[0]?.isHanbang ?? true,
      startedAt: Date.now(),
      remainingMs: cfg.mode.kind === 'time' ? cfg.mode.seconds * 1000 : null,
      winnerId: null,
    };
    this.emit();
  }

  /** Retourne le mot précédent (la dernière entrée de la chaîne), ou null. */
  prevWord(): string | null {
    const last = this.s.chain[this.s.chain.length - 1];
    return last ? last.word : null;
  }

  /**
   * Tente de soumettre un mot pour le joueur courant.
   * Retourne le résultat de validation. Si valide, applique le coup.
   */
  submitWord(word: string): ValidationResult {
    if (this.s.phase !== 'playing') return { ok: false, reason: 'empty' };
    const dict = getDict();
    const result = validateMove(word, {
      prevWord: this.s.freeNextTurn ? null : this.prevWord(),
      duumOn: this.s.duumOn,
      freeTurn: this.s.freeNextTurn,
      dict,
      used: this.s.usedWords,
    });
    if (!result.ok) return result;
    this.applyMove(word.trim(), false);
    return result;
  }

  /** Active le bouton "trouver auto" : joue un mot, 0 point. */
  autoFind(): { played: string | null } {
    if (this.s.phase !== 'playing') return { played: null };
    const dict = getDict();
    const prev = this.s.freeNextTurn ? null : this.prevWord();
    const w = pickWord(prev, dict, this.s.usedWords, this.s.duumOn, { strategy: 'random' });
    if (!w) return { played: null };
    this.applyMove(w, true);
    return { played: w };
  }

  /** Coup IA (joueur isAI). Stratégie safe-first. */
  aiPlay(): { played: string | null } {
    if (this.s.phase !== 'playing') return { played: null };
    const dict = getDict();
    const prev = this.s.freeNextTurn ? null : this.prevWord();
    const w = pickWord(prev, dict, this.s.usedWords, this.s.duumOn, {
      strategy: 'safe-first',
    });
    if (!w) {
      // IA bloquée : la partie se termine, l'autre joueur gagne.
      this.endGameByBlock();
      return { played: null };
    }
    this.applyMove(w, false);
    return { played: w };
  }

  private applyMove(word: string, auto: boolean) {
    const dict = getDict();
    const isHb = isHanbang(word, dict, this.s.duumOn);
    const player = this.s.players[this.s.currentPlayerIdx]!;
    if (!auto) player.score += 1;
    this.s.chain.push({
      word,
      playerId: player.id,
      auto,
      isHanbang: isHb,
      ts: Date.now(),
    });
    this.s.usedWords.add(word);
    this.s.freeNextTurn = isHb;

    // Vérifier conditions de fin
    if (this.s.mode.kind === 'score' && player.score >= this.s.mode.target) {
      this.s.phase = 'end';
      this.s.winnerId = player.id;
      this.emit();
      return;
    }

    // Passer au joueur suivant
    this.s.currentPlayerIdx = (this.s.currentPlayerIdx + 1) % this.s.players.length;
    this.emit();
  }

  /** Tick d'horloge en mode temps (appelé via requestAnimationFrame).
   *  Ne dispatch PAS 'change' à chaque frame (sinon l'écran se re-rendrait
   *  60×/sec et perdrait tout état local : focus input, clavier ouvert,
   *  composer en cours). Le timer DOM est rafraîchi indépendamment via
   *  un poll local depuis l'écran de jeu. Seul le passage en fin de
   *  partie (timer expiré) déclenche un re-render. */
  tick(deltaMs: number) {
    if (this.s.phase !== 'playing') return;
    if (this.s.mode.kind !== 'time' || this.s.remainingMs === null) return;
    this.s.remainingMs = Math.max(0, this.s.remainingMs - deltaMs);
    if (this.s.remainingMs <= 0) {
      this.s.phase = 'end';
      // En mode temps, gagnant = score max ; égalité possible (winnerId=-1 => égalité).
      const top = [...this.s.players].sort((a, b) => b.score - a.score);
      const tied = top.length > 1 && top[0]!.score === top[1]!.score;
      this.s.winnerId = tied ? -1 : top[0]?.id ?? null;
      this.emit();
    }
  }

  private endGameByBlock() {
    // Si l'IA est bloquée, le joueur humain gagne.
    const human = this.s.players.find((p) => !p.isAI);
    this.s.phase = 'end';
    this.s.winnerId = human?.id ?? null;
    this.emit();
  }
}

export const store = new Store();
