import { Injectable, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';
import { shopItems } from '../../assets/static-items';

export interface Item {
  id: number;
  name: WritableSignal<string>;
  value: WritableSignal<number>;
  quantity: WritableSignal<number>;
  price: WritableSignal<number>;
  factor: number;
  displayCondition: Signal<boolean>;
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
  protected readonly AuraService = inject(AuraManager);
  items = signal<Item[]>(shopItems);

  buyItem(itemId: number, amount: string): void {

    const item = this.items().find(i => i.id === itemId);
    if (!item) return;
    let amountToBuy = this.getAmountToBuy(amount, item);
    for (let i = 0; i < amountToBuy; i++) {
      if (this.AuraService.auraCount() >= item.price()) {
        this.AuraService.auraCount.update(c => c - item.price());
        item.quantity.update(q => q + 1);
        item.price.update(p => Math.round(p * item.factor));
      } else {
        break;
      }
    }
  }

  getTotalValue(): number {
    return this.items().reduce((total, item) => {
      return total + item.value() * item.quantity();
    }, 0);
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

    return amountToBuy;
  }

  calculateMaxAffordable(item: Item): number {
    let count = 0;
    let price = item.price();
    let aura = this.AuraService.auraCount();

    while (aura >= price) {
      aura -= price;
      price = Math.round(price * item.factor);
      count++;
    }

    return count;
  }

    restoreFromSave(savedItems: ItemSave[]) {
      const items = this.items();

      for (const saved of savedItems) {
        const existing = items.find(i => i.id === saved.id);
        if (existing) {
          existing.value.set(saved.value);
          existing.quantity.set(saved.quantity);
          existing.price.set(saved.price);
          existing.unlocked = saved.unlocked;
        }
    }
    this.items.set(items);
  }
}
