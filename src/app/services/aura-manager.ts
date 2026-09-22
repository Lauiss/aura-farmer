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
    const gain = this.clickValue() * multiplier;
    this.auraCount.update(current => current + gain);
    this.allTimeAura.update(total => total + gain);
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
