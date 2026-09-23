import { Injectable, computed, signal } from '@angular/core';

/** Points faibles enchaînés au-delà desquels la série ne monte plus. */
const MAX_STREAK = 5;
/** Ce que chaque cran ajoute au multiplicateur du coup critique. */
const STEP = 0.5;
/** Hauteur gagnée par le son à chaque cran : la série s'entend monter. */
const PITCH_STEP = 0.15;

/**
 * Série de points faibles : toucher plusieurs points d'affilée fait monter la
 * mise, rater en fait retomber à zéro.
 *
 * La série est nourrie depuis la page de jeu au clic et depuis la scène 3D
 * quand un point s'éteint sans avoir été touché — donc **hors de la zone
 * Angular** dans ce second cas, comme le combo de rotation.
 */
@Injectable({
  providedIn: 'root'
})
export class CritStreak {

  /** Points faibles touchés d'affilée, plafonnés. */
  readonly count = signal(0);

  /**
   * Multiplicateur tiré de la série. Le premier coup ne donne rien de plus :
   * c'est l'enchaînement qui paie, sinon la série ne serait qu'un bonus de
   * critique déguisé.
   */
  readonly multiplier = computed(() => 1 + STEP * Math.max(0, this.count() - 1));

  /** Vrai dès que la série vaut la peine d'être montrée. */
  readonly active = computed(() => this.count() >= 2);

  /** Série portée à son maximum, à signaler au joueur. */
  readonly maxed = computed(() => this.count() >= MAX_STREAK);

  /** Compte un point faible touché et renvoie la longueur de la série. */
  hit(): number {
    const next = Math.min(MAX_STREAK, this.count() + 1);
    this.count.set(next);
    return next;
  }

  /** Un point faible s'est éteint sans être touché : la série retombe. */
  miss(): void {
    if (this.count() !== 0) this.count.set(0);
  }

  /** Vitesse de lecture du son du clic, qui monte avec la série. */
  pitch(): number {
    return 1 + PITCH_STEP * Math.max(0, this.count() - 1);
  }
}
