import { Injectable, inject, signal } from '@angular/core';
import { CollectionManager } from './collection-manager';
import { SaveLocation, SaveManager } from './save-manager';

/**
 * Casino : on y mise ses gemmes, à la roulette ou au crash.
 *
 * La mise est **débitée au lancement** et le gain crédité au dénouement, par
 * `settle…()`. Entre les deux, l'animation se joue : créditer tout de suite
 * aurait fait bondir le compteur de gemmes avant que la bille ne s'arrête.
 * Quitter l'écran en cours de partie règle ce qui est en attente, rien ne se
 * perd.
 */

export type RouletteColor = 'red' | 'black' | 'green';

/** Ordre des cases sur une roulette européenne, zéro compris. */
export const WHEEL_ORDER: readonly number[] = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24,
  16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export function pocketColor(pocket: number): RouletteColor {
  if (pocket === 0) return 'green';
  return RED_NUMBERS.has(pocket) ? 'red' : 'black';
}

/**
 * Gains, mise comprise. Ceux d'une vraie roulette : rouge et noir paient à
 * égalité, le zéro paie 35 contre 1. Le zéro seul donne l'avantage à la
 * maison (2,7 %).
 */
export const ROULETTE_PAYOUT: Record<RouletteColor, number> = {
  red: 2,
  black: 2,
  green: 36
};

/**
 * Crash : le multiplicateur croît en exponentielle, `e^(CRASH_GROWTH × t)`.
 * À 0,15, il double en 4,6 s et décuple en 15 s.
 */
export const CRASH_GROWTH = 0.15;
/** Avantage de la maison au crash : 3 % des parties sautent d'entrée. */
const CRASH_EDGE = 0.03;
/** Plafond du multiplicateur, pour qu'une partie ne dure pas des minutes. */
const CRASH_MAX = 1000;

export interface RouletteSpin {
  pocket: number;
  color: RouletteColor;
  won: boolean;
  payout: number;
}

/**
 * Une partie de crash close, telle qu'elle entre dans l'historique. On retient
 * le point de rupture **même quand le joueur a encaissé avant** : c'est ce
 * qu'il aurait pu faire, et c'est la seule information qui rende une décision
 * d'encaissement lisible après coup.
 */
export interface CrashRound {
  crashAt: number;
  /** Multiplicateur encaissé, `null` si la partie a sauté avant. */
  cashedAt: number | null;
  payout: number;
  bet: number;
}

interface CasinoSave {
  wagered: number;
  won: number;
  bestCrash: number;
}

@Injectable({
  providedIn: 'root'
})
export class CasinoManager {

  private readonly collection = inject(CollectionManager);
  private readonly saveManager = inject(SaveManager);

  /** Gemmes misées et gagnées depuis toujours, et meilleur crash encaissé. */
  readonly wagered = signal(0);
  readonly won = signal(0);
  readonly bestCrash = signal(0);

  /** Derniers tirages, le plus récent en tête : case, couleur et gain. */
  readonly history = signal<RouletteSpin[]>([]);

  /** Dernières parties de crash, la plus récente en tête. */
  readonly crashHistory = signal<CrashRound[]>([]);

  private pendingRoulette: RouletteSpin | null = null;

  /** Partie de crash en cours : mise et point de rupture, caché au joueur. */
  private crashRound: { bet: number; crashAt: number } | null = null;

  constructor() {
    const saved: CasinoSave | null = this.saveManager.loadProgress(SaveLocation.Casino);
    if (saved) {
      this.wagered.set(saved.wagered ?? 0);
      this.won.set(saved.won ?? 0);
      this.bestCrash.set(saved.bestCrash ?? 0);
    }
  }

  canBet(bet: number): boolean {
    return Number.isInteger(bet) && bet > 0 && bet <= this.collection.gems();
  }

  // --- Roulette -----------------------------------------------------------

  /** Débite la mise et tire la case. Le gain attend `settleRoulette()`. */
  spinRoulette(bet: number, choice: RouletteColor): RouletteSpin | null {
    if (this.pendingRoulette || !this.canBet(bet)) return null;

    this.stake(bet);
    const pocket = WHEEL_ORDER[Math.floor(Math.random() * WHEEL_ORDER.length)];
    const color = pocketColor(pocket);
    const won = color === choice;
    const spin: RouletteSpin = { pocket, color, won, payout: won ? bet * ROULETTE_PAYOUT[choice] : 0 };
    this.pendingRoulette = spin;
    return spin;
  }

  /** Crédite le tirage en attente. Sans effet s'il n'y en a pas. */
  settleRoulette(): void {
    const spin = this.pendingRoulette;
    if (!spin) return;
    this.pendingRoulette = null;
    this.history.update(list => [spin, ...list].slice(0, 12));
    this.pay(spin.payout);
  }

  // --- Crash --------------------------------------------------------------

  /**
   * Lance une partie de crash. Le point de rupture est tiré tout de suite,
   * selon la loi habituelle de ce jeu : `0,97 / (1 - U)`, qui donne à chaque
   * cible `x` une chance de `0,97 / x` d'être atteinte.
   */
  startCrash(bet: number): boolean {
    if (this.crashRound || !this.canBet(bet)) return false;

    this.stake(bet);
    const draw = (1 - CRASH_EDGE) / (1 - Math.random());
    const crashAt = Math.min(CRASH_MAX, Math.max(1, Math.floor(draw * 100) / 100));
    this.crashRound = { bet, crashAt };
    return true;
  }

  /** Durée, en secondes, avant que le multiplicateur n'atteigne `multiplier`. */
  static timeFor(multiplier: number): number {
    return Math.log(multiplier) / CRASH_GROWTH;
  }

  static multiplierAt(seconds: number): number {
    return Math.exp(CRASH_GROWTH * seconds);
  }

  /** Point de rupture de la partie en cours, pour l'animation. */
  crashPoint(): number | null {
    return this.crashRound?.crashAt ?? null;
  }

  /**
   * Encaisse à `multiplier`. Refusé si la partie a déjà sauté à ce stade :
   * l'animation peut avoir une image de retard sur le point de rupture.
   *
   * Renvoie le gain **et le point de rupture**, que l'écran dévoile ensuite :
   * encaisser sans jamais savoir où la courbe se serait arrêtée ne laisse rien
   * à apprendre d'une partie à l'autre.
   */
  cashOut(multiplier: number): { payout: number; crashAt: number } | null {
    const round = this.crashRound;
    if (!round) return null;
    this.crashRound = null;

    if (multiplier > round.crashAt) {
      this.record({ crashAt: round.crashAt, cashedAt: null, payout: 0, bet: round.bet });
      return { payout: 0, crashAt: round.crashAt };
    }

    const payout = Math.floor(round.bet * multiplier);
    this.bestCrash.update(best => Math.max(best, multiplier));
    this.pay(payout);
    this.record({ crashAt: round.crashAt, cashedAt: multiplier, payout, bet: round.bet });
    return { payout, crashAt: round.crashAt };
  }

  /** Clôt une partie perdue. */
  bust(): void {
    const round = this.crashRound;
    if (!round) return;
    this.crashRound = null;
    this.record({ crashAt: round.crashAt, cashedAt: null, payout: 0, bet: round.bet });
  }

  private record(round: CrashRound): void {
    this.crashHistory.update(list => [round, ...list].slice(0, 12));
  }

  // --- Commun -------------------------------------------------------------

  private stake(bet: number): void {
    this.collection.spendGems(bet);
    this.wagered.update(total => total + bet);
    this.persist();
  }

  /**
   * Les gains du casino ne comptent pas dans `gemsEarned` : ce total nourrit
   * des succès de collection, qu'on atteindrait sinon en rejouant sa mise.
   */
  private pay(amount: number): void {
    if (amount > 0) {
      this.collection.refundGems(amount);
      this.won.update(total => total + amount);
    }
    this.persist();
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Casino, {
      wagered: this.wagered(),
      won: this.won(),
      bestCrash: this.bestCrash()
    } satisfies CasinoSave);
  }
}
