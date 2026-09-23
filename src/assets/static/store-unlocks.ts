import type { ChestTier } from './collectibles';

/**
 * Ce que la branche « Boutique » de l'arbre ouvre : les rayons du marchand.
 *
 * Les coffres et les canettes ne sont plus en vente d'emblée — ils se méritent
 * en aura, comme le reste de l'arbre. La boutique cesse ainsi d'être un menu
 * complet dès la première gemme, et son contenu se découvre au rythme de la
 * partie.
 */
export const CHEST_UNLOCK_PRICES: Partial<Record<ChestTier, number>> = {
  basic: 20000,
  premium: 5e6,
  mythic: 5e8
};
