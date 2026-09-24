import { ItemUpgrade } from "../../app/services/shop-manager";
import { UpgradeType } from "./enum/upgrade-types";

/**
 * Améliorations des pièces d'outfit. Chacune en compte trois, de plus en plus
 * chères, construites sur le **prix de la pièce** qu'elles renforcent.
 *
 * Elles faisaient exploser la production : maxées, elles multipliaient la
 * production globale par ~140 et le clic par 80, pour quelques millions
 * d'aura — leurs prix partaient de montants fixes, sans rapport avec la pièce
 * (750 000 pour renforcer une couronne à 500 millions). Désormais, toutes
 * maxées, elles font environ ×2 en production et +70 % au clic, et coûtent
 * ce que coûte la pièce. Calé par simulation : au-delà, le dernier
 * enseignement retombait sous les cinq heures.
 */

interface OutfitUpgradeSpec {
  name: string;
  type: UpgradeType;
  /** Valeur de référence ; un exemplaire en apporte `EFFECT_SCALE`. */
  value: number;
}

/** Les trois paliers partagent la même courbe de prix, relative à la pièce. */
const PRICE_STEPS = [3, 12, 50];

/**
 * Part de `value` qu'apporte un exemplaire. Cinq exemplaires font donc
 * `value / 8` : +12,5 % pour une valeur de référence de 1.
 */
const EFFECT_SCALE = 0.025;

/** Description générée depuis l'effet réel, pour qu'elle ne mente jamais. */
function describe(type: UpgradeType, perCopy: number): string {
  const percent = `${Number((Math.abs(perCopy) * 100).toFixed(2))} %`;
  switch (type) {
    case UpgradeType.CLICK:
      return `+${percent} d'aura par clic par exemplaire.`;
    case UpgradeType.PRICE_REDUCTION:
      return `-${percent} sur les prix par exemplaire.`;
    default:
      return `+${percent} de production globale par exemplaire.`;
  }
}

function buildUpgrades(piecePrice: number, specs: OutfitUpgradeSpec[]): ItemUpgrade[] {
  return specs.map((spec, index) => {
    const perCopy = spec.value * EFFECT_SCALE;
    return {
      id: index + 1,
      name: spec.name,
      description: describe(spec.type, perCopy),
      type: spec.type,
      effect: { type: spec.type, value: perCopy },
      price: Math.round(piecePrice * PRICE_STEPS[index]),
      unlocked: false,
      purchases: 0
    };
  });
}

export const earingsUpgrades: ItemUpgrade[] = buildUpgrades(2000, [
  { name: 'Anneaux polis', type: UpgradeType.MULTIPLIER, value: 0.05 },
  { name: 'Or massif', type: UpgradeType.MULTIPLIER, value: 0.1 },
  { name: 'Pierres d\'obsidienne', type: UpgradeType.MULTIPLIER, value: 0.2 }
]);

export const sunglassesUpgrades: ItemUpgrade[] = buildUpgrades(3e7, [
  { name: 'Verres polarisés', type: UpgradeType.CLICK, value: 0.4 },
  { name: 'Monture titane', type: UpgradeType.CLICK, value: 1.2 },
  { name: 'Teinte miroir', type: UpgradeType.CLICK, value: 3.6 }
]);

export const tatoosUpgrades: ItemUpgrade[] = buildUpgrades(25000, [
  { name: 'Encre profonde', type: UpgradeType.PRICE_REDUCTION, value: -0.05 },
  { name: 'Motifs ancestraux', type: UpgradeType.PRICE_REDUCTION, value: -0.1 },
  { name: 'Fresque intégrale', type: UpgradeType.PRICE_REDUCTION, value: -0.15 }
]);

export const tuxedoUpgrades: ItemUpgrade[] = buildUpgrades(300000, [
  { name: 'Coupe sur mesure', type: UpgradeType.MULTIPLIER, value: 0.15 },
  { name: 'Revers satinés', type: UpgradeType.MULTIPLIER, value: 0.25 },
  { name: 'Doublure de soie', type: UpgradeType.MULTIPLIER, value: 0.4 }
]);

export const tieUpgrades: ItemUpgrade[] = buildUpgrades(3e6, [
  { name: 'Nœud Windsor', type: UpgradeType.MULTIPLIER, value: 0.2 },
  { name: 'Soie sauvage', type: UpgradeType.MULTIPLIER, value: 0.35 },
  { name: 'Épingle en or', type: UpgradeType.MULTIPLIER, value: 0.6 }
]);

export const crownUpgrades: ItemUpgrade[] = buildUpgrades(5e8, [
  { name: 'Pointes affûtées', type: UpgradeType.MULTIPLIER, value: 0.5 },
  { name: 'Sertissage royal', type: UpgradeType.MULTIPLIER, value: 0.8 },
  { name: 'Couronne impériale', type: UpgradeType.MULTIPLIER, value: 1 }
]);

export const capeUpgrades: ItemUpgrade[] = buildUpgrades(1e10, [
  { name: 'Doublure lourde', type: UpgradeType.MULTIPLIER, value: 0.3 },
  { name: 'Broderie dorée', type: UpgradeType.MULTIPLIER, value: 0.5 },
  { name: 'Traîne royale', type: UpgradeType.MULTIPLIER, value: 0.9 }
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
