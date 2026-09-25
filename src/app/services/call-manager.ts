import { Injectable, computed, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';
import { ShopManager } from './shop-manager';
import { UtilityManager } from './utility-manager';
import { HintManager } from './hint-manager';
import { ModelIcons } from './model-icons';
import { Sound, SoundManager } from './sound-manager';
import { SaveLocation, SaveManager } from './save-manager';
import {
  CALLERS,
  CALL_FLOOR,
  CALL_RING_SECONDS,
  CallerDefinition,
  CallerId,
  callerDefinition
} from '../../assets/static/callers';

interface CallSave {
  answered: CallerId[];
  refused: number;
  larryAnswered: boolean;
  larryRefused: boolean;
}

/** Comment un appel s'est terminé, pour le message qui suit. */
export type CallOutcome = 'answered' | 'hung-up' | 'missed';

/** Ce que les succès ont besoin de savoir des appels. */
export interface CallStats {
  answeredCount: number;
  john: boolean;
  colonel: boolean;
  larry: boolean;
  refused: number;
  larryRefused: boolean;
}

/**
 * Les appels du doomscrolling.
 *
 * De loin en loin, quelqu'un appelle pendant qu'on fait défiler le fil : une
 * vignette, deux boutons, quelques secondes pour trancher. Décrocher paie chez
 * John Pork et le Colonel, et coûte très cher chez Larry — à qui il ne faut
 * surtout pas répondre. Rien ne les distingue avant d'avoir lu le nom, ce qui
 * est tout l'intérêt : le fil demande soudain de faire attention.
 *
 * L'appel ne part que **pendant** le doomscrolling et seulement une fois
 * l'utilitaire acheté : c'est une mécanique du téléphone, elle n'a pas de sens
 * pour qui n'en a pas.
 */
@Injectable({
  providedIn: 'root'
})
export class CallManager {

  private readonly auraManager = inject(AuraManager);
  private readonly shopManager = inject(ShopManager);
  private readonly utilityManager = inject(UtilityManager);
  private readonly hintManager = inject(HintManager);
  private readonly modelIcons = inject(ModelIcons);
  private readonly soundManager = inject(SoundManager);
  private readonly saveManager = inject(SaveManager);

  /**
   * Chance qu'une publication déclenche un appel, et délai minimal entre deux.
   * À deux publications par seconde, un demi-pour-cent donne un appel toutes
   * les deux à trois minutes — assez rare pour rester un événement, assez
   * fréquent pour qu'on apprenne à reconnaître Larry.
   */
  private static readonly CHANCE = 0.005;
  private static readonly COOLDOWN_MS = 75_000;

  /** Appel en cours de sonnerie, `null` le reste du temps. */
  readonly ringing = signal<CallerDefinition | null>(null);

  /** Ce qui a déjà été décroché, pour les succès. */
  readonly answered = signal<Set<CallerId>>(new Set());
  readonly refused = signal(0);
  readonly larryAnswered = signal(false);
  readonly larryRefused = signal(false);

  readonly unlocked = computed(() => this.utilityManager.isOwned('doomscroll'));

  /** Relevé pour les succès, en un seul objet plutôt qu'en cinq accesseurs. */
  readonly stats = computed<CallStats>(() => ({
    answeredCount: this.answered().size,
    john: this.hasAnswered('john'),
    colonel: this.hasAnswered('colonel'),
    larry: this.hasAnswered('larry'),
    refused: this.refused(),
    larryRefused: this.larryRefused()
  }));

  private lastCall = 0;
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    const saved: CallSave | null = this.saveManager.loadProgress(SaveLocation.Calls);
    if (saved) {
      this.answered.set(new Set(saved.answered ?? []));
      this.refused.set(saved.refused ?? 0);
      this.larryAnswered.set(saved.larryAnswered ?? false);
      this.larryRefused.set(saved.larryRefused ?? false);
    }
  }

  hasAnswered(id: CallerId): boolean {
    return this.answered().has(id);
  }

  /**
   * Tirage d'une publication du fil. Rien ne part si le téléphone n'est pas
   * acheté, si quelqu'un est déjà en ligne, ou si le dernier appel est trop
   * récent : deux appels coup sur coup transformeraient le fil en standard
   * téléphonique.
   */
  maybeRing(): CallerDefinition | null {
    if (!this.unlocked() || this.ringing()) return null;
    if (Date.now() - this.lastCall < CallManager.COOLDOWN_MS) return null;
    if (Math.random() >= CallManager.CHANCE) return null;

    const caller = this.draw();
    this.ring(caller);
    return caller;
  }

  /** Tire un appelant selon les poids : Larry appelle moins que les autres. */
  private draw(): CallerDefinition {
    const total = CALLERS.reduce((sum, caller) => sum + caller.weight, 0);
    let roll = Math.random() * total;
    for (const caller of CALLERS) {
      roll -= caller.weight;
      if (roll < 0) return caller;
    }
    return CALLERS[0];
  }

  /**
   * Fait sonner. C'est l'**appelant** qui ouvre la modale, pas ce service :
   * la modale injecte `CallManager`, et l'ouvrir d'ici refermerait un cycle
   * d'imports entre les deux. Elle se referme d'elle-même quand `ringing()`
   * repasse à `null`, quelle qu'en soit la raison — décrochage, raccrochage
   * ou fin de la sonnerie.
   */
  ring(caller: CallerDefinition): void {
    this.lastCall = Date.now();
    this.ringing.set(caller);
    this.soundManager.playPitched(Sound.Plop, 1.6);

    // La sonnerie ne dure pas : l'appel est **bref**, et c'est ce compte à
    // rebours qui oblige à trancher au lieu de laisser la modale ouverte le
    // temps de réfléchir.
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.miss(), CALL_RING_SECONDS * 1000);
  }

  /** Montant d'un appel, en aura. Le signe suit celui des secondes. */
  private amount(seconds: number): number {
    const size = Math.max(CALL_FLOOR, this.shopManager.production() * Math.abs(seconds));
    return seconds < 0 ? -size : size;
  }

  answer(): void {
    const caller = this.close();
    if (!caller) return;

    const gained = this.amount(caller.answerSeconds);
    this.auraManager.gain(gained);

    this.answered.update(list => new Set(list).add(caller.id));
    if (caller.id === 'larry') this.larryAnswered.set(true);
    this.persist();

    this.soundManager.playFX(gained > 0 ? Sound.Buy : Sound.Plop);
    this.say(caller, 'answered');
  }

  hangUp(): void {
    const caller = this.close();
    if (!caller) return;

    if (caller.hangUpSeconds > 0) {
      this.auraManager.gain(-this.amount(caller.hangUpSeconds));
      this.refused.update(count => count + 1);
    } else {
      // Raccrocher au nez de Larry est le bon geste : il ne coûte rien, et
      // c'est la seule façon de gagner contre lui.
      this.larryRefused.set(true);
    }
    this.persist();

    this.soundManager.playFX(Sound.Plop);
    this.say(caller, 'hung-up');
  }

  /** Personne n'a décroché : ni gain ni perte, seulement un regret. */
  private miss(): void {
    const caller = this.close();
    if (caller) this.say(caller, 'missed');
  }

  /** Ferme la sonnerie et rend l'appelant, ou `null` s'il n'y en avait pas. */
  private close(): CallerDefinition | null {
    const caller = this.ringing();
    if (!caller) return null;
    clearTimeout(this.timer);
    this.ringing.set(null);
    return caller;
  }

  /**
   * Le mot de la fin, la tête de l'appelant à l'appui. C'est là que le jeu dit
   * ce qu'on a gagné ou perdu — la modale, elle, a déjà disparu.
   */
  private say(caller: CallerDefinition, outcome: CallOutcome): void {
    this.hintManager.announce({
      titleKey: `CALLER_${caller.id.toUpperCase()}`,
      bodyKey: `CALL_${caller.id.toUpperCase()}_${outcome.toUpperCase().replace('-', '_')}`,
      icon: this.modelIcons.caller(caller.id)
    });
  }

  /** Relance un appel donné, pour les essais et l'apprentissage. */
  ringCaller(id: CallerId): void {
    this.ring(callerDefinition(id));
  }

  private persist(): void {
    this.saveManager.saveProgress(SaveLocation.Calls, {
      answered: [...this.answered()],
      refused: this.refused(),
      larryAnswered: this.larryAnswered(),
      larryRefused: this.larryRefused()
    } satisfies CallSave);
  }
}
