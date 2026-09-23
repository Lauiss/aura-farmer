import { computed, signal } from "@angular/core";
import { Item } from "../../app/services/shop-manager";
import { sortByPrice } from "./order";
import { bicepsUpgrades, dabUpgrades, fartUpgrades, gamingUpgrades, jawlineUpgrades, mewingUpgrades, moggingUpgrades, monetizeUpgrades, rizzUpgrades, silenceUpgrades, sixSevenUpgrades } from "./item_upgrades";

export const shopItems: Item[] = [
  {
    id: 1,
    name: signal('Jawline Check'),
    value: signal(0.1),
    baseValue: 0.1,
    level: signal(0),
    price: signal(15),
    factor: 1.28,
    maxLevel: 25,
    basePrice: 15,
    displayCondition: signal(true),
    unlocked: true,
    upgrades: jawlineUpgrades,
    icon: 'assets/imgs/upgrades/jawline_check.png'
  },
  {
    id: 2,
    name: signal('Rizz'),
    value: signal(1),
    baseValue: 1,
    level: signal(0),
    price: signal(220),
    factor: 1.285,
    maxLevel: 25,
    basePrice: 220,
    displayCondition: computed(() => {
        if(shopItems[0].level() >= 10){
          return true;
        }
        return false;
      }),
    unlocked: false,
    upgrades: rizzUpgrades,
    icon: 'assets/imgs/upgrades/rizz.png'
  },
  {
    id: 3,
    name: signal('Biceps Flexing'),
    value: signal(8),
    baseValue: 8,
    level: signal(0),
    price: signal(3000),
    factor: 1.29,
    maxLevel: 25,
    basePrice: 3000,
    displayCondition: computed(() => {
        if(shopItems[1].level() >= 10){
          return true;
        }
        return false;
      }),
    unlocked: false,
    upgrades: bicepsUpgrades,
    icon: 'assets/imgs/upgrades/biceps_flex.png'
  },
  {
    id: 4,
    name: signal('Mewing'),
    value: signal(60),
    baseValue: 60,
    level: signal(0),
    price: signal(40000),
    factor: 1.295,
    maxLevel: 25,
    basePrice: 40000,
    displayCondition: computed(() => {
        if(shopItems[2].level() >= 10){
          return true;
        }
        return false;
      }),
    unlocked: false,
    upgrades: mewingUpgrades,
    icon: 'assets/imgs/upgrades/mewing.png'
  },
  {
    id: 5,
    name: signal('Silence Farming'),
    value: signal(420),
    baseValue: 420,
    level: signal(0),
    price: signal(550000),
    factor: 1.3,
    maxLevel: 25,
    basePrice: 550000,
    displayCondition: computed(() => {
        if(shopItems[3].level() >= 10){
          return true;
        }
        return false;
      }),
    unlocked: false,
    upgrades: silenceUpgrades,
    icon: 'assets/imgs/upgrades/silence_farming.png'
  },
  {
    id: 6,
    name: signal('Gaming'),
    value: signal(3000),
    baseValue: 3000,
    level: signal(0),
    price: signal(7500000),
    factor: 1.305,
    maxLevel: 25,
    basePrice: 7500000,
    displayCondition: computed(() => {
        if(shopItems[4].level() >= 10){
          return true;
        }
        return false;
      }),
    unlocked: false,
    upgrades: gamingUpgrades,
    icon: 'assets/imgs/upgrades/gaming.png'
  },
    {
    id: 7,
    name: signal('Farting in public'),
    value: signal(22000),
    baseValue: 22000,
    level: signal(0),
    price: signal(100000000),
    factor: 1.31,
    maxLevel: 25,
    basePrice: 100000000,
    displayCondition: computed(() => {
        if(shopItems[5].level() >= 10){
          return true;
        }
        return false;
      }),
    unlocked: false,
    upgrades: fartUpgrades,
    icon: 'assets/imgs/upgrades/farting_in_public.png'
  },
      {
    id: 8,
    name: signal('Monetize Aura'),
    value: signal(160000),
    baseValue: 160000,
    level: signal(0),
    price: signal(1400000000),
    factor: 1.315,
    maxLevel: 25,
    basePrice: 1400000000,
    displayCondition: computed(() => {
        if(shopItems[6].level() >= 10){
          return true;
        }
        return false;
      }),
    unlocked: false,
    upgrades: monetizeUpgrades,
    icon: 'assets/imgs/upgrades/monetize_aura.png'
  },
  {
    id: 9,
    name: signal('Mogging'),
    value: signal(1160000),
    baseValue: 1160000,
    level: signal(0),
    price: signal(20000000000),
    factor: 1.32,
    maxLevel: 25,
    basePrice: 20000000000,
    displayCondition: computed(() => shopItems[7].level() >= 10),
    unlocked: false,
    upgrades: moggingUpgrades,
    icon: 'assets/imgs/upgrades/upgrade_generic.png'
  },
  {
    id: 10,
    name: signal('Six Seven'),
    value: signal(8500000),
    baseValue: 8500000,
    level: signal(0),
    price: signal(270000000000),
    factor: 1.325,
    maxLevel: 25,
    basePrice: 270000000000,
    displayCondition: computed(() => shopItems[8].level() >= 10),
    unlocked: false,
    upgrades: sixSevenUpgrades,
    icon: 'assets/imgs/upgrades/upgrade_generic.png'
  },
  {
    id: 11,
    name: signal('Dab'),
    value: signal(62000000),
    baseValue: 62000000,
    level: signal(0),
    price: signal(3700000000000),
    factor: 1.33,
    maxLevel: 25,
    basePrice: 3700000000000,
    displayCondition: computed(() => shopItems[9].level() >= 10),
    unlocked: false,
    upgrades: dabUpgrades,
    icon: 'assets/imgs/upgrades/upgrade_generic.png'
  },
];

// Chaque chaîne d'améliorations se déroule du moins cher au plus cher.
// La liste des articles, elle, n'est pas triée : ses `displayCondition` se
// renvoient l'une à l'autre par position (`shopItems[6]`), et elle est déjà
// écrite dans l'ordre des prix.
for (const item of shopItems) {
  if (item.upgrades) sortByPrice(item.upgrades);
}
