import { Injectable, inject, signal } from '@angular/core';
import { UtilityManager } from './utility-manager';

/**
 * Combo de rotation : faire tourner la statue en dope le rendement, et
 * enchaîner les tours complets fait monter le multiplicateur.
 *
 * Le service est nourri image par image depuis la boucle de rendu Three.js,
 * donc **hors de la zone Angular**. Il n'écrit dans ses signaux que lorsque la
 * valeur affichée change réellement, sinon la détection de changements
 * repartirait soixante fois par seconde.
 */

/** Vitesse angulaire, en tours par seconde, au-delà de laquelle le bonus plafonne. */
const SPEED_CAP = 1.6;
/** Bonus maximal tiré de la seule vitesse. */
const SPEED_BONUS = 1.2;
/** Bonus par tour complet, et son plafond. */
const TURN_BONUS = 0.25;
const TURN_BONUS_CAP = 1.5;
/** Durée de grâce après l'arrêt, avant que le combo ne retombe. */
const DECAY_PER_SECOND = 1.1;
/** Bonus accordé par un trickshot réussi, et sa vitesse d'extinction. */
const TRICKSHOT_BONUS = 8;
const TRICKSHOT_DECAY = 0.8;
/**
 * Élan venu d'ailleurs que la rotation — points faibles touchés, publications
 * parcourues en doomscrollant. Il plafonne et s'éteint de lui-même.
 */
const BOOST_CAP = 4;
const BOOST_DECAY = 0.35;
/**
 * Marathon : au-delà de cent tours enchaînés, chaque centaine ajoute un point
 * de multiplicateur. Le bonus de tours ordinaire plafonne à six tours ; sans
 * ce palier, faire tourner la statue longtemps ne rapportait plus rien.
 */
const MARATHON_TURNS = 100;
const MARATHON_BONUS = 1;
const MARATHON_CAP = 4;

@Injectable({
  providedIn: 'root'
})
export class SpinCombo {

  /**
   * Les quatre constantes de base sont désormais des planchers : la branche
   * Combo de l'arbre les relève. Elles sont lues à chaque image, ce qui est
   * sans coût — ce sont des `computed` déjà calculés.
   */
  private readonly utilities = inject(UtilityManager);

  /** Multiplicateur appliqué au prochain clic. */
  readonly multiplier = signal(1);
  /** Tours complets enchaînés depuis le début du combo. */
  readonly turns = signal(0);
  /** Vrai tant que la statue tourne assez vite pour compter. */
  readonly spinning = signal(false);
  /** Vrai tant qu'un trickshot porte encore. */
  readonly trickshot = signal(false);

  /**
   * Plus haut multiplicateur atteint depuis le lancement.
   *
   * Les succès sont contrôlés une fois par seconde : un pic passé entre deux
   * contrôles serait manqué. On retient donc le sommet, et non la valeur
   * courante.
   */
  readonly peak = signal(1);

  private speed = 0;
  private turnBonus = 0;
  /** Bonus de trickshot, hors norme et qui retombe lentement. */
  private trickshotBonus = 0;
  private boostBonus = 0;
  private yawTravel = 0;
  private pitchTravel = 0;
  private turnCount = 0;
  private lastPublished = 1;

  /**
   * Appelé à chaque image avec la rotation parcourue depuis la précédente.
   * `dt` est en secondes.
   */
  report(yawDelta: number, pitchDelta: number, dt: number): void {
    if (dt <= 0) return;

    const travelled = Math.abs(yawDelta) + Math.abs(pitchDelta);
    const instant = travelled / dt / (Math.PI * 2);
    // Lissage : la vitesse suit le geste sans sauter d'une image à l'autre.
    this.speed += (instant - this.speed) * Math.min(1, dt * 6);

    // Les deux axes comptent séparément : un 360 horizontal et un 360 vertical
    // valent chacun un tour.
    this.yawTravel += Math.abs(yawDelta);
    this.pitchTravel += Math.abs(pitchDelta);
    while (this.yawTravel >= Math.PI * 2) {
      this.yawTravel -= Math.PI * 2;
      this.addTurn();
    }
    while (this.pitchTravel >= Math.PI * 2) {
      this.pitchTravel -= Math.PI * 2;
      this.addTurn();
    }

    // Le trickshot s'éteint de lui-même, qu'on tourne ou non.
    if (this.trickshotBonus > 0) {
      this.trickshotBonus = Math.max(0, this.trickshotBonus - TRICKSHOT_DECAY * dt);
    }
    if (this.boostBonus > 0) {
      this.boostBonus = Math.max(0, this.boostBonus - BOOST_DECAY * dt);
    }

    if (this.speed < 0.05 && this.trickshotBonus === 0 && this.boostBonus === 0) {
      // L'inertie achetée ralentit l'extinction au lieu de la supprimer : un
      // combo qui ne retomberait jamais n'en serait plus un.
      const decay = DECAY_PER_SECOND * (1 - this.utilities.comboHold());
      this.turnBonus = Math.max(0, this.turnBonus - decay * dt);
      if (this.turnBonus === 0) this.reset();
    }

    this.publish();
  }

  /** Multiplicateur courant, lu sans passer par les signaux. */
  current(): number {
    return this.compute();
  }

  /** Remet le combo à zéro, par exemple en quittant l'écran. */
  reset(): void {
    this.speed = 0;
    this.turnBonus = 0;
    this.trickshotBonus = 0;
    this.boostBonus = 0;
    this.yawTravel = 0;
    this.pitchTravel = 0;
    this.turnCount = 0;
    this.publish();
  }

  private addTurn(): void {
    this.turnCount++;
    const perTurn = this.utilities.comboTurnBonus();
    // Le plafond suit le bonus par tour : sans cela, l'améliorer ne servait
    // qu'à atteindre le même toit plus vite.
    const cap = TURN_BONUS_CAP * (perTurn / TURN_BONUS);
    this.turnBonus = Math.min(cap, this.turnBonus + perTurn);
  }

  /**
   * Un trickshot réussi fait s'envoler le multiplicateur. `power` vient des
   * améliorations du tir ; sans elles, c'est la valeur d'origine.
   */
  landTrickshot(power = TRICKSHOT_BONUS): void {
    this.trickshotBonus = power;
    this.publish();
  }

  /** Tours enchaînés au-delà du seuil de marathon, convertis en bonus. */
  private marathon(): number {
    return Math.min(MARATHON_CAP, Math.floor(this.turnCount / MARATHON_TURNS) * MARATHON_BONUS);
  }

  /** Vrai quand le palier des cent tours est franchi, pour l'affichage. */
  isMarathon(): boolean {
    return this.turnCount >= MARATHON_TURNS;
  }

  /** Ajoute de l'élan au combo, par exemple sur un point faible touché. */
  boost(amount: number): void {
    this.boostBonus = Math.min(BOOST_CAP, this.boostBonus + amount);
    this.publish();
  }

  private compute(): number {
    const fromSpeed = (Math.min(this.speed, SPEED_CAP) / SPEED_CAP) * this.utilities.comboSpeedBonus();
    return (
      1 +
      this.utilities.comboFloor() +
      fromSpeed +
      this.turnBonus +
      this.trickshotBonus +
      this.boostBonus +
      this.marathon()
    );
  }

  private publish(): void {
    const value = Math.round(this.compute() * 10) / 10;
    const spinning = this.speed >= 0.05;

    if (value !== this.lastPublished) {
      this.lastPublished = value;
      this.multiplier.set(value);
      if (value > this.peak()) this.peak.set(value);
    }
    if (spinning !== this.spinning()) this.spinning.set(spinning);
    const landed = this.trickshotBonus > 0;
    if (landed !== this.trickshot()) this.trickshot.set(landed);
    if (this.turnCount !== this.turns()) this.turns.set(this.turnCount);
  }
}
