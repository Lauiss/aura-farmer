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
  upgrades?: { id: number; unlocked: boolean }[];
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
        item.price.update(p => Math.round(p * item.factor));
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

          // Restaurer les upgrades
          if (saved.upgrades && existing.upgrades) {
            for (const savedUpgrade of saved.upgrades) {
              const existingUpgrade = existing.upgrades.find(u => u.id === savedUpgrade.id);
              if (existingUpgrade) {
                existingUpgrade.unlocked = savedUpgrade.unlocked;
              }
            }
          }
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
    this.applyEffect(this.moyaiUpgrades()[index].effect);
    this.moyaiUpgrades()[index].unlocked = true;
  }

  unlockUpgrade(itemId: number, upgradeId: number) {
    const item = this.items().find(i => i.id === itemId);
    if(!item || !item.upgrades){ return; }
    const upgrade = item.upgrades.find(u => u.id === upgradeId);
    if(!upgrade || upgrade.unlocked){ return; }
    if(this.auraService.auraCount() < upgrade.price){ return; }

    this.auraService.auraCount.update(c => c - upgrade.price);
    upgrade.unlocked = true;
    this.applyEffect(upgrade.effect);
  }

  applyEffect(effect: Effect) {
    switch(effect.type){
      case UpgradeType.MULTIPLIER:
        // Si targetItemId est défini, c'est un boost d'item spécifique
        if(effect.targetItemId){
          const items = this.items();
          for(const id of effect.targetItemId){
            const item = items.find(i => i.id === id);
            if(item){
              item.value.update(v => Number((v * (1 + effect.value)).toFixed(2)));
            }
          }
          this.items.set([...items]);
        } else {
          // Sinon c'est un multiplicateur global
          this.finalMultiplier.set(Number((this.finalMultiplier() * (1 + effect.value)).toFixed(2)));
        }
        break;
      case UpgradeType.CLICK:
        this.clickMultiplier.set(Number((this.clickMultiplier() * (1 + effect.value)).toFixed(2)));
        this.auraService.defineClickValue(this.clickMultiplier());
        break;
      case UpgradeType.PRICE_REDUCTION:
        this.priceReduction.set(Number((this.priceReduction() * (1 + effect.value)).toFixed(2)));
        break;
      case UpgradeType.ITEM_BOOST:
        if(effect.targetItemId){
          const items = this.items();
          for(const id of effect.targetItemId){
            const item = items.find(i => i.id === id);
            if(item){
              item.value.update(v => Number((v * (1 + effect.value)).toFixed(2)));
            }
          }
          // Forcer la mise à jour du signal items
          this.items.set([...items]);
        }
        break;
    }
  }

  getCountersValue() {
    return {
      finalMultiplier: this.finalMultiplier(),
      clickMultiplier: this.clickMultiplier(),
      priceReduction: this.priceReduction()
    };
  }

  unbuyMoyaiUpgrade(index: number) {
    this.moyaiUpgrades()[index].unlocked = false;
  }
}
export { UpgradeType };

