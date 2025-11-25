import { signal } from "@angular/core";
import { ItemUpgrade } from "../../app/services/shop-manager";
import { UpgradeType } from '../../assets/static/enum/upgrade-types';


export const jawlineUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Selfie Angle Pro",
    description: "Augmente la production de Jawline Check de 10% (×1.10).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.10, targetItemId: [1] },
    price: 40,
    unlocked: false,
  },
  {
    id: 2,
    name: "Contour Naturel",
    description: "Augmente la production de Jawline Check de 20% (×1.20).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.20, targetItemId: [1] },
    price: 100,
    unlocked: false,
  },
  {
    id: 3,
    name: "Hydratation Extrême",
    description: "Augmente la production de Jawline Check de 40% (×1.40).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.40, targetItemId: [1] },
    price: 260,
    unlocked: false,
  },
  {
    id: 4,
    name: "Pose Signature",
    description: "Augmente l'aura par clic liée à Jawline Check de 25% (×1.25).",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.25, targetItemId: [1] },
    price: 600,
    unlocked: false,
  },
  {
    id: 5,
    name: "Masseter Training",
    description: "Double la production de Jawline Check (×2).",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 1.0, targetItemId: [1] },
    price: 1500,
    unlocked: false,
  }
];


export const rizzUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Eye Contact Mastery",
    description: "Augmente la production de Rizz de 15% (×1.15).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.15, targetItemId: [2] },
    price: 200,
    unlocked: false,
  },
  {
    id: 2,
    name: "Voice Tone Control",
    description: "Augmente la production de Rizz de 30% (×1.30).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.30, targetItemId: [2] },
    price: 500,
    unlocked: false,
  },
  {
    id: 3,
    name: "Compliment Precision",
    description: "Augmente l'aura par clic liée à Rizz de 20% (×1.20).",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.20, targetItemId: [2] },
    price: 1200,
    unlocked: false,
  },
  {
    id: 4,
    name: "Natural Charm",
    description: "Double la production de Rizz (×2.0).",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 1.0, targetItemId: [2] },
    price: 3500,
    unlocked: false,
  }
];

export const bicepsUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Pompes Explosives",
    description: "Augmente la production de Biceps Flexing de 20% (×1.20).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.20, targetItemId: [3] },
    price: 600,
    unlocked: false,
  },
  {
    id: 2,
    name: "Routine Sculptée",
    description: "Augmente la production de Biceps Flexing de 40% (×1.40).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.40, targetItemId: [3] },
    price: 1500,
    unlocked: false,
  },
  {
    id: 3,
    name: "Flex Parfait",
    description: "Augmente l'aura par clic liée à Biceps Flexing de 25% (×1.25).",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.25, targetItemId: [3] },
    price: 3000,
    unlocked: false,
  },
  {
    id: 4,
    name: "Gains Massifs",
    description: "Double la production de Biceps Flexing (×2).",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 1.0, targetItemId: [3] },
    price: 9000,
    unlocked: false,
  }
];

export const mewingUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Posture Alignée",
    description: "Augmente la production de Mewing de 10% (×1.10).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.10, targetItemId: [1] },
    price: 50,
    unlocked: false,
  },
  {
    id: 2,
    name: "Respiration Nasale",
    description: "Augmente la production de Mewing de 20% (×1.20).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.20, targetItemId: [1] },
    price: 120,
    unlocked: false,
  },
  {
    id: 3,
    name: "Langue Parfaite",
    description: "Augmente la production de Mewing de 30% (×1.30).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.30, targetItemId: [1] },
    price: 300,
    unlocked: false,
  },
  {
    id: 4,
    name: "Mastication Intense",
    description: "Augmente l'aura obtenue par clic de 15% pour le click lié à Mewing (×1.15).",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.15, targetItemId: [1] },
    price: 700,
    unlocked: false,
  },
  {
    id: 5,
    name: "Routine Quotidienne",
    description: "Augmente la production de Mewing de 50% (×1.50).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.50, targetItemId: [1] },
    price: 1500,
    unlocked: false,
  },
  {
    id: 6,
    name: "Relaxation Faciale",
    description: "Applique un bonus fixe : multiplie la production de Mewing par 2 (×2).",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 1.0, targetItemId: [1] },
    price: 3500,
    unlocked: false,
  },
  {
    id: 7,
    name: "Respiration Pro",
    description: "Augmente l'aura obtenue par clic de 25% pour le click lié à Mewing (×1.25).",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.25, targetItemId: [1] },
    price: 8000,
    unlocked: false,
  },
  {
    id: 8,
    name: "Discipline Absolue",
    description: "Double la production de Mewing (×2.0).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 1.0, targetItemId: [1] },
    price: 20000,
    unlocked: false,
  },
  {
    id: 9,
    name: "Gueule de Chad",
    description: "Triple la production de Mewing (×3.0).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 2.0, targetItemId: [1] },
    price: 60000,
    unlocked: false,
  },
  {
    id: 10,
    name: "Mewing Instinctif",
    description: "Augmente l'aura obtenue par clic de 50% pour le click lié à Mewing (×1.5).",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.5, targetItemId: [1] },
    price: 120000,
    unlocked: false
  }
];

export const silenceUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Zénitude Pure",
    description: "Augmente la production de Silence Farming de 15% (×1.15).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.15, targetItemId: [5] },
    price: 4000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Respiration Contrôlée",
    description: "Augmente la production de Silence Farming de 35% (×1.35).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.35, targetItemId: [5] },
    price: 9000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Calme Absolu",
    description: "Double la production de Silence Farming (×2).",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 1.0, targetItemId: [5] },
    price: 25000,
    unlocked: false,
  }
];

export const gamingUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Setup RGB",
    description: "Augmente la production de Gaming de 20% (×1.20).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.20, targetItemId: [6] },
    price: 15000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Clavier Mécanique",
    description: "Augmente la production de Gaming de 50% (×1.50).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.50, targetItemId: [6] },
    price: 35000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Aim Assist Naturel",
    description: "Augmente l'aura par clic liée au Gaming de 30% (×1.30).",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.30, targetItemId: [6] },
    price: 60000,
    unlocked: false,
  },
  {
    id: 4,
    name: "God Gamer",
    description: "Double la production de Gaming (×2).",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 1.0, targetItemId: [6] },
    price: 150000,
    unlocked: false,
  }
];

export const fartUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "Technique Souterraine",
    description: "Augmente la production de Farting in Public de 25% (×1.25).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.25, targetItemId: [7] },
    price: 200000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Optimisation des Ondes",
    description: "Augmente la production de Farting in Public de 50% (×1.50).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.50, targetItemId: [7] },
    price: 450000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Contrôle Accoustique",
    description: "Augmente l'aura par clic liée à Farting in Public de 35% (×1.35).",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.35, targetItemId: [7] },
    price: 900000,
    unlocked: false,
  },
  {
    id: 4,
    name: "Explosion Maîtrisée",
    description: "Double la production de Farting in Public (×2).",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 1.0, targetItemId: [7] },
    price: 2500000,
    unlocked: false,
  }
];

export const monetizeUpgrades: ItemUpgrade[] = [
  {
    id: 1,
    name: "AdSense Divin",
    description: "Augmente la production de Monetize Aura de 20% (×1.20).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.20, targetItemId: [8] },
    price: 3000000,
    unlocked: false,
  },
  {
    id: 2,
    name: "Sponsored Aura",
    description: "Augmente la production de Monetize Aura de 40% (×1.40).",
    type: UpgradeType.MULTIPLIER,
    effect: { type: UpgradeType.MULTIPLIER, value: 0.40, targetItemId: [8] },
    price: 9000000,
    unlocked: false,
  },
  {
    id: 3,
    name: "Influence Ultime",
    description: "Augmente l'aura générée par clic liée à Monetize Aura de 30% (×1.30).",
    type: UpgradeType.CLICK,
    effect: { type: UpgradeType.CLICK, value: 0.30, targetItemId: [8] },
    price: 20000000,
    unlocked: false,
  },
  {
    id: 4,
    name: "Golden Aura",
    description: "Double la production de Monetize Aura (×2).",
    type: UpgradeType.ITEM_BOOST,
    effect: { type: UpgradeType.ITEM_BOOST, value: 1.0, targetItemId: [8] },
    price: 60000000,
    unlocked: false,
  }
];
