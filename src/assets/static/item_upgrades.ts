import { signal } from "@angular/core";
import { ItemUpgrade } from "../../app/services/shop-manager";
import { UpgradeType } from '../../assets/static/enum/upgrade-types';


export const jawlineUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Selfie Angle Pro",
    description: "+6 % de production de Jawline Check, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.06, targetItemId: [1] },
    price: 120,
    unlocked: false,
  },
  {
    id: 2,
    name: "Contour Naturel",
    description: "+12 % de production de Jawline Check, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.12, targetItemId: [1] },
    price: 360,
    unlocked: false,
  },
  {
    id: 3,
    name: "Hydratation Extrême",
    description: "+24 % de production de Jawline Check, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.24, targetItemId: [1] },
    price: 1080,
    unlocked: false,
  },
  {
    id: 4,
    name: "Pose Signature",
    description: "+7.5 % d'aura par clic, à chaque exemplaire.",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.075, targetItemId: [1] },
    price: 3240,
    unlocked: false,
  },
  {
    id: 5,
    name: "Masseter Training",
    description: "+60 % de production de Jawline Check, à chaque exemplaire.",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 0.6, targetItemId: [1] },
    price: 9720,
    unlocked: false,
  }
];


export const rizzUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Eye Contact Mastery",
    description: "+9 % de production de Rizz, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.09, targetItemId: [2] },
    price: 1760,
    unlocked: false,
  },
  {
    id: 2,
    name: "Voice Tone Control",
    description: "+18 % de production de Rizz, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.18, targetItemId: [2] },
    price: 5280,
    unlocked: false,
  },
  {
    id: 3,
    name: "Compliment Precision",
    description: "+6 % d'aura par clic, à chaque exemplaire.",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.06, targetItemId: [2] },
    price: 15840,
    unlocked: false,
  },
  {
    id: 4,
    name: "Natural Charm",
    description: "+60 % de production de Rizz, à chaque exemplaire.",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 0.6, targetItemId: [2] },
    price: 47520,
    unlocked: false,
  }
];

export const bicepsUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Pompes Explosives",
    description: "+12 % de production de Biceps Flexing, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.12, targetItemId: [3] },
    price: 24000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Routine Sculptée",
    description: "+24 % de production de Biceps Flexing, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.24, targetItemId: [3] },
    price: 72000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Flex Parfait",
    description: "+7.5 % d'aura par clic, à chaque exemplaire.",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.075, targetItemId: [3] },
    price: 216000,
    unlocked: false,
  },
  {
    id: 4,
    name: "Gains Massifs",
    description: "+60 % de production de Biceps Flexing, à chaque exemplaire.",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 0.6, targetItemId: [3] },
    price: 648000,
    unlocked: false,
  }
];

export const mewingUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Posture Alignée",
    description: "+6 % de production de Mewing, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.06, targetItemId: [4] },
    price: 320000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Respiration Nasale",
    description: "+12 % de production de Mewing, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.12, targetItemId: [4] },
    price: 960000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Langue Parfaite",
    description: "+18 % de production de Mewing, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.18, targetItemId: [4] },
    price: 2880000,
    unlocked: false,
  },
  {
    id: 4,
    name: "Mastication Intense",
    description: "+4.5 % d'aura par clic, à chaque exemplaire.",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.045, targetItemId: [4] },
    price: 8640000,
    unlocked: false,
  },
  {
    id: 5,
    name: "Routine Quotidienne",
    description: "+30 % de production de Mewing, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.3, targetItemId: [4] },
    price: 25920000,
    unlocked: false,
  },
  {
    id: 6,
    name: "Relaxation Faciale",
    description: "+60 % de production de Mewing, à chaque exemplaire.",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 0.6, targetItemId: [4] },
    price: 77760000,
    unlocked: false,
  },
  {
    id: 7,
    name: "Respiration Pro",
    description: "+7.5 % d'aura par clic, à chaque exemplaire.",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.075, targetItemId: [4] },
    price: 233280000,
    unlocked: false,
  },
  {
    id: 8,
    name: "Discipline Absolue",
    description: "+60 % de production de Mewing, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.6, targetItemId: [4] },
    price: 699840000,
    unlocked: false,
  },
  {
    id: 9,
    name: "Gueule de Chad",
    description: "+120 % de production de Mewing, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 1.2, targetItemId: [4] },
    price: 2099520000,
    unlocked: false,
  },
  {
    id: 10,
    name: "Mewing Instinctif",
    description: "+15 % d'aura par clic, à chaque exemplaire.",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.15, targetItemId: [4] },
    price: 6298560000,
    unlocked: false
  }
];

export const silenceUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Zénitude Pure",
    description: "+9 % de production de Silence Farming, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.09, targetItemId: [5] },
    price: 4400000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Respiration Contrôlée",
    description: "+21 % de production de Silence Farming, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.21, targetItemId: [5] },
    price: 13200000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Calme Absolu",
    description: "+60 % de production de Silence Farming, à chaque exemplaire.",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 0.6, targetItemId: [5] },
    price: 39600000,
    unlocked: false,
  }
];

export const gamingUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Setup RGB",
    description: "+12 % de production de Gaming, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.12, targetItemId: [6] },
    price: 60000000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Clavier Mécanique",
    description: "+30 % de production de Gaming, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.3, targetItemId: [6] },
    price: 180000000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Aim Assist Naturel",
    description: "+9 % d'aura par clic, à chaque exemplaire.",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.09, targetItemId: [6] },
    price: 540000000,
    unlocked: false,
  },
  {
    id: 4,
    name: "God Gamer",
    description: "+60 % de production de Gaming, à chaque exemplaire.",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 0.6, targetItemId: [6] },
    price: 1620000000,
    unlocked: false,
  }
];

export const fartUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Technique Souterraine",
    description: "+15 % de production de Farting in public, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.15, targetItemId: [7] },
    price: 800000000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Optimisation des Ondes",
    description: "+30 % de production de Farting in public, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.3, targetItemId: [7] },
    price: 2400000000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Contrôle Accoustique",
    description: "+10.5 % d'aura par clic, à chaque exemplaire.",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.105, targetItemId: [7] },
    price: 7200000000,
    unlocked: false,
  },
  {
    id: 4,
    name: "Explosion Maîtrisée",
    description: "+60 % de production de Farting in public, à chaque exemplaire.",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 0.6, targetItemId: [7] },
    price: 21600000000,
    unlocked: false,
  }
];

export const monetizeUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "AdSense Divin",
    description: "+12 % de production de Monetize Aura, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.12, targetItemId: [8] },
    price: 11200000000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Sponsored Aura",
    description: "+24 % de production de Monetize Aura, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.24, targetItemId: [8] },
    price: 33600000000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Influence Ultime",
    description: "+9 % d'aura par clic, à chaque exemplaire.",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.09, targetItemId: [8] },
    price: 100800000000,
    unlocked: false,
  },
  {
    id: 4,
    name: "Golden Aura",
    description: "+60 % de production de Monetize Aura, à chaque exemplaire.",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 0.6, targetItemId: [8] },
    price: 302400000000,
    unlocked: false,
  }
];


export const moggingUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Regard Vertical",
    description: "+12 % de production de Mogging, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.12, targetItemId: [9] },
    price: 160000000000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Mâchoire Souveraine",
    description: "+24 % de production de Mogging, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.24, targetItemId: [9] },
    price: 480000000000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Mog Silencieux",
    description: "+10 % d'aura par clic, à chaque exemplaire.",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.1, targetItemId: [9] },
    price: 1440000000000,
    unlocked: false,
  },
  {
    id: 4,
    name: "Effondrement Adverse",
    description: "+60 % de production de Mogging, à chaque exemplaire.",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 0.6, targetItemId: [9] },
    price: 4320000000000,
    unlocked: false,
  }
];

export const sixSevenUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Comptine Virale",
    description: "+14 % de production de Six Seven, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.14, targetItemId: [10] },
    price: 2160000000000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Boucle Infinie",
    description: "+28 % de production de Six Seven, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.28, targetItemId: [10] },
    price: 6480000000000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Réflexe Pavlovien",
    description: "+12 % d'aura par clic, à chaque exemplaire.",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.12, targetItemId: [10] },
    price: 19440000000000,
    unlocked: false,
  },
  {
    id: 4,
    name: "Six Sept Absolu",
    description: "+70 % de production de Six Seven, à chaque exemplaire.",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 0.7, targetItemId: [10] },
    price: 58320000000000,
    unlocked: false,
  }
];

export const dabUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Coude Parfait",
    description: "+16 % de production du Dab, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.16, targetItemId: [11] },
    price: 29600000000000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Dab Synchronisé",
    description: "+32 % de production du Dab, à chaque exemplaire.",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.32, targetItemId: [11] },
    price: 88800000000000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Dab au Ralenti",
    description: "+15 % d'aura par clic, à chaque exemplaire.",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.15, targetItemId: [11] },
    price: 266400000000000,
    unlocked: false,
  },
  {
    id: 4,
    name: "Dab Éternel",
    description: "+80 % de production du Dab, à chaque exemplaire.",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 0.8, targetItemId: [11] },
    price: 799200000000000,
    unlocked: false,
  }
];
