import type { Purchasable } from '../../app/services/shop-manager';
import { BATTLE_UNLOCK } from './bosses';
import { sortByPrice } from './order';

/**
 * Utilitaires vendus dans la branche du même nom : des achats qui ajoutent une
 * mécanique au lieu d'un bonus continu. Certains se renforcent ensuite par une
 * chaîne d'améliorations, achetables cinq fois chacune comme celles des
 * articles.
 */

export type UtilityId =
  | 'weakpoints'
  | 'doomscroll'
  | 'trickshot'
  | 'spin'
  | 'prospect'
  | 'slumber'
  | 'dice'
  | 'combo';

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
  | 'scrollSpeed'
  | 'akimbo'
  | 'inertia'
  | 'autoSpin'
  | 'gemChance'
  | 'gemCritChance'
  | 'gemAmount'
  | 'offlineHours'
  | 'offlineRate'
  | 'trickshotChance'
  | 'trickshotPower'
  | 'dieLuck'
  | 'comboSpeed'
  | 'comboTurn'
  | 'comboFloor'
  | 'comboHold';

export interface UtilityUpgrade extends Purchasable {
  stat: UtilityStat;
  /** Ce qu'ajoute chaque exemplaire à la grandeur visée. */
  value: number;
}

export interface UtilityDefinition {
  id: UtilityId;
  price: number;
  /**
   * Débit d'aura par seconde en deçà duquel l'utilitaire n'existe pas pour le
   * joueur : ni sur la carte, ni dans les compteurs. Sert à ne rien dévoiler
   * d'une mécanique qu'il n'a pas encore rencontrée.
   */
  revealAt?: number;
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
      // Pilote automatique, hors de prix : le téléphone défile tout seul.
      upgrade(6, 'DOOMSCROLL_UP_AUTOPILOT', 'autoScroll', 1, 5e13, 1),
      // Puis on l'accélère. Trois exemplaires de chacune, plafonnées à ×2,5 :
      // au-delà, les publications se succèdent trop vite pour être lues.
      upgrade(8, 'DOOMSCROLL_UP_FEED', 'scrollSpeed', 0.15, 2e14, 3),
      upgrade(9, 'DOOMSCROLL_UP_RATIO', 'scrollSpeed', 0.35, 1e15, 3),
      // Et pour finir, le second téléphone.
      upgrade(10, 'DOOMSCROLL_UP_AKIMBO', 'akimbo', 1, 8e15, 1)
    ]
  },
  {
    // Le trickshot partait trop rarement pour qu'on le voie, et rien ne
    // permettait d'y remédier : il a maintenant sa chaîne, moitié fréquence
    // moitié puissance.
    id: 'trickshot',
    price: 50000000,
    chance: 0.03,
    upgrades: [
      upgrade(1, 'TRICKSHOT_UP_AIM', 'trickshotChance', 0.01, 200000000),
      upgrade(2, 'TRICKSHOT_UP_CALIBER', 'trickshotPower', 2, 2000000000),
      upgrade(3, 'TRICKSHOT_UP_SCOPE', 'trickshotChance', 0.015, 20000000000),
      upgrade(4, 'TRICKSHOT_UP_NOSCOPE', 'trickshotPower', 4, 200000000000),
      upgrade(5, 'TRICKSHOT_UP_COLLATERAL', 'trickshotChance', 0.02, 2000000000000)
    ]
  },
  {
    // Combo : le multiplicateur de rotation n'avait aucune prise dans l'arbre,
    // alors qu'il porte une bonne part des gains. Quatre grandeurs distinctes
    // plutôt qu'un seul curseur, pour qu'on choisisse son style.
    id: 'combo',
    price: 80000,
    upgrades: [
      upgrade(1, 'COMBO_UP_MOMENTUM', 'comboSpeed', 0.1, 400000),
      upgrade(2, 'COMBO_UP_SPIRAL', 'comboTurn', 0.04, 4000000),
      upgrade(3, 'COMBO_UP_ANCHOR', 'comboFloor', 0.06, 40000000),
      upgrade(4, 'COMBO_UP_FLYWHEEL', 'comboHold', 0.12, 400000000),
      upgrade(5, 'COMBO_UP_VORTEX', 'comboSpeed', 0.2, 4000000000),
      upgrade(6, 'COMBO_UP_SINGULARITY', 'comboTurn', 0.08, 40000000000)
    ]
  },
  {
    // Dés pipés : n'apparaît qu'une fois les battles découvertes. Avant, ces
    // améliorations parleraient d'un lancer de dé que le joueur n'a jamais vu.
    id: 'dice',
    price: 2000,
    revealAt: BATTLE_UNLOCK,
    upgrades: [
      upgrade(1, 'DICE_UP_WEIGHTED', 'dieLuck', 0.04, 20000),
      upgrade(2, 'DICE_UP_SLEIGHT', 'dieLuck', 0.05, 800000),
      upgrade(3, 'DICE_UP_LOADED', 'dieLuck', 0.06, 40000000),
      upgrade(4, 'DICE_UP_FATE', 'dieLuck', 0.07, 2000000000),
      upgrade(5, 'DICE_UP_DESTINY', 'dieLuck', 0.08, 1e11)
    ]
  },
  {
    // Sommeil : la progression hors-ligne était figée à huit heures à plein
    // rendement, sans rien pour la faire progresser. Elle a maintenant sa
    // branche, comme le reste.
    id: 'slumber',
    price: 1000,
    upgrades: [
      upgrade(1, 'SLUMBER_UP_NAP', 'offlineHours', 2, 600000),
      upgrade(2, 'SLUMBER_UP_DREAM', 'offlineRate', 0.1, 6000000),
      upgrade(3, 'SLUMBER_UP_HIBERNATION', 'offlineHours', 4, 60000000),
      upgrade(4, 'SLUMBER_UP_ASTRAL', 'offlineRate', 0.2, 600000000),
      upgrade(5, 'SLUMBER_UP_TORPOR', 'offlineHours', 8, 60000000000)
    ]
  },
  {
    // Prospection : les gemmes ne tombaient que des coffres. Elle ouvre la
    // seconde monnaie au clic, et ses améliorations en font une source à part
    // entière plutôt qu'un hasard anecdotique.
    id: 'prospect',
    price: 400000,
    upgrades: [
      upgrade(1, 'PROSPECT_UP_EYE', 'gemChance', 0.0015, 1200000),
      upgrade(2, 'PROSPECT_UP_VEIN', 'gemCritChance', 0.01, 12000000),
      upgrade(3, 'PROSPECT_UP_CUT', 'gemAmount', 1, 120000000),
      upgrade(4, 'PROSPECT_UP_LODE', 'gemChance', 0.003, 1200000000),
      upgrade(5, 'PROSPECT_UP_MOTHERLODE', 'gemAmount', 2, 120000000000)
    ]
  },
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
