import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class AuraManager {
  auraCount = signal(-10);
  allTimeAura = signal(-10);
  protected clickValue = signal(1);

  get totalAllTime() {
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
  gain(amount: number) {
    this.auraCount.update(current => current + amount);
    if (amount > 0) this.allTimeAura.update(total => total + amount);
  }

  defineAllTimeAura(amount: number) {
    this.allTimeAura.set(amount);
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
