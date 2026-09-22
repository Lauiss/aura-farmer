import { Injectable, signal } from '@angular/core';

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

@Injectable({
  providedIn: 'root'
})
export class SpinCombo {

  /** Multiplicateur appliqué au prochain clic. */
  readonly multiplier = signal(1);
  /** Tours complets enchaînés depuis le début du combo. */
  readonly turns = signal(0);
  /** Vrai tant que la statue tourne assez vite pour compter. */
  readonly spinning = signal(false);

  private speed = 0;
  private turnBonus = 0;
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

    if (this.speed < 0.05) {
      this.turnBonus = Math.max(0, this.turnBonus - DECAY_PER_SECOND * dt);
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
    this.yawTravel = 0;
    this.pitchTravel = 0;
    this.turnCount = 0;
    this.publish();
  }

  private addTurn(): void {
    this.turnCount++;
    this.turnBonus = Math.min(TURN_BONUS_CAP, this.turnBonus + TURN_BONUS);
  }

  private compute(): number {
    const fromSpeed = Math.min(this.speed, SPEED_CAP) / SPEED_CAP * SPEED_BONUS;
    return 1 + fromSpeed + this.turnBonus;
  }

  private publish(): void {
    const value = Math.round(this.compute() * 10) / 10;
    const spinning = this.speed >= 0.05;

    if (value !== this.lastPublished) {
      this.lastPublished = value;
      this.multiplier.set(value);
    }
    if (spinning !== this.spinning()) this.spinning.set(spinning);
    if (this.turnCount !== this.turns()) this.turns.set(this.turnCount);
  }
}
