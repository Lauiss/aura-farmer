import { ItemUpgrade } from "../../app/services/shop-manager";
import { UpgradeType } from "./enum/upgrade-types";

/**
 * Améliorations des pièces d'outfit. Chacune en compte trois, de plus en plus
 * chères, construites sur le prix de la pièce qu'elles renforcent.
 */

interface OutfitUpgradeSpec {
  name: string;
  description: string;
  type: UpgradeType;
  value: number;
}

/** Les trois paliers partagent la même courbe de prix, relative à la pièce. */
const PRICE_STEPS = [3, 12, 50];

/**
 * Chaque exemplaire ajoute sa valeur, et chaque amélioration s'achète cinq
 * fois : les valeurs écrites plus bas, pensées pour un seul achat, sont donc
 * ramenées à ce qu'apporte un exemplaire.
 */
const EFFECT_SCALE = 0.2;

function buildUpgrades(basePrice: number, specs: OutfitUpgradeSpec[]): ItemUpgrade[] {
  return specs.map((spec, index) => ({
    id: index + 1,
    name: spec.name,
    description: spec.description,
    type: spec.type,
    effect: { type: spec.type, value: spec.value * EFFECT_SCALE },
    price: Math.round(basePrice * PRICE_STEPS[index]),
    unlocked: false,
    purchases: 0
  }));
}

export const earingsUpgrades: ItemUpgrade[] = buildUpgrades(500, [
  { name: 'Anneaux polis', description: "+1 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.05 },
  { name: 'Or massif', description: "+2 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.1 },
  { name: 'Pierres d\'obsidienne', description: "+4 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.2 }
]);

export const sunglassesUpgrades: ItemUpgrade[] = buildUpgrades(150000, [
  { name: 'Verres polarisés', description: "+20 % d'aura par clic par exemplaire.", type: UpgradeType.CLICK, value: 1 },
  { name: 'Monture titane', description: "+60 % d'aura par clic par exemplaire.", type: UpgradeType.CLICK, value: 3 },
  { name: 'Teinte miroir', description: "+180 % d'aura par clic par exemplaire.", type: UpgradeType.CLICK, value: 9 }
]);

export const tatoosUpgrades: ItemUpgrade[] = buildUpgrades(5000, [
  { name: 'Encre profonde', description: "-1 % sur les prix par exemplaire.", type: UpgradeType.PRICE_REDUCTION, value: -0.05 },
  { name: 'Motifs ancestraux', description: "-2 % sur les prix par exemplaire.", type: UpgradeType.PRICE_REDUCTION, value: -0.1 },
  { name: 'Fresque intégrale', description: "-3 % sur les prix par exemplaire.", type: UpgradeType.PRICE_REDUCTION, value: -0.15 }
]);

export const tuxedoUpgrades: ItemUpgrade[] = buildUpgrades(20000, [
  { name: 'Coupe sur mesure', description: "+3 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.15 },
  { name: 'Revers satinés', description: "+5 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.25 },
  { name: 'Doublure de soie', description: "+8 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.4 }
]);

export const tieUpgrades: ItemUpgrade[] = buildUpgrades(75000, [
  { name: 'Nœud Windsor', description: "+4 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.2 },
  { name: 'Soie sauvage', description: "+7 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.35 },
  { name: 'Épingle en or', description: "+12 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.6 }
]);

export const crownUpgrades: ItemUpgrade[] = buildUpgrades(250000, [
  { name: 'Pointes affûtées', description: "+10 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.5 },
  { name: 'Sertissage royal', description: "+16 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.8 },
  { name: 'Couronne impériale', description: "+20 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 1 }
]);

export const capeUpgrades: ItemUpgrade[] = buildUpgrades(1200000, [
  { name: 'Doublure lourde', description: "+6 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.3 },
  { name: 'Broderie dorée', description: "+10 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.5 },
  { name: 'Traîne royale', description: "+18 % de production globale par exemplaire.", type: UpgradeType.MULTIPLIER, value: 0.9 }
]);

/** Améliorations par nom de pièce, tel qu'il figure dans `moyai-upgrades.ts`. */
export const outfitUpgrades: Record<string, ItemUpgrade[]> = {
  earings: earingsUpgrades,
  sunglasses: sunglassesUpgrades,
  tatoos: tatoosUpgrades,
  tuxedo: tuxedoUpgrades,
  tie: tieUpgrades,
  crown: crownUpgrades,
  cape: capeUpgrades
};
