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

/**
 * Le casino, ouvert dans la même branche. Il se paie en aura comme les rayons,
 * et cher : on y joue des gemmes, et pouvoir les rejouer tôt viderait de son
 * sens la collection qu'elles servent à remplir.
 */
export const CASINO_PRICE = 1e15;
