import { Injectable, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';
import { shopItems } from '../../assets/static/static-items';
import { Upgrade } from './game-manager';
import { moyaiUpgrades } from '../../assets/static/moyai-upgrades';
import { Effect, MoyaiUpgrades } from '../components/aura-btn/aura-btn';
import { UpgradeType } from '../../assets/static/enum/upgrade-types';

export interface Item {
  id: number;
  name: WritableSignal<string>;
  value: WritableSignal<number>;
  level: WritableSignal<number>;
  price: WritableSignal<number>;
  factor: number;
  displayCondition: Signal<boolean>;
  unlocked: boolean;
  upgrades?: ItemUpgrade[];
  icon: string;
}

export interface ItemUpgrade {
  id: number;
  name: string;
  description: string;
  type: UpgradeType;
  effect: Effect;
  price: number;
  unlocked: boolean;
}

export interface ItemSave {
  id: number;
  value: number;
  quantity: number;
  price: number;
  factor: number;
  unlocked: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ShopManager {
  protected readonly auraService = inject(AuraManager);
  items = signal<Item[]>(shopItems);
  moyaiUpgrades = signal<MoyaiUpgrades[]>(moyaiUpgrades);

  public finalMultiplier = signal(1);
  public clickMultiplier = signal(1);
  public priceReduction = signal(1);

  buyItem(itemId: number, amount: string): void {
    const item = this.items().find(i => i.id === itemId);
    if (!item) return;
    let amountToBuy = this.getAmountToBuy(amount, item);

    // Pour les achats multiples (10, 100), vérifier le coût total
    if (amount === '10' || amount === '100') {
      let totalCost = 0;
      let price = item.price();
      for (let i = 0; i < amountToBuy; i++) {
        totalCost += price;
        price = Math.round(price * item.factor);
      }
      if (this.auraService.auraCount() < totalCost) return; // pas assez d'aura, rien n'est acheté
    }

    for (let i = 0; i < amountToBuy; i++) {
      if (this.auraService.auraCount() >= item.price()) {
        this.auraService.auraCount.update(c => c - item.price());
        item.level.update(q => q + 1);
        item.price.update(p => Math.round((p * item.factor) * this.priceReduction()));
      } else {
        break;
      }
    }
  }

  getTotalValue(): number {
    const base = this.items().reduce((total, item) => {
      return total + item.value() * item.level();
    }, 0);

    return base * this.finalMultiplier();
  }

  getAllItems(): Item[] {
    return this.items();
  }

  getAmountToBuy(amount: string, item: Item): number {
    let amountToBuy = 1;

    switch (amount) {
      case '10':
        amountToBuy = 10;
        break;
      case '100':
        amountToBuy = 100;
        break;
      case 'MAX':
        amountToBuy = this.calculateMaxAffordable(item);
        break;
    }

    return Math.max(1, amountToBuy);
  }

  calculateMaxAffordable(item: Item): number {
    let count = 0;
    let price = item.price();
    let aura = this.auraService.auraCount();

    while (aura >= price) {
      aura -= price;
      price = Math.round(price * item.factor);
      count++;
    }

    return count;
  }

    restoreItemsFromSave(savedItems: ItemSave[]) {
      const items = this.items();

      for (const saved of savedItems) {
        const existing = items.find(i => i.id === saved.id);
        if (existing) {
          existing.value.set(saved.value);
          existing.level.set(saved.quantity);
          existing.price.set(saved.price);
          existing.unlocked = saved.unlocked;
        }
    }
    this.items.set(items);
  }

  restoreCountersFromSave(counters: {finalMultiplier?: number, clickMultiplier?: number, priceReduction?: number}){
    if(!counters){ return;}
    if(counters['finalMultiplier']){
      this.finalMultiplier.set(counters['finalMultiplier']);
    }
    if(counters['clickMultiplier']){
      this.clickMultiplier.set(counters['clickMultiplier']);
      this.auraService.defineClickValue(this.clickMultiplier());
    }
    if(counters['priceReduction']){
      this.priceReduction.set(counters['priceReduction']);
    }
  }

  restoreMoyaiUpgradesFromSave(savedUpgrades: {id: number, unlocked: boolean}[]){
    if(!savedUpgrades){ return;}
    const upgrades = this.moyaiUpgrades();
    for(const saved of savedUpgrades){
      const existing = upgrades.find(u => u.id === saved.id);
      if(existing){
        existing.unlocked = saved.unlocked;
      }
    }
    this.moyaiUpgrades.set(upgrades);
  }

  unlockMoyaiUpgrade(index: number) {
    this.moyaiUpgrades()[index].unlocked = true;
  }

  getCountersValue() {
    return {
      finalMultiplier: this.finalMultiplier(),
      clickMultiplier: this.clickMultiplier(),
      priceReduction: this.priceReduction()
    };
  }
}
export { UpgradeType };

