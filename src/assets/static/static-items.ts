import { computed, signal } from "@angular/core";
import { Item } from "../../app/services/shop-manager";
import { bicepsUpgrades, fartUpgrades, gamingUpgrades, jawlineUpgrades, mewingUpgrades, monetizeUpgrades, rizzUpgrades, silenceUpgrades } from "./item_upgrades";

export const shopItems: Item[] = [
  {
    id: 1,
    name: signal('Jawline Check'),
    value: signal(0.6),
    level: signal(0),
    price: signal(10),
    factor: 1.3,
    maxLevel: 25,
    basePrice: 10,
    displayCondition: signal(true),
    unlocked: true,
    upgrades: jawlineUpgrades,
    icon: 'assets/imgs/upgrades/jawline_check.png'
  },
  {
    id: 2,
    name: signal('Rizz'),
    value: signal(6),
    level: signal(0),
    price: signal(100),
    factor: 1.31,
    maxLevel: 25,
    basePrice: 100,
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
    value: signal(30),
    level: signal(0),
    price: signal(500),
    factor: 1.32,
    maxLevel: 25,
    basePrice: 500,
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
    value: signal(90),
    level: signal(0),
    price: signal(3000),
    factor: 1.33,
    maxLevel: 25,
    basePrice: 3000,
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
    value: signal(300),
    level: signal(0),
    price: signal(20000),
    factor: 1.34,
    maxLevel: 25,
    basePrice: 20000,
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
    value: signal(1500),
    level: signal(0),
    price: signal(120000),
    factor: 1.36,
    maxLevel: 25,
    basePrice: 120000,
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
    value: signal(9000),
    level: signal(0),
    price: signal(1000000),
    factor: 1.38,
    maxLevel: 25,
    basePrice: 1000000,
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
    value: signal(72000),
    level: signal(0),
    price: signal(15000000),
    factor: 1.4,
    maxLevel: 25,
    basePrice: 15000000,
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
];
