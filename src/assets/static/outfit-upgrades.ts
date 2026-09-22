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
const PRICE_STEPS = [2, 6, 18];

function buildUpgrades(basePrice: number, specs: OutfitUpgradeSpec[]): ItemUpgrade[] {
  return specs.map((spec, index) => ({
    id: index + 1,
    name: spec.name,
    description: spec.description,
    type: spec.type,
    effect: { type: spec.type, value: spec.value },
    price: Math.round(basePrice * PRICE_STEPS[index]),
    unlocked: false,
    purchases: 0
  }));
}

export const earingsUpgrades: ItemUpgrade[] = buildUpgrades(500, [
  { name: 'Anneaux polis', description: '+5% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.05 },
  { name: 'Or massif', description: '+10% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.1 },
  { name: 'Pierres d\'obsidienne', description: '+20% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.2 }
]);

export const sunglassesUpgrades: ItemUpgrade[] = buildUpgrades(150000, [
  { name: 'Verres polarisés', description: 'x2 sur la valeur du clic.', type: UpgradeType.CLICK, value: 1 },
  { name: 'Monture titane', description: 'x4 sur la valeur du clic.', type: UpgradeType.CLICK, value: 3 },
  { name: 'Teinte miroir', description: 'x10 sur la valeur du clic.', type: UpgradeType.CLICK, value: 9 }
]);

export const tatoosUpgrades: ItemUpgrade[] = buildUpgrades(5000, [
  { name: 'Encre profonde', description: '5% de réduction sur les prix.', type: UpgradeType.PRICE_REDUCTION, value: -0.05 },
  { name: 'Motifs ancestraux', description: '10% de réduction sur les prix.', type: UpgradeType.PRICE_REDUCTION, value: -0.1 },
  { name: 'Fresque intégrale', description: '15% de réduction sur les prix.', type: UpgradeType.PRICE_REDUCTION, value: -0.15 }
]);

export const tuxedoUpgrades: ItemUpgrade[] = buildUpgrades(20000, [
  { name: 'Coupe sur mesure', description: '+15% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.15 },
  { name: 'Revers satinés', description: '+25% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.25 },
  { name: 'Doublure de soie', description: '+40% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.4 }
]);

export const tieUpgrades: ItemUpgrade[] = buildUpgrades(75000, [
  { name: 'Nœud Windsor', description: '+20% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.2 },
  { name: 'Soie sauvage', description: '+35% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.35 },
  { name: 'Épingle en or', description: '+60% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.6 }
]);

export const crownUpgrades: ItemUpgrade[] = buildUpgrades(250000, [
  { name: 'Pointes affûtées', description: '+50% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.5 },
  { name: 'Sertissage royal', description: '+80% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.8 },
  { name: 'Couronne impériale', description: 'x2 sur la production globale.', type: UpgradeType.MULTIPLIER, value: 1 }
]);

export const capeUpgrades: ItemUpgrade[] = buildUpgrades(1200000, [
  { name: 'Doublure lourde', description: '+30% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.3 },
  { name: 'Broderie dorée', description: '+50% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.5 },
  { name: 'Traîne royale', description: '+90% de production globale.', type: UpgradeType.MULTIPLIER, value: 0.9 }
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
