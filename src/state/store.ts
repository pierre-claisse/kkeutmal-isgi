// Singleton de state du jeu : mutations + EventTarget de notifications.

import { pickWord } from '../ai/autoFind';
import { getDict } from '../dict/dict';
import { isHanbang, validateMove, type ValidationResult } from '../engine/rules';
import { colorFor } from '../ui/theme';

interface Player {
  id: number; // 0..5 (jusqu'à 6 joueurs ; 6e slot = IA en mode 1 joueur)
  name: string;
  color: string;
  score: number;
  isAI: boolean;
}

interface Move {
  word: string;
  playerId: number;
  auto: boolean;       // mot trouvé via le bouton "trouver auto" (0 point)
  isHanbang: boolean;  // ce mot tue la chaîne → tour suivant libre
}

interface GameState {
  phase: 'home' | 'playing' | 'end';
  players: Player[];
  currentPlayerIdx: number;
  chain: Move[];
  usedWords: Set<string>;
  scoreTarget: number;
  freeNextTurn: boolean;
  winnerId: number | null;
}

interface StartConfig {
  playerNames: string[]; // 1..6 ; en mode 1 joueur, l'IA est ajoutée d'office
  scoreTarget: number;
}

const initial = (): GameState => ({
  phase: 'home',
  players: [],
  currentPlayerIdx: 0,
  chain: [],
  usedWords: new Set(),
  scoreTarget: 50,
  freeNextTurn: false,
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
    const firstWord = pickWord(null, dict, new Set(), { strategy: 'random' });
    const used = new Set<string>();
    const chain: Move[] = [];
    if (firstWord) {
      used.add(firstWord);
      chain.push({
        word: firstWord,
        playerId: -1,             // -1 = système (mot d'amorce)
        auto: true,
        isHanbang: isHanbang(firstWord, dict, used),
      });
    }
    this.s = {
      phase: 'playing',
      players,
      currentPlayerIdx: 0,
      chain,
      usedWords: used,
      scoreTarget: cfg.scoreTarget,
      freeNextTurn: chain[0]?.isHanbang ?? true,
      winnerId: null,
    };
    this.emit();
  }

  private prevWord(): string | null {
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
    const w = pickWord(prev, dict, this.s.usedWords, { strategy: 'random' });
    if (!w) return { played: null };
    this.applyMove(w, true);
    return { played: w };
  }

  /** Coup IA (joueur isAI). Stratégie safe-first. */
  aiPlay() {
    if (this.s.phase !== 'playing') return;
    const dict = getDict();
    const prev = this.s.freeNextTurn ? null : this.prevWord();
    const w = pickWord(prev, dict, this.s.usedWords, {
      strategy: 'safe-first',
    });
    if (!w) {
      // IA bloquée : la partie se termine, l'autre joueur gagne.
      this.endGameByBlock();
      return;
    }
    this.applyMove(w, false);
  }

  private applyMove(word: string, auto: boolean) {
    const dict = getDict();
    // On passe usedWords (qui ne contient pas encore `word`) pour que
    // le check 한방 prenne en compte l'épuisement des successeurs en cours
    // de partie.
    const isHb = isHanbang(word, dict, this.s.usedWords);
    const player = this.s.players[this.s.currentPlayerIdx]!;
    if (!auto) player.score += 1;
    this.s.chain.push({
      word,
      playerId: player.id,
      auto,
      isHanbang: isHb,
    });
    this.s.usedWords.add(word);
    this.s.freeNextTurn = isHb;

    // Cible de score atteinte → fin de partie.
    if (player.score >= this.s.scoreTarget) {
      this.s.phase = 'end';
      this.s.winnerId = player.id;
      this.emit();
      return;
    }

    // Passer au joueur suivant
    this.s.currentPlayerIdx = (this.s.currentPlayerIdx + 1) % this.s.players.length;
    this.emit();
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
