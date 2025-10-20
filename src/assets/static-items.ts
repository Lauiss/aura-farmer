import { computed, signal } from "@angular/core";
import { Item } from "../app/services/shop-manager";

export const shopItems: Item[] = [
  {
    id: 1,
    name: signal('Petit Aura'),
    value: signal(0.1),
    quantity: signal(0),
    price: signal(10),            // prix de départ
    factor: 1.10,                 // prix augmente de 10% à chaque achat
    displayCondition: signal(true),
    unlocked: true
  },
  {
    id: 2,
    name: signal('Aura Collector'),
    value: signal(1),
    quantity: signal(0),
    price: signal(50),
    factor: 1.12,
    displayCondition: computed(() => {
        if(shopItems[0].quantity() >= 10){
          return true;
        }
        return false;
      }),
    unlocked: false
  },
  {
    id: 3,
    name: signal('Aura Factory'),
    value: signal(5),
    quantity: signal(0),
    price: signal(200),
    factor: 1.15,
    displayCondition: computed(() => {
        if(shopItems[1].quantity() >= 7){
          return true;
        }
        return false;
      }),
    unlocked: false
  },
  {
    id: 4,
    name: signal('Aura Bank'),
    value: signal(10),
    quantity: signal(0),
    price: signal(1000),
    factor: 1.18,
    displayCondition: computed(() => {
        if(shopItems[2].quantity() >= 10 && shopItems[0].quantity() >= 69){
          return true;
        }
        return false;
      }),
    unlocked: false
  },
  {
    id: 5,
    name: signal('Aura Planet'),
    value: signal(25),
    quantity: signal(0),
    price: signal(5000),
    factor: 1.20,
    displayCondition: computed(() => {
        if(shopItems[3].quantity() >= 1){
          return true;
        }
        return false;
      }), // se débloque après avoir 3 Aura Bank
    unlocked: false
  }
];
