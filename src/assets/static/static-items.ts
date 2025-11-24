import { computed, signal } from "@angular/core";
import { Item } from "../../app/services/shop-manager";
import { bicepsUpgrades, fartUpgrades, gamingUpgrades, jawlineUpgrades, mewingUpgrades, monetizeUpgrades, rizzUpgrades, silenceUpgrades } from "./item_upgrades";

export const shopItems: Item[] = [
  {
    id: 1,
    name: signal('Jawline Check'),
    value: signal(0.1),
    level: signal(0),
    price: signal(10),
    factor: 1.12,
    displayCondition: signal(true),
    unlocked: true,
    upgrades: jawlineUpgrades,
    icon: 'assets/imgs/upgrades/jawline_check.png'
  },
  {
    id: 2,
    name: signal('Rizz'),
    value: signal(1),
    level: signal(0),
    price: signal(100),
    factor: 1.13,
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
    value: signal(5),
    level: signal(0),
    price: signal(500),
    factor: 1.14,
    displayCondition: computed(() => {
        if(shopItems[1].level() >= 7){
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
    value: signal(15),
    level: signal(0),
    price: signal(3000),
    factor: 1.16,
    displayCondition: computed(() => {
        if(shopItems[2].level() >= 10 && shopItems[0].level() >= 69){
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
    value: signal(50),
    level: signal(0),
    price: signal(20000),
    factor: 1.18,
    displayCondition: computed(() => {
        if(shopItems[3].level() >= 1){
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
    value: signal(250),
    level: signal(0),
    price: signal(120000),
    factor: 1.19,
    displayCondition: computed(() => {
        if(shopItems[4].level() >= 1){
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
    value: signal(1500),
    level: signal(0),
    price: signal(1000000),
    factor: 1.21,
    displayCondition: computed(() => {
        if(shopItems[5].level() >= 1){
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
    value: signal(12000),
    level: signal(0),
    price: signal(15000000),
    factor: 1.22,
    displayCondition: computed(() => {
        if(shopItems[6].level() >= 1){
          return true;
        }
        return false;
      }),
    unlocked: false,
    upgrades: monetizeUpgrades,
    icon: 'assets/imgs/upgrades/monetize_aura.png'
  },
];
