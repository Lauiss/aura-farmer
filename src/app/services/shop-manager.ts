import { Injectable, Signal, WritableSignal, computed, inject, signal } from '@angular/core';
import { AuraManager } from './aura-manager';

export interface Item {
  id: number;
  name: WritableSignal<string>;
  value: WritableSignal<number>;
  quantity: WritableSignal<number>;
  price: WritableSignal<number>;
  displayCondition: Signal<boolean>;
  unlocked: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ShopManager {
  protected readonly AuraService = inject(AuraManager);
  items: Item[] = [
    {
      id: 1,
      name: signal('Petit générateur'),
      value: signal(1),
      quantity: signal(0),
      price: signal(10),
      displayCondition: signal(true),
      unlocked: true
    },
    {
      id: 2,
      name: signal('Gros générateur'),
      value: signal(10),
      quantity: signal(0),
      price: signal(100),
      displayCondition: computed(() => {
        if(this.items[1].unlocked){
          return true;
        }
        if(this.AuraService.auraCount() >= 10) {
          return true;
        }
        return false;
      }),
      unlocked: false
    }
    // Ajoute d'autres items ici
  ];

  buyItem(itemId: number, amount: number): boolean {
    const item = this.items.find(i => i.id === itemId);
    if (!item) return false;
    const price = item.price();
    if (this.AuraService.auraCount() >= (price * amount)) {
      item.quantity.update(q => q + 1);
      this.AuraService.auraCount.update(aura => aura - (price * amount));
      return true;
    }
    return false;
  }

  getTotalValue(): number {
    return this.items.reduce((total, item) => {
      return total + item.value() * item.quantity();
    }, 0);
  }

  getAllItems(): Item[] {
    return this.items;
  }
}
