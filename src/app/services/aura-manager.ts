import { Injectable, signal } from '@angular/core';
import Decimal from 'break_infinity.js';

/** Ce qu'on peut donner ou retirer : un nombre ordinaire ou un `Decimal`. */
export type AuraAmount = Decimal | number;

/**
 * Le compte d'aura, tenu en [`break_infinity.js`](https://github.com/Patashu/break_infinity.js).
 *
 * Ce qui change par rapport à un nombre ordinaire : la **plage d'exposants**.
 * Un `number` s'arrête à 1,8e308 et bascule à `Infinity` au-delà — après quoi
 * tout est perdu, l'affichage comme la sauvegarde. L'aura est la seule
 * grandeur du jeu qui grimpe sans plafond : elle intègre la production seconde
 * après seconde et ne redescend qu'aux achats. Tout le reste — prix,
 * production, multiplicateurs — est borné par la courbe d'équilibrage (25
 * niveaux par article, facteurs fixes) et tient dans un `number`, qui reste
 * donc le type des montants échangés.
 *
 * Ce que cela **ne change pas** : la mantisse reste un flottant 64 bits, donc
 * la même quinzaine de chiffres significatifs qu'avant. Un compteur d'aura à
 * l'unité près passé 9e15 n'existe pas plus qu'avant — ce n'est pas le
 * problème que cette bibliothèque résout.
 */
@Injectable({
  providedIn: 'root'
})
export class AuraManager {

  readonly auraCount = signal<Decimal>(new Decimal(-10));
  readonly allTimeAura = signal<Decimal>(new Decimal(-10));
  protected clickValue = signal(1);

  get totalAllTime(): Decimal {
    return this.allTimeAura();
  }

  /** `multiplier` porte le combo de rotation ; 1 quand la statue est immobile. */
  increment(multiplier = 1) {
    this.gain(this.clickValue() * multiplier);
  }

  /**
   * Crédite (ou débite, si négatif) un montant gagné en jouant. Le cumul de
   * toute la partie ne compte que les gains : une perte au doomscrolling ne
   * doit pas effacer l'aura déjà farmée.
   */
  gain(amount: AuraAmount) {
    const value = new Decimal(amount);
    this.auraCount.update(current => current.plus(value));
    if (value.gt(0)) this.allTimeAura.update(total => total.plus(value));
  }

  /**
   * Peut-on payer ce prix ? Passer par ici plutôt que de comparer à la main
   * évite d'avoir à se souvenir, à chaque achat du jeu, que le compte n'est
   * plus un nombre ordinaire.
   */
  canAfford(price: AuraAmount): boolean {
    return this.auraCount().gte(price);
  }

  /** Débite un achat. À n'appeler qu'après `canAfford`. */
  spend(price: AuraAmount) {
    this.auraCount.update(current => current.minus(price));
  }

  setAura(amount: AuraAmount) {
    this.auraCount.set(new Decimal(amount));
  }

  defineAllTimeAura(amount: AuraAmount) {
    this.allTimeAura.set(new Decimal(amount));
  }

  defineClickValue(amount: number) {
    this.clickValue.set(amount);
  }

  incrementClickValue(amount: number) {
    this.clickValue.update(value => value + amount);
  }

  roundDecimals(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
