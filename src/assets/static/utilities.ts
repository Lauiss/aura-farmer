import type { Purchasable } from '../../app/services/shop-manager';
import { sortByPrice } from './order';

/**
 * Utilitaires vendus dans la branche du même nom : des achats qui ajoutent une
 * mécanique au lieu d'un bonus continu. Certains se renforcent ensuite par une
 * chaîne d'améliorations, achetables cinq fois chacune comme celles des
 * articles.
 */

export type UtilityId = 'weakpoints' | 'doomscroll' | 'trickshot' | 'spin';

/** Grandeur qu'une amélioration d'utilitaire fait progresser. */
export type UtilityStat =
  | 'critMultiplier'
  | 'weakPointCombo'
  | 'weakPointSize'
  | 'weakPointLifetime'
  | 'luck'
  | 'payout'
  | 'scrollCombo'
  | 'autoScroll'
  | 'chestChance'
  | 'inertia'
  | 'autoSpin';

export interface UtilityUpgrade extends Purchasable {
  stat: UtilityStat;
  /** Ce qu'ajoute chaque exemplaire à la grandeur visée. */
  value: number;
}

export interface UtilityDefinition {
  id: UtilityId;
  price: number;
  /** Probabilité de déclenchement à chaque clic, pour le trickshot. */
  chance?: number;
  upgrades: UtilityUpgrade[];
}

function upgrade(
  id: number,
  name: string,
  stat: UtilityStat,
  value: number,
  price: number,
  maxPurchases?: number
): UtilityUpgrade {
  return { id, name, stat, value, price, unlocked: false, purchases: 0, maxPurchases };
}

export const UTILITIES: UtilityDefinition[] = [
  {
    id: 'weakpoints',
    price: 3000,
    upgrades: [
      upgrade(1, 'WEAKPOINT_UP_CRIT', 'critMultiplier', 1, 20000),
      upgrade(2, 'WEAKPOINT_UP_COMBO', 'weakPointCombo', 0.15, 150000),
      upgrade(3, 'WEAKPOINT_UP_SIZE', 'weakPointSize', 0.12, 1500000),
      upgrade(4, 'WEAKPOINT_UP_LIFETIME', 'weakPointLifetime', 0.6, 15000000),
      upgrade(5, 'WEAKPOINT_UP_EXECUTE', 'critMultiplier', 3, 300000000)
    ]
  },
  {
    id: 'doomscroll',
    price: 60000,
    upgrades: [
      upgrade(1, 'DOOMSCROLL_UP_ALGORITHM', 'luck', 0.03, 250000),
      upgrade(2, 'DOOMSCROLL_UP_VIRAL', 'payout', 0.25, 2500000),
      upgrade(3, 'DOOMSCROLL_UP_BRAINROT', 'scrollCombo', 0.04, 25000000),
      upgrade(4, 'DOOMSCROLL_UP_FOR_YOU', 'luck', 0.03, 250000000),
      upgrade(5, 'DOOMSCROLL_UP_TREND', 'payout', 0.5, 2500000000),
      // Identifiant 7 placé avant le 6 : la chaîne suit l'ordre de la liste,
      // et le pilote automatique, déjà sauvegardé sous le 6, doit rester le
      // dernier maillon.
      upgrade(7, 'DOOMSCROLL_UP_LOOTBOX', 'chestChance', 0.002, 25000000000),
      // Amélioration finale, hors de prix : le téléphone défile tout seul.
      upgrade(6, 'DOOMSCROLL_UP_AUTOPILOT', 'autoScroll', 1, 5e13, 1)
    ]
  },
  { id: 'trickshot', price: 50000000, chance: 0.03, upgrades: [] },
  {
    // Rotation : la statue garde son élan plus longtemps une fois lancée,
    // jusqu'à tourner toute seule — ce qui entretient le combo en continu.
    id: 'spin',
    price: 25000,
    upgrades: [
      upgrade(1, 'SPIN_UP_BEARINGS', 'inertia', 0.08, 400000),
      upgrade(2, 'SPIN_UP_OIL', 'inertia', 0.1, 40000000),
      upgrade(3, 'SPIN_UP_PERPETUAL', 'autoSpin', 1, 1e14, 1)
    ]
  }
];

// La rotation, à 25 000, était écrite en dernier alors qu'elle s'offre avant
// le doomscrolling : la branche se parcourt du moins cher au plus cher.
sortByPrice(UTILITIES);
for (const utility of UTILITIES) {
  sortByPrice(utility.upgrades);
}
