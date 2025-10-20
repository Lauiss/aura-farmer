import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})

export class AuraManager {
  auraCount = signal(-10);
  protected allTimeAura = signal(-10);
  protected clickValue = signal(1);

  get totalAllTime() {
    return this.allTimeAura();
  }

  increment() {
    this.auraCount.update(current => current + this.clickValue());
    this.allTimeAura.update(total => total + this.clickValue());
  }

  incrementClickValue(amount: number) {
    this.clickValue.update(value => value + amount);
  }
}
