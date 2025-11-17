import { computed, signal } from "@angular/core";
import { Item } from "../../app/services/shop-manager";

export const shopItems: Item[] = [
  {
    id: 1,
    name: signal('Jawline Check'),
    value: signal(0.1),
    quantity: signal(0),
    price: signal(10),            // prix de départ
    factor: 1.10,                 // prix augmente de 10% à chaque achat
    displayCondition: signal(true),
    unlocked: true,
    icon: 'assets/imgs/upgrades/jawline_check.png'
  },
  {
    id: 2,
    name: signal('Rizz'),
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
    unlocked: false,
    icon: 'assets/imgs/upgrades/rizz.png'
  },
  {
    id: 3,
    name: signal('Biceps Flexing'),
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
    unlocked: false,
    icon: 'assets/imgs/upgrades/biceps_flex.png'
  },
  {
    id: 4,
    name: signal('Mewing'),
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
    unlocked: false,
    icon: 'assets/imgs/upgrades/mewing.png'
  },
  {
    id: 5,
    name: signal('Silence Farming'),
    value: signal(25),
    quantity: signal(0),
    price: signal(5000),
    factor: 1.20,
    displayCondition: computed(() => {
        if(shopItems[3].quantity() >= 1){
          return true;
        }
        return false;
      }),
    unlocked: false,
    icon: 'assets/imgs/upgrades/silence_farming.png'
  },
  {
    id: 6,
    name: signal('Gaming'),
    value: signal(50),
    quantity: signal(0),
    price: signal(10000),
    factor: 1.19,
    displayCondition: computed(() => {
        if(shopItems[4].quantity() >= 1){
          return true;
        }
        return false;
      }),
    unlocked: false,
    icon: 'assets/imgs/upgrades/gaming.png'
  },
    {
    id: 7,
    name: signal('Farting in public'),
    value: signal(100),
    quantity: signal(0),
    price: signal(20000),
    factor: 1.21,
    displayCondition: computed(() => {
        if(shopItems[5].quantity() >= 1){
          return true;
        }
        return false;
      }),
    unlocked: false,
    icon: 'assets/imgs/upgrades/farting_in_public.png'
  },
      {
    id: 8,
    name: signal('Monetize Aura'),
    value: signal(1000),
    quantity: signal(0),
    price: signal(200000),
    factor: 1.22,
    displayCondition: computed(() => {
        if(shopItems[6].quantity() >= 1){
          return true;
        }
        return false;
      }),
    unlocked: false,
    icon: 'assets/imgs/upgrades/monetize_aura.png'
  },
];
