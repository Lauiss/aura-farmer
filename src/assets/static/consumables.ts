/**
 * Consommables vendus par le moyai marchand : des canettes et des plats qui
 * dopent la production et le clic pendant un temps donné.
 *
 * Ils s'achètent en **gemmes** et non en aura : c'est ce qui donne aux gemmes
 * un usage régulier à côté des coffres, dont le rendement est aléatoire.
 *
 * Un seul effet par **catégorie** à la fois : une canette et un plat peuvent
 * se cumuler, deux canettes non. Enchaîner les canettes multipliait la
 * production sans limite ; le marchand refuse désormais (« arrêt cardiaque »).
 */

export type ConsumableCategory = 'drink' | 'food';

export type DrinkId = 'espresso' | 'monster' | 'redline' | 'nitro' | 'ascend' | 'singularity';
export type FoodId = 'kebab' | 'tacos' | 'burger' | 'ramen' | 'vegan';
export type ConsumableId = DrinkId | FoodId;

export interface ConsumableDefinition {
  id: ConsumableId;
  category: ConsumableCategory;
  /** Prix en gemmes. */
  price: number;
  /** Facteur appliqué à la production et au clic tant qu'il est actif. */
  multiplier: number;
  /** Durée d'effet, en secondes. */
  duration: number;
  /** Teintes de la canette, ou de l'assiette et de son contenu. */
  color: number;
  accent: number;
  /** Aura à dépenser dans l'arbre pour que l'article apparaisse en rayon. */
  unlockPrice: number;
}

export const CONSUMABLES: readonly ConsumableDefinition[] = [
  { id: 'espresso', category: 'drink', price: 5, multiplier: 1.5, duration: 120, color: 0x6b4a32, accent: 0xd8c9a8, unlockPrice: 50000 },
  { id: 'monster', category: 'drink', price: 15, multiplier: 2, duration: 300, color: 0x1f2420, accent: 0x7ed957, unlockPrice: 2e6 },
  { id: 'redline', category: 'drink', price: 40, multiplier: 3, duration: 600, color: 0xc4352f, accent: 0xf0e4d0, unlockPrice: 8e7 },
  { id: 'nitro', category: 'drink', price: 120, multiplier: 5, duration: 900, color: 0x2b3a6b, accent: 0x5fd4ff, unlockPrice: 3e9 },
  { id: 'ascend', category: 'drink', price: 350, multiplier: 10, duration: 900, color: 0x4a2b6b, accent: 0xb98bff, unlockPrice: 1e11 },
  { id: 'singularity', category: 'drink', price: 900, multiplier: 20, duration: 900, color: 0x1a1520, accent: 0xe8b84b, unlockPrice: 4e12 },

  // Les plats : plus doux que les canettes, mais bien plus longs. Ils se
  // prennent **en plus** d'une canette, jamais à sa place.
  { id: 'kebab', category: 'food', price: 8, multiplier: 1.3, duration: 1200, color: 0xd9b27c, accent: 0x8a4b2a, unlockPrice: 3e5 },
  { id: 'tacos', category: 'food', price: 25, multiplier: 1.6, duration: 1800, color: 0xe3c07a, accent: 0xc9542f, unlockPrice: 3e7 },
  { id: 'burger', category: 'food', price: 70, multiplier: 2, duration: 1800, color: 0xc98a3e, accent: 0x5a3320, unlockPrice: 2e9 },
  { id: 'ramen', category: 'food', price: 200, multiplier: 3, duration: 2700, color: 0xe8d9b0, accent: 0xb5412f, unlockPrice: 8e10 },
  // Le plat végan ferme la carte : le plus cher, le plus long, le meilleur.
  { id: 'vegan', category: 'food', price: 500, multiplier: 4, duration: 3600, color: 0x6fae4f, accent: 0xe08a3c, unlockPrice: 3e12 }
];

export const DRINKS = CONSUMABLES.filter(consumable => consumable.category === 'drink');
export const FOODS = CONSUMABLES.filter(consumable => consumable.category === 'food');

export function consumableDefinition(id: ConsumableId): ConsumableDefinition {
  return CONSUMABLES.find(consumable => consumable.id === id)!;
}
